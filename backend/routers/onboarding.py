from fastapi import APIRouter, Depends, HTTPException, status
import uuid
from datetime import datetime
from sqlmodel import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_session
from models.site import Site
from models.user import User
from models.enums import UserRole, UserStatus
from schemas.system_admin import TenantCreate, SubdomainCheck
from middleware.auth import get_password_hash

router = APIRouter()

RESERVED_SUBDOMAINS = {
    "admin", "api", "system", "auth", "support", "billing", "cloud", "dev", 
    "staging", "prod", "mail", "ftp", "ssh", "static", "assets", "www"
}

@router.post("/check-subdomain", response_model=SubdomainCheck)
async def check_subdomain_availability(
    check_in: SubdomainCheck,
    session: AsyncSession = Depends(get_session)
):
    """Check if a subdomain is available for registration"""
    subdomain = check_in.subdomain.lower().strip()
    
    # Check reserved list
    if subdomain in RESERVED_SUBDOMAINS:
        return SubdomainCheck(
            subdomain=subdomain,
            available=False,
            message="This subdomain is reserved for system use."
        )
    
    # Check database
    query = select(Site).where(Site.subdomain == subdomain)
    result = await session.exec(query)
    if result.first():
        return SubdomainCheck(
            subdomain=subdomain,
            available=False,
            message="This subdomain is already taken."
        )
    
    return SubdomainCheck(
        subdomain=subdomain,
        available=True,
        message="Subdomain is available!"
    )

@router.post("/register-tenant", status_code=status.HTTP_201_CREATED)
async def register_new_tenant(
    tenant_in: TenantCreate,
    session: AsyncSession = Depends(get_session)
):
    """
    Public registration flow for new tenants (SaaS).
    Creates a Site and an Admin User in one transaction.
    """
    subdomain = tenant_in.subdomain.lower().strip()
    
    # 1. Validation
    if subdomain in RESERVED_SUBDOMAINS:
        raise HTTPException(status_code=400, detail="Reserved subdomain")
        
    query = select(Site).where(Site.subdomain == subdomain)
    if (await session.exec(query)).first():
        raise HTTPException(status_code=400, detail="Subdomain already exists")
        
    user_query = select(User).where(User.email == tenant_in.admin_email)
    if (await session.exec(user_query)).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        import os
        base_domain = os.getenv("BASE_DOMAIN", "dcalms.com")
        new_site = Site(
            id=uuid.uuid4(),
            name=tenant_in.school_name,
            subdomain=subdomain,
            domain=f"{subdomain}.{base_domain}", 
            is_active=True,
            created_at=datetime.utcnow()
        )
        session.add(new_site)
        
        # 3. Create Admin User for this site
        new_admin = User(
            id=uuid.uuid4(),
            site_id=new_site.id,
            email=tenant_in.admin_email,
            hashed_password=get_password_hash(tenant_in.admin_password),
            first_name=tenant_in.admin_first_name,
            last_name=tenant_in.admin_last_name,
            role=UserRole.admin,
            status=UserStatus.active,
            is_verified=True, # Auto-verify trial admins?
            created_at=datetime.utcnow()
        )
        session.add(new_admin)
        
        await session.commit()
        await session.refresh(new_site)
        
        protocol = "http" if base_domain == "dcalms.test" else "https"
        port_suffix = ":3000" if base_domain == "dcalms.test" else ""
        return {
            "success": True,
            "message": "Tenant registered successfully",
            "site": {
                "name": new_site.name,
                "subdomain": new_site.subdomain,
                "domain": new_site.domain
            },
            "login_url": f"{protocol}://{new_site.domain}{port_suffix}/login"
        }
        
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )
