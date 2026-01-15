from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import uuid
from datetime import datetime

from database.connection import database
from models.schemas import (
    EnrollmentCreate, EnrollmentResponse, CourseResponse,
    PaginationParams, PaginatedResponse
)
from middleware.auth import get_current_active_user
from utils.tokens import award_tokens
from utils.notifications import send_enrollment_notification

router = APIRouter()

@router.post("/", response_model=EnrollmentResponse)
async def enroll_in_course(
    enrollment: EnrollmentCreate,
    current_user = Depends(get_current_active_user)
):
    # Check if course exists and is published
    course_query = "SELECT * FROM courses WHERE id = :course_id AND status = 'published'"
    course = await database.fetch_one(course_query, values={"course_id": enrollment.course_id})
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or not available for enrollment"
        )
    
    # Check if user is already enrolled
    existing_query = """
        SELECT id FROM course_enrollments 
        WHERE user_id = :user_id AND course_id = :course_id
    """
    existing_enrollment = await database.fetch_one(existing_query, values={
        "user_id": current_user.id,
        "course_id": enrollment.course_id
    })
    
    if existing_enrollment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already enrolled in this course"
        )
    
    # Check enrollment limit
    if course.enrollment_limit:
        count_query = """
            SELECT COUNT(*) as count FROM course_enrollments 
            WHERE course_id = :course_id AND status = 'active'
        """
        enrollment_count = await database.fetch_one(count_query, values={"course_id": enrollment.course_id})
        
        if enrollment_count.count >= course.enrollment_limit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Course enrollment limit reached"
            )
    
    # Create enrollment
    enrollment_id = uuid.uuid4()
    insert_query = """
        INSERT INTO course_enrollments (id, user_id, course_id, status, enrolled_at)
        VALUES (:id, :user_id, :course_id, 'active', NOW())
        RETURNING *
    """
    
    new_enrollment = await database.fetch_one(insert_query, values={
        "id": enrollment_id,
        "user_id": current_user.id,
        "course_id": enrollment.course_id
    })
    
    # Update course enrollment count
    update_course_query = """
        UPDATE courses SET enrollment_count = enrollment_count + 1
        WHERE id = :course_id
    """
    await database.execute(update_course_query, values={"course_id": enrollment.course_id})
    
    # Award first enrollment bonus tokens if this is user's first course
    first_course_query = """
        SELECT COUNT(*) as count FROM course_enrollments 
        WHERE user_id = :user_id
    """
    enrollment_count = await database.fetch_one(first_course_query, values={"user_id": current_user.id})
    
    if enrollment_count.count == 1:  # First course enrollment
        await award_tokens(
            user_id=current_user.id,
            amount=25.0,
            description="First course enrollment bonus",
            reference_type="first_course_enrollment",
            reference_id=enrollment.course_id
        )
    
    # Send enrollment notification
    await send_enrollment_notification(current_user.id, course.title, enrollment.course_id)
    
    return EnrollmentResponse(**new_enrollment)

@router.get("/my-courses", response_model=PaginatedResponse)
async def get_my_enrollments(
    pagination: PaginationParams = Depends(),
    status: Optional[str] = Query(None),
    current_user = Depends(get_current_active_user)
):
    # Build query with filters
    where_conditions = ["ce.user_id = :user_id"]
    values = {
        "user_id": current_user.id,
        "size": pagination.size,
        "offset": (pagination.page - 1) * pagination.size
    }

    if status:
        where_conditions.append("ce.status = :status")
        values["status"] = status

    where_clause = "WHERE " + " AND ".join(where_conditions)

    # Get total count (exclude pagination params)
    count_values = {k: v for k, v in values.items() if k not in ["size", "offset"]}
    count_query = f"""
        SELECT COUNT(*) as total
        FROM course_enrollments ce {where_clause}
    """
    total_result = await database.fetch_one(count_query, values=count_values)
    total = total_result.total

    # Get enrollments with course info
    query = f"""
        SELECT ce.*, c.title, c.thumbnail_url, c.description, c.level,
               u.first_name as instructor_first_name, u.last_name as instructor_last_name
        FROM course_enrollments ce
        JOIN courses c ON ce.course_id = c.id
        JOIN users u ON c.instructor_id = u.id
        {where_clause}
        ORDER BY ce.enrolled_at DESC
        LIMIT :size OFFSET :offset
    """

    enrollments = await database.fetch_all(query, values=values)
    
    return PaginatedResponse(
        items=[EnrollmentResponse(**enrollment) for enrollment in enrollments],
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=(total + pagination.size - 1) // pagination.size
    )

