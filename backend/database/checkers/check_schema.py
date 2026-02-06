import asyncio
from sqlalchemy import text
from database.session import engine

async def check_schema():
    print("Checking 'users' table schema...")
    async with engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users';
        """))
        columns = result.fetchall()
        print("Columns in 'users' table:")
        found_hashed_password = False
        for col in columns:
            print(f" - {col[0]} ({col[1]})")
            if col[0] == 'hashed_password':
                found_hashed_password = True
        
        if not found_hashed_password:
            print("\nWARNING: 'hashed_password' column is MISSING!")
        else:
            print("\n'hashed_password' column exists.")

if __name__ == "__main__":
    asyncio.run(check_schema())
