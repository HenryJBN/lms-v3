from fastapi import Depends, Request, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession
from database.session import get_session
from models.site import Site
from sqlmodel import select

async def get_current_site(
    request: Request,
    session: AsyncSession = Depends(get_session)
) -> Site:
    """
    Resolve the current site based on the X-Tenant-Domain header or Host header.
    
    Priority:
    1. X-Tenant-Domain (explicitly set by frontend middleware/client)
    2. Host header (fallback for same-domain deployments or localhost)
    
    scenarios:
    - distinct backend: frontend acts as proxy or sends header. 
      Frontend at school.com -> calls api.lms.com with X-Tenant-Domain: school.lms.com
    - same domain: school.lms.com/api -> Host header is school.lms.com
    """
    # 1. Try explicit custom header first (useful for split deployments)
    host = request.headers.get("x-tenant-domain")
    
    # 2. Fallback to Host header
    if not host:
        host = request.headers.get("host", "")
    
    host = host.split(":")[0] # Remove port
    
    # Handle localhost
    if "localhost" in host:
        subdomain = host.split(".")[0]
        if subdomain == "localhost":
             pass
    else:
        # Production: school.lms.com
        parts = host.split(".")
        if len(parts) >= 3:
            subdomain = parts[0]
        else:
            # dcalms.com -> maybe www or root
            subdomain = "www"
            
    # Normalize 'localhost' or 'www' logic if needed
    subdomain = host.split(".")[0]
    
    # Query Site
    query = select(Site).where(Site.subdomain == subdomain)
    result = await session.exec(query)
    site = result.first()
    
    if not site:
        # Fallback: Check custom domain
        query_custom = select(Site).where(Site.custom_domain == host)
        result_custom = await session.exec(query_custom)
        site = result_custom.first()
        
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Site not found for host: {host}"
        )
        
    return site
