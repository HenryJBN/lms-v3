from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from typing import List, Optional
import uuid
import os

from database.connection import database
from models.schemas import (
    AssignmentCreate, AssignmentUpdate, AssignmentResponse,
    AssignmentSubmissionCreate, AssignmentSubmissionUpdate, AssignmentSubmissionResponse,
    PaginationParams, PaginatedResponse
)
from middleware.auth import get_current_active_user, require_instructor_or_admin
from utils.file_upload import upload_file

router = APIRouter()

@router.get("/", response_model=PaginatedResponse)
async def get_all_assignments(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=1000),
    course_id: Optional[uuid.UUID] = None,
    lesson_id: Optional[uuid.UUID] = None,
    is_published: Optional[bool] = None,
    search: Optional[str] = None,
    sort_by: str = Query("created_at", regex="^(created_at|updated_at|title|due_date)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    current_user = Depends(require_instructor_or_admin)
):
    """Get all assignments for admin management with filtering and pagination"""
    offset = (page - 1) * size

    # Build WHERE conditions
    where_conditions = []
    params = {"offset": offset, "limit": size}

    # Course filter
    if course_id:
        where_conditions.append("a.course_id = :course_id")
        params["course_id"] = course_id

    # Lesson filter
    if lesson_id:
        where_conditions.append("a.lesson_id = :lesson_id")
        params["lesson_id"] = lesson_id

    # Published status filter
    if is_published is not None:
        where_conditions.append("a.is_published = :is_published")
        params["is_published"] = is_published

    # Search filter
    if search:
        where_conditions.append("""
            (a.title ILIKE :search OR
             a.description ILIKE :search OR
             c.title ILIKE :search OR
             l.title ILIKE :search)
        """)
        params["search"] = f"%{search}%"

    where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"

    # Build ORDER BY
    order_clause = f"a.{sort_by} {sort_order.upper()}"

    # Main query
    query = f"""
        SELECT
            a.id,
            a.title,
            a.description,
            a.instructions,
            a.due_date,
            a.max_points,
            a.allow_late_submission,
            a.is_published,
            a.created_at,
            a.updated_at,
            a.lesson_id,
            a.course_id,
            c.title as course_title,
            l.title as lesson_title,
            COALESCE(sub_stats.total_submissions, 0) as total_submissions,
            COALESCE(sub_stats.graded_submissions, 0) as graded_submissions
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN lessons l ON a.lesson_id = l.id
        LEFT JOIN (
            SELECT
                assignment_id,
                COUNT(*) as total_submissions,
                COUNT(CASE WHEN grade IS NOT NULL THEN 1 END) as graded_submissions
            FROM assignment_submissions
            GROUP BY assignment_id
        ) sub_stats ON a.id = sub_stats.assignment_id
        WHERE {where_clause}
        ORDER BY {order_clause}
        LIMIT :limit OFFSET :offset
    """

    # Count query for pagination
    count_query = f"""
        SELECT COUNT(*) as total
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN lessons l ON a.lesson_id = l.id
        WHERE {where_clause}
    """

    # Execute queries
    assignments = await database.fetch_all(query, values=params)
    count_result = await database.fetch_one(count_query, values={k: v for k, v in params.items() if k not in ["offset", "limit"]})

    total = count_result.total if count_result else 0
    total_pages = (total + size - 1) // size

    # Transform results
    transformed_assignments = []
    for assignment in assignments:
        transformed_assignment = {
            "id": assignment.id,
            "title": assignment.title,
            "description": assignment.description,
            "instructions": assignment.instructions,
            "due_date": assignment.due_date.isoformat() if assignment.due_date else None,
            "max_points": assignment.max_points,
            "allow_late_submission": assignment.allow_late_submission,
            "is_published": assignment.is_published,
            "course_title": assignment.course_title,
            "lesson_title": assignment.lesson_title,
            "total_submissions": assignment.total_submissions,
            "graded_submissions": assignment.graded_submissions,
            "created_date": assignment.created_at.isoformat(),
            "course_id": str(assignment.course_id),
            "lesson_id": str(assignment.lesson_id) if assignment.lesson_id else None
        }
        transformed_assignments.append(transformed_assignment)

    return PaginatedResponse(
        items=transformed_assignments,
        total=total,
        page=page,
        size=size,
        pages=total_pages
    )

