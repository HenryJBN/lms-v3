import asyncio
import os
import uuid
from sqlmodel import select
from database.session import init_db, get_session
from models.site import Site

async def check_multitenancy():
    print("Initializing Database...")
    await init_db() # Ensure tables exist
    
    owner_id = uuid.uuid4()
    
    print("Creating Test Site...")
    # Manually create a session to test Site insertion
    async for session in get_session():
        # Check if site exists
        query = select(Site).where(Site.subdomain == "test-school")
        result = await session.exec(query)
        existing = result.first()
        
        if existing:
            print(f"Site 'test-school' already exists: ID={existing.id}")
            site_id = existing.id
        else:
            new_site = Site(
                name="Test School",
                subdomain="test-school",
                owner_id=owner_id
            )
            session.add(new_site)
            await session.commit()
            await session.refresh(new_site)
            print(f"Created new site: {new_site.name} (ID: {new_site.id})")
            site_id = new_site.id
            
        # Verify fetch
        fetched = await session.get(Site, site_id)
        if fetched and fetched.subdomain == "test-school":
             print("SUCCESS: Site verification passed.")
        else:
             print("FAILURE: Could not verify created site.")
             
        break # One session usage

if __name__ == "__main__":
    asyncio.run(check_multitenancy())
