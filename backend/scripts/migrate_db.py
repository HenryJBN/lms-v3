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

        try:
            await conn.execute(text("ALTER TABLE course ADD COLUMN IF NOT EXISTS certificate_enabled BOOLEAN DEFAULT TRUE"))
            print("Successfully checked/added course.certificate_enabled")
        except Exception as e:
            print(f"Error adding course.certificate_enabled: {e}")

        # Add assessment fields to lesson table
        try:
            await conn.execute(text("ALTER TABLE lesson ADD COLUMN IF NOT EXISTS has_quiz BOOLEAN DEFAULT FALSE"))
            print("Successfully checked/added lesson.has_quiz")
        except Exception as e:
            print(f"Error adding lesson.has_quiz: {e}")

        try:
            await conn.execute(text("ALTER TABLE lesson ADD COLUMN IF NOT EXISTS has_assignment BOOLEAN DEFAULT FALSE"))
            print("Successfully checked/added lesson.has_assignment")
        except Exception as e:
            print(f"Error adding lesson.has_assignment: {e}")

        try:
            await conn.execute(text("ALTER TABLE lesson ADD COLUMN IF NOT EXISTS passing_score INTEGER DEFAULT NULL"))
            print("Successfully checked/added lesson.passing_score")
        except Exception as e:
            print(f"Error adding lesson.passing_score: {e}")

        try:
            await conn.execute(text("ALTER TABLE lesson ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR DEFAULT NULL"))
            print("Successfully checked/added lesson.thumbnail_url")
        except Exception as e:
            print(f"Error adding lesson.thumbnail_url: {e}")

        try:
            await conn.execute(text("ALTER TABLE lesson ADD COLUMN IF NOT EXISTS estimated_duration INTEGER DEFAULT NULL"))
            print("Successfully checked/added lesson.estimated_duration")
        except Exception as e:
            print(f"Error adding lesson.estimated_duration: {e}")

        try:
            await conn.execute(text("ALTER TABLE lesson ADD COLUMN IF NOT EXISTS resources JSONB DEFAULT NULL"))
            print("Successfully checked/added lesson.resources")
        except Exception as e:
            print(f"Error adding lesson.resources: {e}")

        try:
            await conn.execute(text("ALTER TABLE lesson ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT NULL"))
            print("Successfully checked/added lesson.attachments")
        except Exception as e:
            print(f"Error adding lesson.attachments: {e}")

        print("Migration completed.")

if __name__ == "__main__":
    asyncio.run(migrate())
