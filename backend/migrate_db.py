import asyncio
from sqlalchemy import text
from database.session import engine

async def migrate():
    async with engine.begin() as conn:
        print("Starting manual migration...")
        
        # Add columns to cohort table
        try:
            await conn.execute(text("ALTER TABLE cohort ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
            print("Successfully checked/added cohort.created_at")
        except Exception as e:
            print(f"Error adding cohort.created_at: {e}")

        try:
            await conn.execute(text("ALTER TABLE cohort ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
            print("Successfully checked/added cohort.updated_at")
        except Exception as e:
            print(f"Error adding cohort.updated_at: {e}")

        # Add language to course table
        try:
            await conn.execute(text("ALTER TABLE course ADD COLUMN IF NOT EXISTS language VARCHAR DEFAULT 'en'"))
            print("Successfully checked/added course.language")
        except Exception as e:
            print(f"Error adding course.language: {e}")

        # Add requirements, learning_outcomes, target_audience, tags
        new_json_fields = ["requirements", "learning_outcomes", "tags"]
        for field in new_json_fields:
            try:
                await conn.execute(text(f"ALTER TABLE course ADD COLUMN IF NOT EXISTS {field} JSONB DEFAULT '[]'"))
                print(f"Successfully checked/added course.{field}")
            except Exception as e:
                print(f"Error adding course.{field}: {e}")
                
        try:
            await conn.execute(text("ALTER TABLE course ADD COLUMN IF NOT EXISTS target_audience VARCHAR DEFAULT NULL"))
            print("Successfully checked/added course.target_audience")
        except Exception as e:
            print(f"Error adding course.target_audience: {e}")

        print("Migration completed.")

if __name__ == "__main__":
    asyncio.run(migrate())
