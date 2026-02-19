import asyncio
import uuid
import sys
from sqlmodel import select, text
from database.session import get_session
from models.user import User
from models.enrollment import Enrollment
from models.enrollment import LessonProgress
from models.lesson import QuizAttempt

async def reset_user_data(email: str):
    async for session in get_session():
        # Find user
        user_query = select(User).where(User.email == email)
        user_result = await session.exec(user_query)
        user = user_result.first()
        
        if not user:
            print(f"User with email {email} not found.")
            return

        user_id = user.id
        print(f"Resetting data for user: {email} ({user_id})")

        # Delete Quiz Attempts
        await session.execute(text("DELETE FROM quiz_attempts WHERE user_id = :uid"), {"uid": user_id})
        
        # Delete Lesson Progress
        await session.execute(text("DELETE FROM lesson_progress WHERE user_id = :uid"), {"uid": user_id})
        
        # Delete Enrollments
        await session.execute(text("DELETE FROM enrollment WHERE user_id = :uid"), {"uid": user_id})
        
        # Reset Cohort counts (This is messy if multiple users, but for testing we can just recount)
        await session.execute(text("""
            UPDATE cohort c
            SET total_students = (
                SELECT count(*) 
                FROM enrollment e 
                WHERE e.cohort_id = c.id AND e.status = 'active'
            )
        """))

        # Reset Course counts
        await session.execute(text("""
            UPDATE course c
            SET total_students = (
                SELECT count(*) 
                FROM enrollment e 
                WHERE e.course_id = c.id AND e.status = 'active'
            )
        """))

        await session.commit()
        print("Done.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python reset_enrollment.py <email>")
    else:
        asyncio.run(reset_user_data(sys.argv[1]))
