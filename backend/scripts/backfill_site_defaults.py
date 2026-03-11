import asyncio
import os
from sqlmodel import select
from database.session import async_session_factory
from models.site import Site, DEFAULT_THEME_CONFIG

async def backfill_site_defaults():
    print("--- Starting Site Configuration Backfill ---")
    
    async with async_session_factory() as session:
        result = await session.exec(select(Site))
        sites = result.all()
        
        updated_count = 0
        for site in sites:
            print(f"Checking site: {site.subdomain} (ID: {site.id})")
            
            # Ensure theme_config is a dict
            config = dict(site.theme_config) if site.theme_config else {}
            original_config = config.copy()
            
            # Merge missing defaults
            changed = False
            for key, default_value in DEFAULT_THEME_CONFIG.items():
                if key not in config:
                    config[key] = default_value
                    changed = True
                    print(f"  + Adding default: {key} = {default_value}")
            
            if changed:
                site.theme_config = config
                session.add(site)
                updated_count += 1
                print(f"  ✅ Updated configuration for {site.subdomain}")
            else:
                print(f"  - No changes needed for {site.subdomain}")
        
        if updated_count > 0:
            await session.commit()
            print(f"\nSuccessfully updated {updated_count} sites.")
        else:
            print("\nNo sites required updates.")

if __name__ == "__main__":
    # Ensure current directory is in PYTHONPATH
    import sys
    sys.path.append(os.getcwd())
    asyncio.run(backfill_site_defaults())