@router.get("/course/{course_id}", response_model=List[AssignmentResponse])
async def get_course_assignments(
    course_id: uuid.UUID,
    current_user = Depends(get_current_active_user)
):
    # Check if user has access to course
    access_query = """
        SELECT c.id, c.instructor_id,
               CASE WHEN ce.id IS NOT NULL THEN true ELSE false END as is_enrolled
        FROM courses c
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id
            AND ce.user_id = :user_id AND ce.status = 'active'
        WHERE c.id = :course_id
    """

    access_check = await database.fetch_one(access_query, values={
        "course_id": course_id,
        "user_id": current_user.id
    })

    if not access_check:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    # Check if user has access
    has_access = (
        access_check.is_enrolled or
        str(access_check.instructor_id) == str(current_user.id) or
        current_user.role == "admin"
    )

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to course assignments"
        )

    # Get assignments
    query = """
        SELECT a.*,
               CASE WHEN sub.id IS NOT NULL THEN sub.status ELSE 'not_submitted' END as submission_status,
               CASE WHEN sub.id IS NOT NULL THEN sub.grade ELSE null END as user_grade,
               sub.submitted_at as submission_date
        FROM assignments a
        LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id
            AND sub.user_id = :user_id
        WHERE a.course_id = :course_id AND a.is_published = true
        ORDER BY a.due_date, a.created_at
    """

    assignments = await database.fetch_all(query, values={
        "course_id": course_id,
        "user_id": current_user.id
    })

    return [AssignmentResponse(**assignment) for assignment in assignments]

@router.get("/{assignment_id}", response_model=AssignmentResponse)
async def get_assignment(
    assignment_id: uuid.UUID,
    current_user = Depends(get_current_active_user)
):
    # Check access and get assignment
    query = """
        SELECT a.*, c.instructor_id,
               CASE WHEN ce.id IS NOT NULL THEN true ELSE false END as is_enrolled
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id
            AND ce.user_id = :user_id AND ce.status = 'active'
        WHERE a.id = :assignment_id
    """

    assignment = await database.fetch_one(query, values={
        "assignment_id": assignment_id,
        "user_id": current_user.id
    })

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )

    # Check access
    has_access = (
        assignment.is_enrolled or
        str(assignment.instructor_id) == str(current_user.id) or
        current_user.role == "admin"
    )

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this assignment"
        )

    return AssignmentResponse(**assignment)

@router.post("/", response_model=AssignmentResponse)
async def create_assignment(
    assignment: AssignmentCreate,
    current_user = Depends(require_instructor_or_admin)
):
    # Check if user owns the course or is admin
    course_query = "SELECT instructor_id FROM courses WHERE id = :course_id"
    course = await database.fetch_one(course_query, values={"course_id": assignment.course_id})

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    if current_user.role != "admin" and str(course.instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create assignments for this course"
        )

    # Check if lesson exists (optional)
    if assignment.lesson_id:
        lesson_query = "SELECT id FROM lessons WHERE id = :lesson_id AND course_id = :course_id"
        lesson = await database.fetch_one(lesson_query, values={
            "lesson_id": assignment.lesson_id,
            "course_id": assignment.course_id
        })
        if not lesson:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lesson not found in this course"
            )

    assignment_id = uuid.uuid4()

    query = """
        INSERT INTO assignments (
            id, lesson_id, course_id, title, description, instructions,
            due_date, max_points, allow_late_submission, is_published
        )
        VALUES (
            :id, :lesson_id, :course_id, :title, :description, :instructions,
            :due_date, :max_points, :allow_late_submission, :is_published
        )
        RETURNING *
    """

    values = {
        "id": assignment_id,
        **assignment.dict()
    }

    try:
        new_assignment = await database.fetch_one(query, values=values)
        return AssignmentResponse(**new_assignment)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create assignment: {str(e)}"
        )

