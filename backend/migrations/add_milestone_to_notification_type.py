import asyncio
from sqlalchemy import text
from database.session import engine

async def run_migration():
    print("Starting Migration: Adding 'milestone' to notificationtype enum...")
    
    async with engine.begin() as conn:
        try:
            # PostgreSQL command to add a value to an existing enum type
            # Note: ADD VALUE cannot be executed inside a transaction block in some PG versions,
            # but SQLAlchemy's engine.begin() might work or we might need to handle it specifically.
            # Using 'COMMIT' to ensure it's not in a nested transaction if needed, 
            # but try direct execution first.
            await conn.execute(text("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'milestone';"))
            print("  - Successfully added 'milestone' to 'notificationtype' enum")
        except Exception as e:
            # If it already exists, it might throw an error if ADD VALUE IF NOT EXISTS is not supported (PG < 12)
            # or if it's already there and we try to add it.
            print(f"  - Note/Error adding 'milestone': {str(e)}")

    print("Migration completed.")

if __name__ == "__main__":
    asyncio.run(run_migration())
