import asyncio
from sqlalchemy import text
from database.session import engine

async def migrate():
    async with engine.begin() as conn:
        print("Starting targeted quiz schema migration...")
        
        # 1. Fix quiz_questions
        print("Adding site_id to 'quiz_questions'...")
        try:
            await conn.execute(text("ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES site(id);"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_quiz_questions_site_id ON quiz_questions (site_id);"))
            
            # Populate site_id from parent quiz
            await conn.execute(text("""
                UPDATE quiz_questions 
                SET site_id = quiz.site_id 
                FROM quiz 
                WHERE quiz_questions.quiz_id = quiz.id AND quiz_questions.site_id IS NULL
            """))
            print("  - Successfully migrated 'quiz_questions'")
        except Exception as e:
            print(f"  - Error migrating 'quiz_questions': {e}")

        # 2. Fix quiz_attempts
        print("Adding site_id to 'quiz_attempts'...")
        try:
            await conn.execute(text("ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES site(id);"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_quiz_attempts_site_id ON quiz_attempts (site_id);"))
            
            # Populate site_id from parent quiz
            await conn.execute(text("""
                UPDATE quiz_attempts 
                SET site_id = quiz.site_id 
                FROM quiz 
                WHERE quiz_attempts.quiz_id = quiz.id AND quiz_attempts.site_id IS NULL
            """))
            print("  - Successfully migrated 'quiz_attempts'")
        except Exception as e:
            print(f"  - Error migrating 'quiz_attempts': {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
