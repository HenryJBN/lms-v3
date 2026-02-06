from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from typing import List, Optional
import uuid
import os

from database.session import get_session, AsyncSession
from dependencies import get_current_site
from models.site import Site
from sqlmodel import select, func, and_, or_, desc, col
from models.course import Course
from models.lesson import Lesson, Assignment, AssignmentSubmission
from models.enums import UserRole
from schemas.lesson import (
    AssignmentCreate, AssignmentUpdate, AssignmentResponse,
    AssignmentSubmissionCreate, AssignmentSubmissionUpdate, AssignmentSubmissionResponse
)
from schemas.common import PaginationParams, PaginatedResponse
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
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Get all assignments for admin management with filtering and pagination"""
    offset = (page - 1) * size

    # Base query
    query = select(
        Assignment,
        Course.title.label("course_title"),
        Lesson.title.label("lesson_title")
    ).join(Course, Assignment.course_id == Course.id).outerjoin(
        Lesson, Assignment.lesson_id == Lesson.id
    ).where(Assignment.site_id == current_site.id)

    # Filtering
    if course_id:
        query = query.where(Assignment.course_id == course_id)
    if lesson_id:
        query = query.where(Assignment.lesson_id == lesson_id)
    if is_published is not None:
        query = query.where(Assignment.is_published == is_published)
    if search:
        query = query.where(or_(
            Assignment.title.ilike(f"%{search}%"),
            Assignment.description.ilike(f"%{search}%"),
            Course.title.ilike(f"%{search}%"),
            Lesson.title.ilike(f"%{search}%")
        ))

    # Sorting
    if sort_order == "desc":
        query = query.order_by(desc(getattr(Assignment, sort_by)))
    else:
        query = query.order_by(getattr(Assignment, sort_by))

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await session.exec(count_query)).one()

    # Get results
    query = query.limit(size).offset(offset)
    result = await session.exec(query)

    items = []
    for assignment, c_title, l_title in result:
        # Get submission stats
        # SQLModel doesn't have native case yet in some versions, use SQLAlchemy
        from sqlalchemy import case
        stats_query = select(
            func.count(AssignmentSubmission.id).label("total"),
            func.count(case((AssignmentSubmission.grade != None, 1))).label("graded")
        ).where(AssignmentSubmission.assignment_id == assignment.id, AssignmentSubmission.site_id == current_site.id)
        
        stats = (await session.exec(stats_query)).first()
        
        item = {
            **assignment.model_dump(),
            "course_title": c_title,
            "lesson_title": l_title,
            "total_submissions": stats.total if stats else 0,
            "graded_submissions": stats.graded if stats else 0,
            "created_date": assignment.created_at.isoformat() if assignment.created_at else None,
            "due_date": assignment.due_date.isoformat() if assignment.due_date else None
        }
        items.append(item)

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size
    )

@router.get("/course/{course_id}", response_model=List[AssignmentResponse])
async def get_course_assignments(
    course_id: uuid.UUID,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    # Check course and enrollment/instructor/admin access
    from models.enrollment import Enrollment
    query = select(Course).where(Course.id == course_id, Course.site_id == current_site.id)
    course = (await session.exec(query)).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
        
    # Check enrollment
    enrollment_query = select(Enrollment).where(
        Enrollment.course_id == course_id, 
        Enrollment.user_id == current_user.id,
        Enrollment.site_id == current_site.id,
        Enrollment.status == 'active'
    )
    is_enrolled = (await session.exec(enrollment_query)).first() is not None
    
    has_access = (
        is_enrolled or
        course.instructor_id == current_user.id or
        current_user.role == UserRole.admin
    )

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to course assignments"
        )

    # Get assignments with user submission status
    # We'll fetch assignments and then map submissions in memory for simplicity/performance with SQLModel
    assignments_query = select(Assignment).where(
        Assignment.course_id == course_id, 
        Assignment.is_published == True,
        Assignment.site_id == current_site.id
    ).order_by(Assignment.due_date, Assignment.created_at)
    
    assignments = (await session.exec(assignments_query)).all()
    
    results = []
    for assignment in assignments:
        submission_query = select(AssignmentSubmission).where(
            AssignmentSubmission.assignment_id == assignment.id,
            AssignmentSubmission.user_id == current_user.id,
            AssignmentSubmission.site_id == current_site.id
        )
        submission = (await session.exec(submission_query)).first()
        
        a_dict = assignment.model_dump()
        a_dict["submission_status"] = submission.status if submission else "not_submitted"
        a_dict["user_grade"] = submission.grade if submission else None
        a_dict["submission_date"] = submission.submitted_at if submission else None
        results.append(AssignmentResponse(**a_dict))
        
    return results

@router.get("/{assignment_id}", response_model=AssignmentResponse)
async def get_assignment(
    assignment_id: uuid.UUID,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    # Get assignment and check access
    from models.enrollment import Enrollment
    query = select(Assignment, Course).join(Course, Assignment.course_id == Course.id).where(Assignment.id == assignment_id, Assignment.site_id == current_site.id)
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    assignment, course = row
    
    # Check enrollment
    enrollment_query = select(Enrollment).where(
        Enrollment.course_id == course.id, 
        Enrollment.user_id == current_user.id,
        Enrollment.site_id == current_site.id,
        Enrollment.status == 'active'
    )
    is_enrolled = (await session.exec(enrollment_query)).first() is not None
    
    has_access = (
        is_enrolled or
        course.instructor_id == current_user.id or
        current_user.role == UserRole.admin
    )

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this assignment"
        )

    return assignment

@router.post("/", response_model=AssignmentResponse)
async def create_assignment(
    assignment_in: AssignmentCreate,
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    # Check if user owns the course or is admin
    query = select(Course).where(Course.id == assignment_in.course_id, Course.site_id == current_site.id)
    result = await session.exec(query)
    course = result.first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    if current_user.role != UserRole.admin and course.instructor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create assignments for this course"
        )

    # Check if lesson exists (optional)
    if assignment_in.lesson_id:
        lesson_query = select(Lesson).where(
            Lesson.id == assignment_in.lesson_id, 
            Lesson.course_id == assignment_in.course_id
        )
        lesson = (await session.exec(lesson_query)).first()
        if not lesson:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lesson not found in this course"
            )

    new_assignment = Assignment(
        **assignment_in.model_dump(),
        id=uuid.uuid4(),
        site_id=current_site.id
    )

    try:
        session.add(new_assignment)
        await session.commit()
        await session.refresh(new_assignment)
        return new_assignment
    except Exception as e:
        logger.error(f"Failed to create assignment: {str(e)}")
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create assignment: {str(e)}"
        )

@router.put("/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(
    assignment_id: uuid.UUID,
    assignment_update: AssignmentUpdate,
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    # Get assignment and check permission
    query = select(Assignment, Course).join(Course, Assignment.course_id == Course.id).where(Assignment.id == assignment_id, Assignment.site_id == current_site.id)
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    assignment, course = row

    if current_user.role != "admin" and course.instructor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this assignment"
        )

    update_data = assignment_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(assignment, key, value)
        
    assignment.updated_at = datetime.utcnow()
    session.add(assignment)
    await session.commit()
    await session.refresh(assignment)
    return assignment

@router.delete("/{assignment_id}")
async def delete_assignment(
    assignment_id: uuid.UUID,
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    # Get assignment and check permission
    query = select(Assignment, Course).join(Course, Assignment.course_id == Course.id).where(Assignment.id == assignment_id, Assignment.site_id == current_site.id)
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    assignment, course = row

    if current_user.role != UserRole.admin and course.instructor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this assignment"
        )

    await session.delete(assignment)
    await session.commit()

    return {"message": "Assignment deleted successfully"}

@router.post("/{assignment_id}/submissions", response_model=AssignmentSubmissionResponse)
async def submit_assignment(
    assignment_id: uuid.UUID,
    submission_in: AssignmentSubmissionCreate,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    # Check if assignment exists and user has access
    from models.enrollment import Enrollment
    query = select(Assignment).where(Assignment.id == assignment_id, Assignment.site_id == current_site.id)
    assignment = (await session.exec(query)).first()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
        
    enrollment_query = select(Enrollment).where(
        Enrollment.course_id == assignment.course_id, 
        Enrollment.user_id == current_user.id,
        Enrollment.site_id == current_site.id,
        Enrollment.status == 'active'
    )
    is_enrolled = (await session.exec(enrollment_query)).first() is not None

    if not is_enrolled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to submit this assignment"
        )

    # Check if already submitted
    existing_query = select(AssignmentSubmission.id).where(
        AssignmentSubmission.assignment_id == assignment_id, 
        AssignmentSubmission.user_id == current_user.id,
        AssignmentSubmission.site_id == current_site.id
    )
    existing = (await session.exec(existing_query)).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignment already submitted"
        )

    new_submission = AssignmentSubmission(
        **submission_in.model_dump(),
        id=uuid.uuid4(),
        user_id=current_user.id,
        assignment_id=assignment_id,
        course_id=assignment.course_id,
        site_id=current_site.id,
        submitted_at=datetime.utcnow()
    )

    try:
        session.add(new_submission)
        await session.commit()
        await session.refresh(new_submission)
        return new_submission
    except Exception as e:
        logger.error(f"Failed to submit assignment: {str(e)}")
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to submit assignment: {str(e)}"
        )

@router.get("/{assignment_id}/submissions", response_model=List[AssignmentSubmissionResponse])
async def get_assignment_submissions(
    assignment_id: uuid.UUID,
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    # Get assignment and check permission
    query = select(Assignment, Course).join(Course, Assignment.course_id == Course.id).where(Assignment.id == assignment_id, Assignment.site_id == current_site.id)
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    assignment, course = row

    if current_user.role != UserRole.admin and course.instructor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view submissions for this assignment"
        )

    # Get all submissions with user details
    from models.user import User
    sub_query = select(
        AssignmentSubmission, 
        User.first_name, 
        User.last_name, 
        User.email
    ).join(User, User.id == AssignmentSubmission.user_id).where(
        AssignmentSubmission.assignment_id == assignment_id,
        AssignmentSubmission.site_id == current_site.id
    ).order_by(desc(AssignmentSubmission.submitted_at))
    
    result = await session.exec(sub_query)
    
    submissions_list = []
    for sub, f_name, l_name, email in result:
        s_dict = sub.model_dump()
        s_dict.update({
            "first_name": f_name,
            "last_name": l_name,
            "email": email,
            "is_graded": sub.grade is not None
        })
        submissions_list.append(AssignmentSubmissionResponse(**s_dict))
        
    return submissions_list

@router.put("/submissions/{submission_id}/grade")
async def grade_assignment_submission(
    submission_id: uuid.UUID,
    grade: int,
    feedback: Optional[str] = None,
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    # Get submission and check permission
    query = select(AssignmentSubmission, Assignment, Course).join(
        Assignment, AssignmentSubmission.assignment_id == Assignment.id
    ).join(
        Course, Assignment.course_id == Course.id
    ).where(AssignmentSubmission.id == submission_id, AssignmentSubmission.site_id == current_site.id)
    
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    submission, assignment, course = row

    if current_user.role != UserRole.admin and course.instructor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to grade this submission"
        )

    if grade < 0 or grade > assignment.max_points:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Grade must be between 0 and {assignment.max_points}"
        )

    # Update submission
    submission.grade = grade
    submission.feedback = feedback
    submission.graded_at = datetime.utcnow()
    submission.graded_by = current_user.id
    submission.status = 'graded'
    submission.updated_at = datetime.utcnow()
    
    session.add(submission)
    await session.commit()
    await session.refresh(submission)
    return submission

@router.get("/submissions/{submission_id}", response_model=AssignmentSubmissionResponse)
async def get_assignment_submission(
    submission_id: uuid.UUID,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Get individual submission details for the current user"""
    query = select(
        AssignmentSubmission, 
        Assignment.title.label("assignment_title"), 
        Course.title.label("course_title")
    ).join(Assignment, AssignmentSubmission.assignment_id == Assignment.id).join(
        Course, AssignmentSubmission.course_id == Course.id
    ).where(AssignmentSubmission.id == submission_id, AssignmentSubmission.user_id == current_user.id, AssignmentSubmission.site_id == current_site.id)
    
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
        
    sub, a_title, c_title = row
    s_dict = sub.model_dump()
    s_dict.update({
        "assignment_title": a_title,
        "course_title": c_title
    })
    return AssignmentSubmissionResponse(**s_dict)

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
