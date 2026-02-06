import asyncio
from sqlalchemy import text
from database.session import engine
from sqlmodel import SQLModel
import models # Ensure all models are imported for SQLModel metadata

async def run_migration():
    print("Running migration...")
    async with engine.begin() as conn:
        # 1. Create all missing tables (like 'sites')
        print("Ensuring all tables exist...")
        await conn.run_sync(SQLModel.metadata.create_all)
        
        # 2. Add site_id to users table if it doesn't exist
        print("Checking 'users' table for 'site_id'...")
        await conn.execute(text("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES site(id);
        """))
        print("Migrated 'users' table: added 'site_id'")
        
        # 3. Add default site if none exists (optional but helpful)
        # result = await conn.execute(text("SELECT COUNT(*) FROM sites"))
        # count = result.scalar()
        # if count == 0:
        #    ... (create default admin site) ...
        
    print("Migration completed successfully.")

if __name__ == "__main__":
    asyncio.run(run_migration())
