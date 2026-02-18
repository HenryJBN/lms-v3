import asyncio
import os
import sys
import uuid
from sqlmodel import select
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.user import User, UserRole
from models.course import Course, Section
from models.site import Site
from models.lesson import Lesson
from routers.lessons import create_lesson, update_lesson
from schemas.lesson import LessonCreate, LessonUpdate

# Mock dependencies
from fastapi import HTTPException

async def verify():
    # Setup DB connection
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://henry:Greaterworks!@localhost:5432/lms_db")
    engine = create_async_engine(DATABASE_URL, echo=False, future=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        print("Connected to DB.")
        
        # 1. Get a Site
        site_result = await session.exec(select(Site))
        site = site_result.first()
        if not site:
            print("No site found. Creating one.")
            site = Site(name="Test Site", domain="test.localhost", is_active=True)
            session.add(site)
            await session.commit()
            await session.refresh(site)
        print(f"Using Site: {site.id}")

        # 2. Get/Create Admin User
        user_result = await session.exec(select(User).where((User.email == "admin@example.com") | (User.username == "admin")))
        user = user_result.first()
        if not user:
            print("Creating admin user.")
            user = User(
                email="admin@example.com", 
                username="admin",
                password_hash="hashed_password", 
                first_name="Admin", 
                last_name="User", 
                role=UserRole.admin,
                site_id=site.id
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
        print(f"Using User: {user.id}")

        # 3. Create Course 1
        course1 = Course(
            title=f"Test Course 1 {uuid.uuid4()}", 
            slug=f"test-course-1-{uuid.uuid4()}",
            instructor_id=user.id,
            site_id=site.id,
            is_published=True
        )
        session.add(course1)
        await session.commit()
        await session.refresh(course1)
        print(f"Created Course 1: {course1.id}")

        # 4. Create Section A for Course 1
        sectionA = Section(
            title="Section A",
            course_id=course1.id,
            site_id=site.id,
            sort_order=1
        )
        session.add(sectionA)
        await session.commit()
        await session.refresh(sectionA)
        print(f"Created Section A: {sectionA.id}")

        # 5. Create Course 2
        course2 = Course(
            title=f"Test Course 2 {uuid.uuid4()}", 
            slug=f"test-course-2-{uuid.uuid4()}",
            instructor_id=user.id,
            site_id=site.id,
            is_published=True
        )
        session.add(course2)
        await session.commit()
        await session.refresh(course2)
        print(f"Created Course 2: {course2.id}")

        # 6. Create Section B for Course 2
        sectionB = Section(
            title="Section B",
            course_id=course2.id,
            site_id=site.id,
            sort_order=1
        )
        session.add(sectionB)
        await session.commit()
        await session.refresh(sectionB)
        print(f"Created Section B: {sectionB.id}")

        # TEST CASE 1: Create Lesson in Course 1 with Section A (Valid)
        print("\nTest Case 1: Valid Section")
        try:
            lesson_in = LessonCreate(
                title="Lesson 1",
                slug=f"lesson-1-{uuid.uuid4()}",
                course_id=course1.id,
                section_id=sectionA.id,
                type="video"
            )
            created_lesson = await create_lesson(lesson_in, current_user=user, session=session, current_site=site)
            print("SUCCESS: Created lesson with valid section.")
        except Exception as e:
            print(f"FAILURE: Failed to create lesson with valid section: {e}")

        # TEST CASE 2: Create Lesson in Course 1 with Section B (Invalid - wrong course)
        print("\nTest Case 2: Invalid Section (Wrong Course)")
        try:
            lesson_in = LessonCreate(
                title="Lesson 2",
                slug=f"lesson-2-{uuid.uuid4()}",
                course_id=course1.id,
                section_id=sectionB.id, # Belongs to Course 2
                type="video"
            )
            await create_lesson(lesson_in, current_user=user, session=session, current_site=site)
            print("FAILURE: Created lesson with INVALID section (Should have failed).")
        except HTTPException as e:
            if e.status_code == 400 and "Invalid section ID" in e.detail:
                print(f"SUCCESS: Caught expected validation error: {e.detail}")
            else:
                print(f"FAILURE: Caught unexpected HTTPException: {e}")
        except Exception as e:
            print(f"FAILURE: Caught unexpected exception: {e}")

        # TEST CASE 3: Create Lesson in Course 1 with None Section (Valid)
        print("\nTest Case 3: None Section")
        try:
            lesson_in = LessonCreate(
                title="Lesson 3",
                slug=f"lesson-3-{uuid.uuid4()}",
                course_id=course1.id,
                section_id=None,
                type="video"
            )
            await create_lesson(lesson_in, current_user=user, session=session, current_site=site)
            print("SUCCESS: Created lesson with None section.")
        except Exception as e:
            print(f"FAILURE: Failed to create lesson with None section: {e}")

        # TEST CASE 4: Update Lesson to valid section
        print("\nTest Case 4: Update Lesson to Valid Section")
        try:
            lesson_to_update = created_lesson
            update_data = LessonUpdate(
                course_id=course1.id, # Schema requires course_id
                section_id=sectionA.id
            )
            await update_lesson(lesson_to_update.id, update_data, current_user=user, session=session, current_site=site)
            print("SUCCESS: Updated lesson to valid section.")
        except Exception as e:
            print(f"FAILURE: Failed to update lesson to valid section: {e}")

        # TEST CASE 5: Update Lesson to invalid section
        print("\nTest Case 5: Update Lesson to Invalid Section")
        try:
            lesson_to_update = created_lesson
            update_data = LessonUpdate(
                course_id=course1.id,
                section_id=sectionB.id # Wrong course
            )
            await update_lesson(lesson_to_update.id, update_data, current_user=user, session=session, current_site=site)
            print("FAILURE: Updated lesson to INVALID section (Should have failed).")
        except HTTPException as e:
            if e.status_code == 400 and "Invalid section ID" in e.detail:
                print(f"SUCCESS: Caught expected validation error: {e.detail}")
            else:
                print(f"FAILURE: Caught unexpected HTTPException: {e}")
        except Exception as e:
            print(f"FAILURE: Caught unexpected exception: {e}")

if __name__ == "__main__":
    asyncio.run(verify())
