import asyncio
from sqlalchemy import text
from database.session import engine

async def run_migration():
    print("Starting Migration: Fix Enrollment and Course Foreign Keys...")
    
    async with engine.begin() as conn:
        # 1. Fix 'enrollment' table
        print("Fixing 'enrollment' table foreign keys...")
        try:
            # Drop old constraint if it exists
            await conn.execute(text("ALTER TABLE enrollment DROP CONSTRAINT IF EXISTS enrollment_user_id_fkey;"))
            
            # Add new constraint pointing to 'users'
            await conn.execute(text("""
                ALTER TABLE enrollment 
                ADD CONSTRAINT enrollment_user_id_fkey 
                FOREIGN KEY (user_id) REFERENCES users(id);
            """))
            print("  - Re-pointed enrollment(user_id) to users(id)")
        except Exception as e:
            print(f"  - Error fixing 'enrollment': {str(e)}")

        # 2. Fix 'course' table (it might also point to singular 'user')
        print("Checking 'course' table foreign keys...")
        try:
            # Check current FKs for course
            query = """
            SELECT tc.constraint_name 
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name='course' AND kcu.column_name='instructor_id';
            """
            result = await conn.execute(text(query))
            row = result.first()
            if row:
                constraint_name = row[0]
                await conn.execute(text(f"ALTER TABLE course DROP CONSTRAINT IF EXISTS {constraint_name};"))
            
            await conn.execute(text("""
                ALTER TABLE course 
                ADD CONSTRAINT course_instructor_id_fkey 
                FOREIGN KEY (instructor_id) REFERENCES users(id);
            """))
            print("  - Re-pointed course(instructor_id) to users(id)")
        except Exception as e:
            print(f"  - Error fixing 'course': {str(e)}")

        # 3. Clean up empty singular tables if they are duplicates
        # Caution: only if they are empty and plural exists
        tables_to_clean = ['user', 'course', 'category', 'cohort', 'section', 'lesson']
        for table in tables_to_clean:
            try:
                # check if singular table exists and is empty
                check_query = f"SELECT count(*) FROM \"{table}\";"
                result = await conn.execute(text(check_query))
                count = result.scalar()
                
                # Check if plural exists
                plural_table = table + 's'
                # Special cases if needed
                if table == 'category': plural_table = 'categories'
                
                check_plural = f"SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = '{plural_table}');"
                plural_exists = (await conn.execute(text(check_plural))).scalar()
                
                if count == 0 and plural_exists:
                    print(f"  - Found empty singular table '{table}' with plural '{plural_table}' existing. Dropping '{table}'...")
                    await conn.execute(text(f"DROP TABLE \"{table}\" CASCADE;"))
            except Exception as e:
                # Table might not exist or other issue, skip
                pass

    print("Migration completed.")

if __name__ == "__main__":
    import sys
    import os
    sys.path.append(os.getcwd())
    asyncio.run(run_migration())
