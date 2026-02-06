import asyncio
from sqlalchemy import text
from database.session import engine

async def check_enum_type():
    print("Checking 'role' column type in 'users' table...")
    async with engine.begin() as conn:
        # Check column definition
        result = await conn.execute(text("""
            SELECT data_type, udt_name
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'role';
        """))
        row = result.first()
        if row:
            print(f"Column 'role': data_type='{row[0]}', udt_name='{row[1]}'")
        else:
            print("Column 'role' not found!")
            
        # List all enum types
        print("\nListing all enum types in database:")
        result = await conn.execute(text("""
            SELECT t.typname, e.enumlabel
            FROM pg_type t 
            JOIN pg_enum e ON t.oid = e.enumtypid
            ORDER BY t.typname, e.enumsortorder;
        """))
        current_type = None
        for row in result:
            if row[0] != current_type:
                print(f"\nType: {row[0]}")
                current_type = row[0]
            print(f"  - {row[1]}")

if __name__ == "__main__":
    asyncio.run(check_enum_type())
