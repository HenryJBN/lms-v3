import asyncio
from sqlalchemy import text
from backend.database.session import engine

async def check_db():
    async with engine.connect() as conn:
        # Check tables
        result = await conn.execute(text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';"))
        tables = [row[0] for row in result]
        print(f"Tables: {tables}")
        
        # Check columns of enrollment
        if 'enrollment' in tables:
            print("\nEnrollment columns:")
            result = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'enrollment';"))
            for row in result:
                print(f"  {row[0]}: {row[1]}")
                
            # Check foreign keys for enrollment
            print("\nEnrollment Foreign Keys:")
            query = """
            SELECT
                tc.constraint_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='enrollment';
            """
            result = await conn.execute(text(query))
            for row in result:
                print(f"  {row.column_name} -> {row.foreign_table_name}.{row.foreign_column_name} ({row.constraint_name})")

        # Check if users table exists
        if 'users' in tables:
            print("\nUsers count:")
            result = await conn.execute(text("SELECT count(*) FROM users;"))
            count = result.scalar()
            print(f"  Total users: {count}")
            
            # Check for the specific user ID if it exists
            user_id = '56cb56a7-0f1f-490b-8c6f-ca09d15a1010'
            result = await conn.execute(text(f"SELECT id, email, site_id FROM users WHERE id = '{user_id}';"))
            user = result.first()
            if user:
                print(f"  User {user_id} found: {user.email}, site_id: {user.site_id}")
            else:
                print(f"  User {user_id} NOT found in 'users' table.")

        # Check if 'user' table exists (singular)
        if 'user' in tables:
            print("\n'user' (singular) table found! Columns:")
            result = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user';"))
            for row in result:
                print(f"  {row[0]}: {row[1]}")
            
            result = await conn.execute(text("SELECT count(*) FROM \"user\";"))
            count = result.scalar()
            print(f"  Total rows in 'user' table: {count}")

if __name__ == "__main__":
    import sys
    import os
    # Add project root to path
    sys.path.append(os.getcwd())
    asyncio.run(check_db())