@router.put("/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(
    assignment_id: uuid.UUID,
    assignment_update: AssignmentUpdate,
    current_user = Depends(require_instructor_or_admin)
):
    # Check if assignment exists and user has permission
    check_query = """
        SELECT a.*, c.instructor_id
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        WHERE a.id = :assignment_id
    """
    existing_assignment = await database.fetch_one(check_query, values={"assignment_id": assignment_id})

    if not existing_assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )

    if current_user.role != "admin" and str(existing_assignment.instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this assignment"
        )

    # Build update query
    update_fields = []
    values = {"assignment_id": assignment_id}

    for field, value in assignment_update.dict(exclude_unset=True).items():
        update_fields.append(f"{field} = :{field}")
        values[field] = value

    if not update_fields:
        return AssignmentResponse(**existing_assignment)

    query = f"""
        UPDATE assignments
        SET {', '.join(update_fields)}, updated_at = NOW()
        WHERE id = :assignment_id
        RETURNING *
    """

    updated_assignment = await database.fetch_one(query, values=values)
    return AssignmentResponse(**updated_assignment)

@router.delete("/{assignment_id}")
async def delete_assignment(
    assignment_id: uuid.UUID,
    current_user = Depends(require_instructor_or_admin)
):
    # Check if assignment exists and user has permission
    check_query = """
        SELECT a.*, c.instructor_id
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        WHERE a.id = :assignment_id
    """
    existing_assignment = await database.fetch_one(check_query, values={"assignment_id": assignment_id})

    if not existing_assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )

    if current_user.role != "admin" and str(existing_assignment.instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this assignment"
        )

    # Delete assignment (cascade will handle related records)
    query = "DELETE FROM assignments WHERE id = :assignment_id"
    await database.execute(query, values={"assignment_id": assignment_id})

    return {"message": "Assignment deleted successfully"}

@router.post("/{assignment_id}/submissions", response_model=AssignmentSubmissionResponse)
async def submit_assignment(
    assignment_id: uuid.UUID,
    submission: AssignmentSubmissionCreate,
    current_user = Depends(get_current_active_user)
):
    # Check if assignment exists and user has access
    access_query = """
        SELECT a.*, c.instructor_id,
               CASE WHEN ce.id IS NOT NULL THEN true ELSE false END as is_enrolled
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id
            AND ce.user_id = :user_id AND ce.status = 'active'
        WHERE a.id = :assignment_id
    """

    assignment = await database.fetch_one(access_query, values={
        "assignment_id": assignment_id,
        "user_id": current_user.id
    })

    if not assignment or not assignment.is_enrolled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to submit this assignment"
        )

    # Check if already submitted
    existing_submission_query = """
        SELECT id FROM assignment_submissions
        WHERE assignment_id = :assignment_id AND user_id = :user_id
    """
    existing = await database.fetch_one(existing_submission_query, values={
        "assignment_id": assignment_id,
        "user_id": current_user.id
    })

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignment already submitted"
        )

    submission_id = uuid.uuid4()

    query = """
        INSERT INTO assignment_submissions (
            id, user_id, assignment_id, course_id, content, attachments, submitted_at
        )
        VALUES (
            :id, :user_id, :assignment_id, :course_id, :content, :attachments, NOW()
        )
        RETURNING *
    """

    values = {
        "id": submission_id,
        "user_id": current_user.id,
        "assignment_id": assignment_id,
        "course_id": assignment.course_id,
        **submission.dict()
    }

    new_submission = await database.fetch_one(query, values=values)
    return AssignmentSubmissionResponse(**new_submission)

