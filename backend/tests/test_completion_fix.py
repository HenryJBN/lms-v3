
import asyncio
import os
import sys
import uuid
import requests
from sqlmodel import select
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession
from datetime import datetime

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/..")

from models.user import User, UserRole
from models.course import Course, Section
from models.site import Site
from models.lesson import Lesson
from models.enrollment import Enrollment, LessonProgress
from models.enums import CompletionStatus, EnrollmentStatus
from middleware.auth import get_password_hash

BASE_URL = "http://localhost:8000"

async def main():
    print("Starting verification of completion and reward fixes...")
    
    # Setup DB connection
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:1234@localhost:5432/lms_database")
    # Try alternate if standard fails (based on .env)
    if "your_username" in DATABASE_URL:
        DATABASE_URL = "postgresql+asyncpg://postgres:1234@localhost:5432/lms_database"
        
    engine = create_async_engine(DATABASE_URL, echo=False, future=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Get active site - try to get one that works with localhost easily
        site_result = await session.exec(select(Site).where(Site.subdomain == "facebook")) # Match what I saw in logs or just first
        site = site_result.first()
        if not site:
            site_result = await session.exec(select(Site))
            site = site_result.first()
            
        if not site:
            print("No site found.")
            return

        print(f"Using Site: {site.subdomain} (ID: {site.id})")

        # Get or create test student
        student_email = f"student_{uuid.uuid4().hex[:6]}@test.com"
        student_pass = "student123"
        hashed_pass = get_password_hash(student_pass)
        
        student = User(
            email=student_email,
            username=f"student_{uuid.uuid4().hex[:6]}",
            password_hash=hashed_pass,
            first_name="Test",
            last_name="Student",
            role=UserRole.student,
            site_id=site.id,
            status="active",
            email_verified=True
        )
        session.add(student)
        await session.commit()
        await session.refresh(student)
        print(f"Created student: {student_email}")

        # Get or create instructor
        inst_email = f"inst_{uuid.uuid4().hex[:6]}@test.com"
        inst_pass = "inst123"
        hashed_inst_pass = get_password_hash(inst_pass)
        instructor = User(
            email=inst_email,
            username=f"inst_{uuid.uuid4().hex[:6]}",
            password_hash=hashed_inst_pass,
            first_name="Test",
            last_name="Instructor",
            role=UserRole.instructor,
            site_id=site.id,
            status="active"
        )
        session.add(instructor)
        await session.commit()
        await session.refresh(instructor)

        # Create Course with reward
        course = Course(
            title=f"Reward Fix Course {uuid.uuid4().hex[:6]}",
            slug=f"reward-fix-{uuid.uuid4().hex[:6]}",
            instructor_id=instructor.id,
            site_id=site.id,
            token_reward=75,
            is_published=True,
            status="published",
            certificate_enabled=True
        )
        session.add(course)
        await session.commit()
        await session.refresh(course)
        print(f"Created course: {course.slug} with reward 75")

        # Create 2 lessons
        l1 = Lesson(title="Lesson 1", slug=f"l1-{uuid.uuid4().hex[:4]}", course_id=course.id, site_id=site.id, type="video", is_published=True)
        l2 = Lesson(title="Lesson 2", slug=f"l2-{uuid.uuid4().hex[:4]}", course_id=course.id, site_id=site.id, type="video", is_published=True)
        session.add(l1)
        session.add(l2)
        await session.commit()
        await session.refresh(l1)
        await session.refresh(l2)

        # Login student to get token
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": student_email, "password": student_pass}, headers={"X-Tenant-Domain": site.subdomain})
        if login_resp.status_code != 200:
            print(f"Login failed: {login_resp.text}")
            return
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}", "X-Tenant-Domain": site.subdomain}
        print(f"Headers used: {headers}")

        # Enroll
        requests.post(f"{BASE_URL}/api/enrollments", json={"course_id": str(course.id)}, headers=headers)
        print("Enrolled student")

        # Initial Balance
        bal_resp = requests.get(f"{BASE_URL}/api/users/me/tokens", headers=headers)
        start_bal = bal_resp.json().get('balance', 0)
        print(f"Start balance: {start_bal}")

        # 1. Complete Lesson 1 (85%) -> Should be 'completed'
        print("Completing Lesson 1 at 85%...")
        requests.put(f"{BASE_URL}/api/progress/lesson/{l1.id}", json={"progress_percentage": 85}, headers=headers)
        
        # 2. Complete Lesson 2 (100%)
        print("Completing Lesson 2 at 100%...")
        requests.put(f"{BASE_URL}/api/progress/lesson/{l2.id}", json={"progress_percentage": 100}, headers=headers)

        # Check Course Progress
        prog_resp = requests.get(f"{BASE_URL}/api/enrollments/progress/slug/{course.slug}", headers=headers)
        prog_data = prog_resp.json()
        print(f"Course progress response: {prog_data}")

        # Check Final Balance
        bal_resp = requests.get(f"{BASE_URL}/api/users/me/tokens", headers=headers)
        end_bal = bal_resp.json().get('balance', 0)
        print(f"End balance: {end_bal}")

        diff = end_bal - start_bal
        print(f"Total tokens earned: {diff}")
        
        # Expectations:
        # Lesson rewards: 2 * 10 = 20 (assuming default 10)
        # Course completion: 75
        # Total: 95
        
        success = True
        if prog_data.get('progress_percentage') != 100:
            print("FAILURE: Course progress is not 100%")
            success = False
        if diff < 95:
            print(f"FAILURE: Earned {diff} tokens, expected 95")
            success = False
            
        if success:
            print("\nSUCCESS: All fixes verified!")
        else:
            print("\nVERIFICATION FAILED")

if __name__ == "__main__":
    asyncio.run(main())
