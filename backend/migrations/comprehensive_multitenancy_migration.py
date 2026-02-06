import asyncio
import uuid
from sqlalchemy import text
from database.session import engine
from sqlmodel import SQLModel
import models # Ensure all models are imported for SQLModel metadata

async def run_migration():
    print("Starting Comprehensive Multi-tenancy Migration...")
    
    tables_to_migrate = [
        "users",
        "course",
        "category",
        "cohort",
        "lesson",
        "quiz",
        "quizquestion",
        "quizattempt",
        "assignment",
        "assignmentsubmission",
        "enrollment",
        "lesson_progress",
        "section",
        "revenue_records",
        "token_balances",
        "token_transactions",
        "admin_audit_log",
        "certificate",
        "course_reviews",
        "notification",
        "notification_settings"
    ]

    async with engine.begin() as conn:
        # 1. Ensure 'site' table exists first
        print("Ensuring 'site' table exists...")
        await conn.run_sync(SQLModel.metadata.create_all)
        
        # 2. Add site_id to all relevant tables
        for table in tables_to_migrate:
            print(f"Checking '{table}' table for 'site_id'...")
            try:
                await conn.execute(text(f"""
                    ALTER TABLE {table} ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES site(id);
                """))
                print(f"  - Migrated '{table}': added 'site_id'")
                
                # Create index for site_id if it doesn't exist
                # Note: PostgreSQL IF NOT EXISTS for index requires a different syntax or manual check
                # For simplicity in this script, we'll try/except the index creation
                await conn.execute(text(f"CREATE INDEX IF NOT EXISTS idx_{table}_site_id ON {table} (site_id);"))
                print(f"  - Created index on {table}(site_id)")
                
            except Exception as e:
                print(f"  - Error migrating '{table}': {str(e)}")

        # 3. Handle data consistency (optional: assign existing data to a default site if any)
        # result = await conn.execute(text("SELECT id FROM site LIMIT 1"))
        # default_site_id = result.scalar()
        # if default_site_id:
        #     for table in tables_to_migrate:
        #         await conn.execute(text(f"UPDATE {table} SET site_id = :sid WHERE site_id IS NULL"), {"sid": default_site_id})
        #         print(f"  - Updated NULL site_id in '{table}' to default site {default_site_id}")

    print("Migration completed successfully.")

if __name__ == "__main__":
    asyncio.run(run_migration())
