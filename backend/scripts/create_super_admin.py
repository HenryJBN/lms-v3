import asyncio
import argparse
import uuid
import os
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

# Add backend directory to path if needed for local execution
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.session import async_session_factory, init_db
from models.site import Site, get_default_theme_config
from models.user import User
from models.enums import UserRole, UserStatus
from middleware.auth import get_password_hash

async def create_super_admin(email, password, first_name, last_name):
    """Create a super admin user and ensure the admin site exists."""
    # Ensure tables are created (using INIT_DB=1 logic)
    os.environ["INIT_DB"] = "1"
    await init_db()
    
    async with async_session_factory() as session:
        # 1. Ensure the 'admin' site exists
        result = await session.exec(select(Site).where(Site.subdomain == "admin"))
        admin_site = result.first()
        
        if not admin_site:
            print("Creating 'admin' site...")
            admin_site = Site(
                subdomain="admin",
                name="System Administration",
                owner_id=uuid.uuid4(),  # System-owned
                is_active=True,
                theme_config=get_default_theme_config()
            )
            session.add(admin_site)
            await session.commit()
            await session.refresh(admin_site)
            print(f"✅ Admin site created with ID: {admin_site.id}")
        else:
            print(f"ℹ️  Admin site already exists (ID: {admin_site.id})")

        # 2. Check if user already exists
        result = await session.exec(
            select(User).where(User.email == email, User.site_id == admin_site.id)
        )
        existing_user = result.first()
        
        if existing_user:
            print(f"⚠️  User {email} already exists on admin site. Updating password...")
            existing_user.password_hash = get_password_hash(password)
            existing_user.role = UserRole.admin
            existing_user.status = UserStatus.active
            existing_user.email_verified = True
            session.add(existing_user)
            await session.commit()
            print(f"✅ Password updated for {email}")
        else:
            print(f"Creating super admin user: {email}...")
            new_user = User(
                email=email,
                username=email.split("@")[0],
                password_hash=get_password_hash(password),
                first_name=first_name,
                last_name=last_name,
                role=UserRole.admin,
                status=UserStatus.active,
                site_id=admin_site.id,
                email_verified=True
            )
            session.add(new_user)
            await session.commit()
            print(f"✅ Super admin user created successfully!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a super admin user for the LMS platform.")
    parser.add_argument("--email", required=True, help="Email for the super admin")
    parser.add_argument("--password", required=True, help="Password for the super admin")
    parser.add_argument("--first-name", default="System", help="First name")
    parser.add_argument("--last-name", default="Admin", help="Last name")
    
    args = parser.parse_args()
    
    asyncio.run(create_super_admin(
        args.email, 
        args.password, 
        args.first_name, 
        args.last_name
    ))