@router.get("/{enrollment_id}", response_model=EnrollmentResponse)
async def get_enrollment(
    enrollment_id: uuid.UUID,
    current_user = Depends(get_current_active_user)
):
    query = """
        SELECT ce.*, c.title, c.thumbnail_url
        FROM course_enrollments ce
        JOIN courses c ON ce.course_id = c.id
        WHERE ce.id = :enrollment_id AND ce.user_id = :user_id
    """
    
    enrollment = await database.fetch_one(query, values={
        "enrollment_id": enrollment_id,
        "user_id": current_user.id
    })
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found"
        )
    
    return EnrollmentResponse(**enrollment)

@router.put("/{enrollment_id}/drop")
async def drop_course(
    enrollment_id: uuid.UUID,
    current_user = Depends(get_current_active_user)
):
    # Check if enrollment exists and belongs to user
    check_query = """
        SELECT * FROM course_enrollments 
        WHERE id = :enrollment_id AND user_id = :user_id AND status = 'active'
    """
    
    enrollment = await database.fetch_one(check_query, values={
        "enrollment_id": enrollment_id,
        "user_id": current_user.id
    })
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active enrollment not found"
        )
    
    # Update enrollment status
    update_query = """
        UPDATE course_enrollments 
        SET status = 'dropped', dropped_at = NOW(), updated_at = NOW()
        WHERE id = :enrollment_id
        RETURNING *
    """
    
    updated_enrollment = await database.fetch_one(update_query, values={"enrollment_id": enrollment_id})
    
    # Update course enrollment count
    update_course_query = """
        UPDATE courses SET enrollment_count = enrollment_count - 1
        WHERE id = :course_id
    """
    await database.execute(update_course_query, values={"course_id": enrollment.course_id})
    
    return {"message": "Successfully dropped from course"}

@router.get("/progress/{course_id}")
async def get_enrollment_progress(
    course_id: uuid.UUID,
    current_user = Depends(get_current_active_user)
):
    """Get enrollment progress for a course by UUID"""
    query = """
        SELECT progress_percentage
        FROM course_enrollments
        WHERE user_id = :user_id AND course_id = :course_id AND status = 'active'
    """

    enrollment = await database.fetch_one(query, values={
        "user_id": current_user.id,
        "course_id": course_id
    })

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not enrolled in this course"
        )

    return {"progress_percentage": enrollment.progress_percentage or 0}

@router.get("/progress/slug/{course_slug}")
async def get_enrollment_progress_by_slug(
    course_slug: str,
    current_user = Depends(get_current_active_user)
):
    """Get enrollment progress for a course by slug"""
    # First get the course ID from slug
    course_query = "SELECT id FROM courses WHERE slug = :course_slug"
    course = await database.fetch_one(course_query, values={"course_slug": course_slug})

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    # Get enrollment progress
    query = """
        SELECT progress_percentage
        FROM course_enrollments
        WHERE user_id = :user_id AND course_id = :course_id AND status = 'active'
    """

    enrollment = await database.fetch_one(query, values={
        "user_id": current_user.id,
        "course_id": course.id
    })

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not enrolled in this course"
        )

    return {"progress_percentage": enrollment.progress_percentage or 0}

@router.get("/course/{course_id}/students", response_model=PaginatedResponse)
async def get_course_students(
    course_id: uuid.UUID,
    pagination: PaginationParams = Depends(),
    current_user = Depends(get_current_active_user)
):
    # Check if user is instructor of the course or admin
    course_query = "SELECT instructor_id FROM courses WHERE id = :course_id"
    course = await database.fetch_one(course_query, values={"course_id": course_id})

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    if current_user.role != "admin" and str(course.instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view course students"
        )

    # Get total count
    count_query = """
        SELECT COUNT(*) as total
        FROM course_enrollments ce
        WHERE ce.course_id = :course_id AND ce.status = 'active'
    """
    total_result = await database.fetch_one(count_query, values={"course_id": course_id})
    total = total_result.total

    # Get students
    query = """
        SELECT ce.*, u.first_name, u.last_name, u.email, u.avatar_url
        FROM course_enrollments ce
        JOIN users u ON ce.user_id = u.id
        WHERE ce.course_id = :course_id AND ce.status = 'active'
        ORDER BY ce.enrolled_at DESC
        LIMIT :size OFFSET :offset
    """

    values = {
        "course_id": course_id,
        "size": pagination.size,
        "offset": (pagination.page - 1) * pagination.size
    }

    students = await database.fetch_all(query, values=values)

    return PaginatedResponse(
        items=[EnrollmentResponse(**student) for student in students],
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=(total + pagination.size - 1) // pagination.size
    )
