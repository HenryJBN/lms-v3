import asyncio
import uuid
from sqlmodel import select
from database.session import async_session_factory
from models.site import Site, DEFAULT_THEME_CONFIG

async def verify_new_site_defaults():
    print("--- Verifying Automatic Defaults for New Sites ---")
    
    async with async_session_factory() as session:
        site_id = uuid.uuid4()
        subdomain = f"test-auto-{uuid.uuid4().hex[:6]}"
        
        # NOTE: We are NOT passing theme_config here. It should be populated by default_factory.
        new_site = Site(
            id=site_id,
            name="Test Auto Defaults",
            subdomain=subdomain,
            owner_id=uuid.uuid4()
        )
        session.add(new_site)
        await session.commit()
        await session.refresh(new_site)
        
        print(f"Created site: {subdomain}")
        
        # Verify theme_config
        config = new_site.theme_config
        errors = []
        
        for key, expected_value in DEFAULT_THEME_CONFIG.items():
            if key not in config:
                errors.append(f"Missing key: {key}")
            elif config[key] != expected_value:
                errors.append(f"Value mismatch for {key}: expected {expected_value}, got {config[key]}")
        
        if not errors:
            print("✅ New site automatically received all default settings!")
        else:
            print("❌ Automatic defaults failed:")
            for err in errors:
                print(f"  - {err}")
        
        # Cleanup
        await session.delete(new_site)
        await session.commit()
        print(f"Cleaned up test site: {subdomain}")

if __name__ == "__main__":
    import os
    import sys
    sys.path.append(os.path.join(os.getcwd(), 'backend'))
    asyncio.run(verify_new_site_defaults())
