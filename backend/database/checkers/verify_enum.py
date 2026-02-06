import asyncio
import uuid
from database.session import engine
from models.user import User
from models.enums import UserRole, UserStatus
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker

async def verify_enum():
    print("Verifying User Enum persistence...")
    
    # Create async session factory
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        try:
            # Create a test user with enum fields
            new_id = uuid.uuid4()
            test_email = f"enum_test_{new_id}@example.com"
            print(f"Creating user {test_email}...")
            
            user = User(
                id=new_id,
                email=test_email,
                username=test_email,
                password_hash="dummyhash",
                first_name="Enum",
                last_name="Test",
                role=UserRole.admin,
                status=UserStatus.active,
                site_id=uuid.uuid4() # Dummy, might fail constraint if site doesn't exist?
                                     # Actually, site_id nullable or FK? 
                                     # FK... let's check if we need to mock site first.
                                     # We will rely on error message if FK fails, 
                                     # but enum cast happens before that usually in bind.
                                     # To be safe, let's try to just select first site and use it.
            )
            
            # Since FK constraint might block us, and multi-tenant setup is active...
            # We can try to select an existing site first.
            from models.site import Site
            site_res = await session.exec(select(Site))
            site = site_res.first()
            if site:
                user.site_id = site.id
                print(f"Using site {site.id}")
            else:
                print("No site found, creating a dummy one might be needed but let's see if we can insert user first.")
                # We can try creating a site if needed, but let's try insert.
            
            session.add(user)
            await session.commit()
            print("User inserted successfully!")
            
            await session.refresh(user)
            print(f"Retrieved Role: {user.role} (Type: {type(user.role)})")
            
            # Cleanup
            await session.delete(user)
            await session.commit()
            print("Cleanup done.")
            
        except Exception as e:
            print(f"FAILED: {e}")
            # import traceback
            # traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify_enum())
