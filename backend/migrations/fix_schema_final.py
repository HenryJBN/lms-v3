import asyncio
import uuid
from sqlalchemy import text
from database.session import engine
from datetime import datetime

async def run_migration():
    print("Starting Schema Fix Migration...")
    
    async with engine.begin() as conn:
        # 1. Fix 'site' table
        print("Fixing 'site' table...")
        try:
            await conn.execute(text("ALTER TABLE site ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;"))
            await conn.execute(text("ALTER TABLE site ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;"))
            await conn.execute(text("ALTER TABLE site ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;"))
            print("  - Added is_active, created_at, updated_at to 'site'")
        except Exception as e:
            print(f"  - Error fixing 'site': {str(e)}")

        # 2. Fix 'enrollment' table
        print("Fixing 'enrollment' table...")
        try:
            await conn.execute(text("ALTER TABLE enrollment ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;"))
            await conn.execute(text("ALTER TABLE enrollment ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;"))
            print("  - Added created_at, updated_at to 'enrollment'")
        except Exception as e:
            print(f"  - Error fixing 'enrollment': {str(e)}")
            
        # 3. Handle existing data timestamps (optional, but good for demo)
        # If we want some data to show up in 'last 30 days', we can update some timestamps
        # But let's leave them as default (now) for now.

    print("Migration completed successfully.")

if __name__ == "__main__":
    asyncio.run(run_migration())
