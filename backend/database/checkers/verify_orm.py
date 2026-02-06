import asyncio
from database.session import engine
from models.user import User
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker

async def verify_orm():
    print("Verifying ORM mapping for User model...")
    
    # Create async session factory
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        # Try to query a user - this forces column mapping check
        try:
            print("Querying users...")
            statement = select(User).limit(1)
            result = await session.exec(statement)
            user = result.first()
            print("User query successful!")
            if user:
                print(f"Found user: {user.email}")
                print(f"Password hash: {user.password_hash[:10]}...")
            else:
                print("No users found, but query executed fine.")
                
        except Exception as e:
            print(f"FAILED: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify_orm())
