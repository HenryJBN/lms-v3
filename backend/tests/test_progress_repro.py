
import sys
import os
import asyncio
import uuid
import requests
import string
import random

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from database.session import engine
from sqlmodel import Session, text
# Import from middleware.auth instead of passlib directly
from middleware.auth import get_password_hash

BASE_URL = "http://localhost:8000"
TEST_EMAIL = f"student_{uuid.uuid4()}@test.com"
TEST_PASS = "student123"

async def seed_user():
    user_id = str(uuid.uuid4())
    hashed = get_password_hash(TEST_PASS)
    
    query = text("""
        INSERT INTO users (id, email, username, password_hash, first_name, last_name, role, status, email_verified, email_verified_at)
        VALUES (:id, :email, :username, :password_hash, 'Test', 'Student', 'student', 'active', true, NOW())
    """)
    
    values = {
        "id": user_id,
        "email": TEST_EMAIL,
        "username": f"user_{uuid.uuid4()}",
        "password_hash": hashed
    }
    
    try:
        with Session(engine.sync_engine if hasattr(engine, 'sync_engine') else engine) as session:
            # Wait, engine is async in session.py. I should use sync_engine or just use execute on engine.
            pass
        
        # Actually session.py has sync_engine
        from database.session import sync_engine
        with Session(sync_engine) as session:
            session.execute(query, values)
            session.execute(text("INSERT INTO user_profiles (user_id) VALUES (:user_id)"), {"user_id": user_id})
            session.commit()
            print(f"Seeded user: {TEST_EMAIL}")
    except Exception as e:
        print(f"Seed failed: {e}")

def get_token():
    login_data = {"email": TEST_EMAIL, "password": TEST_PASS}
    response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
    if response.status_code != 200:
        print(f"Login failed: {response.text}")
        return None
    return response.json()["access_token"]

def create_course(token):
    headers = {"Authorization": f"Bearer {token}"}
    course_data = {
        "title": f"Test Course {uuid.uuid4()}",
        "slug": f"test-course-{uuid.uuid4()}",
        "description": "Test Descr",
        "level": "beginner",
        "price": 0,
        "is_published": True,
        "is_free": True
    }
    resp = requests.post(f"{BASE_URL}/api/courses", json=course_data, headers=headers)
    if resp.status_code not in (200, 201):
         print(f"Create course failed: {resp.text}")
         return None
    return resp.json()

async def seed_instructor():
    user_id = str(uuid.uuid4())
    pass_hash = get_password_hash("instructor123")
    email = f"instructor_{uuid.uuid4()}@test.com"
    
    query = text("""
        INSERT INTO users (id, email, username, password_hash, first_name, last_name, role, status, email_verified, email_verified_at)
        VALUES (:id, :email, :username, :password_hash, 'Test', 'Instructor', 'instructor', 'active', true, NOW())
    """)
    values = {
        "id": user_id,
        "email": email,
        "username": f"inst_{uuid.uuid4()}",
        "password_hash": pass_hash
    }
    try:
        from database.session import sync_engine
        with Session(sync_engine) as session:
            session.execute(query, values)
            session.execute(text("INSERT INTO user_profiles (user_id) VALUES (:user_id)"), {"user_id": user_id})
            session.commit()
            print(f"Seeded instructor: {email}")
    except Exception as e:
         print(f"Seed instructor failed: {e}")
         
    return email

def login_user(email, password):
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    return resp.json()["access_token"]

def create_lesson(token, course_id):
    headers = {"Authorization": f"Bearer {token}"}
    section_data = {"title": "Section 1", "course_id": course_id, "sort_order": 0}
    sec_resp = requests.post(f"{BASE_URL}/api/sections", json=section_data, headers=headers)
    if sec_resp.status_code not in (200, 201):
        print(f"Create section failed: {sec_resp.text}")
        return {}
    section_id = sec_resp.json()["id"]

    lesson_data = {
        "title": "Lesson 1",
        "slug": f"lesson-1-{uuid.uuid4()}",
        "content": "Content",
        "section_id": section_id,
        "course_id": course_id,
        "type": "video",
        "is_published": True,
        "sort_order": 0
    }
    les_resp = requests.post(f"{BASE_URL}/api/lessons", json=lesson_data, headers=headers)
    if les_resp.status_code not in (200, 201):
        print(f"Create lesson failed: {les_resp.text}")
        return {}
    return les_resp.json()

def enroll_course(token, course_id):
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.post(f"{BASE_URL}/api/enrollments", json={"course_id": course_id}, headers=headers)
    return resp.json()

def update_lesson_progress(token, lesson_id):
    headers = {"Authorization": f"Bearer {token}"}
    data = {"progress_percentage": 100}
    resp = requests.put(f"{BASE_URL}/api/progress/lesson/{lesson_id}", json=data, headers=headers)
    return resp.json()

def check_enrollment_progress(token, slug):
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/api/enrollments/progress/slug/{slug}", headers=headers)
    if resp.status_code != 200:
        print(f"Error getting progress: {resp.text}")
        return {}
    return resp.json()

async def main_async():
    # 1. Create Instructor
    inst_email = await seed_instructor()
    inst_token = login_user(inst_email, "instructor123")
    
    # 2. Create Course & Content
    course = create_course(inst_token)
    print(f"Created Course: {course['slug']}")
    
    # Publish course
    requests.post(f"{BASE_URL}/api/courses/{course['id']}/publish", headers={"Authorization": f"Bearer {inst_token}"}, json={})
    
    lesson = create_lesson(inst_token, course['id'])
    print(f"Created Lesson: {lesson['id']}")
    
    # 3. Create Student
    await seed_user()
    student_token = login_user(TEST_EMAIL, TEST_PASS)
    
    # 4. Enroll
    enroll_course(student_token, course['id'])
    print("Enrolled")
    
    # 5. Check Initial
    prog = check_enrollment_progress(student_token, course['slug'])
    print(f"Initial: {prog}")
    
    # 6. Complete Lesson
    update_lesson_progress(student_token, lesson['id'])
    print("Lesson Completed")
    
    # 7. Check Final
    prog_final = check_enrollment_progress(student_token, course['slug'])
    print(f"Final: {prog_final}")
    
    if prog_final.get('progress_percentage') == 100:
        print("SUCCESS")
    else:
        print("FAILURE")

if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(main_async())
