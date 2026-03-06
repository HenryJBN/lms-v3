import asyncio
from sqlmodel import SQLModel
from database.session import engine
import models.user  # import to ensure UserSession is registered

async def run_migration():
    print("Creating user_sessions table...")
    async with engine.begin() as conn:
        # Run sync table creations in an async execution context
        await conn.run_sync(SQLModel.metadata.create_all)
    print("Migration completed successfully.")

if __name__ == "__main__":
    asyncio.run(run_migration())