@router.get("/{assignment_id}/submissions", response_model=List[AssignmentSubmissionResponse])
async def get_assignment_submissions(
    assignment_id: uuid.UUID,
    current_user = Depends(require_instructor_or_admin)
):
    # Check if assignment exists and user has permission
    check_query = """
        SELECT a.*, c.instructor_id
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        WHERE a.id = :assignment_id
    """
    assignment = await database.fetch_one(check_query, values={"assignment_id": assignment_id})

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )

    if current_user.role != "admin" and str(assignment.instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view submissions for this assignment"
        )

    # Get all submissions with user details
    query = """
        SELECT sub.*,
               u.first_name, u.last_name, u.email,
               CASE WHEN sub.grade IS NOT NULL THEN true ELSE false END as is_graded
        FROM assignment_submissions sub
        JOIN users u ON sub.user_id = u.id
        WHERE sub.assignment_id = :assignment_id
        ORDER BY sub.submitted_at DESC
    """

    submissions = await database.fetch_all(query, values={"assignment_id": assignment_id})
    return [AssignmentSubmissionResponse(**submission) for submission in submissions]

@router.put("/submissions/{submission_id}/grade")
async def grade_assignment_submission(
    submission_id: uuid.UUID,
    grade: int,
    feedback: Optional[str] = None,
    current_user = Depends(require_instructor_or_admin)
):
    # Check if submission exists and user has permission
    check_query = """
        SELECT sub.*, a.id as assignment_id, c.instructor_id
        FROM assignment_submissions sub
        JOIN assignments a ON sub.assignment_id = a.id
        JOIN courses c ON a.course_id = c.id
        WHERE sub.id = :submission_id
    """
    submission = await database.fetch_one(check_query, values={"submission_id": submission_id})

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )

    if current_user.role != "admin" and str(submission.instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to grade this submission"
        )

    # Get assignment max_points for validation
    assignment_query = "SELECT max_points FROM assignments WHERE id = :assignment_id"
    assignment = await database.fetch_one(assignment_query, values={"assignment_id": submission.assignment_id})

    if grade < 0 or grade > assignment.max_points:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Grade must be between 0 and {assignment.max_points}"
        )

    # Update submission
    update_query = """
        UPDATE assignment_submissions
        SET grade = :grade, feedback = :feedback,
            graded_at = NOW(), graded_by = :graded_by,
            status = 'graded', updated_at = NOW()
        WHERE id = :submission_id
        RETURNING *
    """

    values = {
        "submission_id": submission_id,
        "grade": grade,
        "feedback": feedback,
        "graded_by": current_user.id
    }

    updated_submission = await database.fetch_one(update_query, values=values)
    return AssignmentSubmissionResponse(**updated_submission)

@router.get("/submissions/{submission_id}", response_model=AssignmentSubmissionResponse)
async def get_assignment_submission(
    submission_id: uuid.UUID,
    current_user = Depends(get_current_active_user)
):
    """Get individual submission details for the current user"""
    # Check if submission exists and user has access
    submission_query = """
        SELECT sub.*, a.title as assignment_title, c.title as course_title
        FROM assignment_submissions sub
        JOIN assignments a ON sub.assignment_id = a.id
        JOIN courses c ON sub.course_id = c.id
        WHERE sub.id = :submission_id AND sub.user_id = :user_id
    """

    submission = await database.fetch_one(submission_query, values={
        "submission_id": submission_id,
        "user_id": current_user.id
    })

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )

    return AssignmentSubmissionResponse(**submission)

@router.post("/upload-attachment")
async def upload_assignment_attachment(
    file: UploadFile = File(...),
    current_user = Depends(get_current_active_user)
):
    """Upload file attachment for assignment submission"""
    try:
        # Upload file
        file_result = await upload_file(file, "assignments")

        return {
            "filename": file_result["filename"],
            "url": file_result["url"],
            "size": file_result["size"],
            "content_type": file_result["content_type"],
            "message": "File uploaded successfully"
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )
