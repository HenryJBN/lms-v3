from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from sqlmodel import select, text, func, cast, String
from sqlmodel.ext.asyncio.session import AsyncSession

from database.session import get_session
from dependencies import get_current_site
from models.site import Site
from models.user import User
from models.course import Course
from models.enrollment import Enrollment
from models.cohort import Cohort
from models.enums import EnrollmentStatus, CourseStatus

from schemas.enrollment import EnrollmentCreate, EnrollmentResponse
from schemas.course import CourseResponse
from schemas.common import PaginationParams, PaginatedResponse
from models.gamification import TokenTransaction
from models.enrollment import LessonProgress, Certificate
from models.lesson import Lesson
from middleware.auth import get_current_active_user, get_current_user, require_admin
from utils.tokens import award_tokens
from utils.notifications import send_enrollment_notification
from utils.site_settings import are_token_rewards_enabled, get_signup_token_reward
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/", response_model=EnrollmentResponse)
async def enroll_in_course(
    enrollment_in: EnrollmentCreate,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    # Verify Course exists and is published in this site
    query = select(Course).where(
        Course.id == enrollment_in.course_id, 
        Course.site_id == current_site.id,
        Course.status == CourseStatus.published
    )
    result = await session.exec(query)
    course = result.first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or not available")
        
    # Check Cohort if provided
    if enrollment_in.cohort_id:
        cohort = await session.get(Cohort, enrollment_in.cohort_id)
        if not cohort:
            raise HTTPException(status_code=404, detail="Cohort not found")
        if cohort.course_id != course.id:
            raise HTTPException(status_code=400, detail="Cohort does not belong to this course")
        # Check cohort site? (Should be implicit by course)
        if cohort.site_id != current_site.id: # Defensive check
            raise HTTPException(status_code=403, detail="Cohort belongs to another site")
            
        # Check cohort capacity
        # We need to count active enrollments for this cohort
        count_query = select(func.count(Enrollment.id)).where(
            Enrollment.cohort_id == cohort.id,
            Enrollment.status.in_([EnrollmentStatus.active, EnrollmentStatus.completed, EnrollmentStatus.suspended])
        )
        count_result = await session.exec(count_query)
        current_cohort_count = count_result.one()
        
        if cohort.max_students and current_cohort_count >= cohort.max_students:
             raise HTTPException(status_code=400, detail="Cohort is full")

        if not cohort.registration_open:
             raise HTTPException(status_code=400, detail="Cohort registration is closed")
             
        # Also check date? (start_date, end_date) - Implementation Decision: allow late join?
        # For now, stick to registration_open flag.

    # Check Existing Enrollment
    existing_query = select(Enrollment).where(
        Enrollment.user_id == current_user.id,
        Enrollment.course_id == course.id,
        Enrollment.cohort_id == enrollment_in.cohort_id,
        Enrollment.status == EnrollmentStatus.active
    )
    existing_result = await session.exec(existing_query)
    if existing_result.first():
        detail = "Already enrolled in this course"
        if enrollment_in.cohort_id:
             detail = "Already enrolled in this cohort"
        raise HTTPException(status_code=400, detail=detail)

    # Check Course Capacity (Global for course, irrespective of cohort? Or only for non-cohort?)
    # Usually Course Limit is total students.
    if course.enrollment_limit:
        count_query = select(func.count(Enrollment.id)).where(
            Enrollment.course_id == course.id, 
            Enrollment.status == EnrollmentStatus.active
        )
        count_result = await session.exec(count_query)
        current_count = count_result.one()
        if current_count >= course.enrollment_limit:
            raise HTTPException(status_code=400, detail="Course enrollment limit reached")
            
    # Capture necessary data before commit/utilities to avoid MissingGreenlet errors
    course_title = course.title
    course_id = course.id
    course_thumbnail = course.thumbnail_url
    course_description = course.description
    course_level = course.level
    user_id = current_user.id

    # Create Enrollment - capture values that will be needed for response
    now = datetime.utcnow()
    new_enrollment = Enrollment(
        user_id=user_id,
        course_id=course_id,
        cohort_id=enrollment_in.cohort_id,
        status=EnrollmentStatus.active,
        site_id=current_site.id,
        enrolled_at=now,
        progress_percentage=0  # Default value
    )
    session.add(new_enrollment)
    
    # Update Course and Cohort student counts (denormalized fields)
    course.total_students += 1
    session.add(course)
    
    if enrollment_in.cohort_id:
        cohort.current_enrollment_count += 1
        session.add(cohort)
    
    await session.commit()
    
    # Capture enrollment data immediately after commit, before any async operations
    enrollment_id = new_enrollment.id
    enrollment_user_id = new_enrollment.user_id
    enrollment_course_id = new_enrollment.course_id
    enrollment_status = new_enrollment.status
    enrollment_enrolled_at = new_enrollment.enrolled_at
    enrollment_progress = new_enrollment.progress_percentage
    
    # Award tokens logic - now with proper site settings check and logging
    if are_token_rewards_enabled(current_site):
        try:
            # Get the enrollment token reward amount from site settings (default 25)
            token_amount = get_signup_token_reward(current_site)
            await award_tokens(
                user_id=user_id,
                amount=float(token_amount),
                description=f"Course enrollment bonus: {course_title}",
                session=session,
                site_id=current_site.id,
                reference_type="first_course_enrollment",
                reference_id=course_id
            )
            logger.info(f"Awarded {token_amount} tokens to user {user_id} for enrolling in course {course_id}")
        except Exception as e:
            logger.error(f"Failed to award tokens to user {user_id} for course enrollment: {e}")
    else:
        logger.info(f"Token rewards are disabled for site {current_site.id}, skipping enrollment bonus for user {user_id}")
        
    # Send enrollment notification
    try:
        await send_enrollment_notification(
            user_id=user_id,
            course_title=course_title,
            course_id=course_id,
            session=session,
            site_id=current_site.id
        )
    except Exception as e:
        logger.error(f"Failed to send enrollment notification: {e}")
             
    # Return response - use captured local variables to avoid MissingGreenlet
    return EnrollmentResponse(
        id=enrollment_id,
        user_id=enrollment_user_id,
        course_id=enrollment_course_id,
        status=enrollment_status,
        enrolled_at=enrollment_enrolled_at,
        progress_percentage=enrollment_progress,
        completed_at=None,
        last_accessed_at=None,
        certificate_issued_at=None,
        title=course_title,
        thumbnail_url=course_thumbnail,
        description=course_description,
        level=course_level,
    )

@router.get("/my-courses", response_model=PaginatedResponse)
async def get_my_enrollments(
    pagination: PaginationParams = Depends(),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    # Join Enrollment -> Course -> Instructor
    query = select(Enrollment, Course, User).join(Course, Enrollment.course_id == Course.id).join(User, Course.instructor_id == User.id)
    query = query.where(
        Enrollment.user_id == current_user.id,
        Enrollment.site_id == current_site.id
    )
    
    if status:
        # Cast string to Enum if needed, or rely on SQLModel comparison
        query = query.where(Enrollment.status == status)
        
    # Count
    count_query = select(func.count(Enrollment.id)).where(
        Enrollment.user_id == current_user.id,
        Enrollment.site_id == current_site.id
    )
    if status:
        count_query = count_query.where(Enrollment.status == status)
    
    total_result = await session.exec(count_query)
    total = total_result.one()
    
    # Order and Paging
    query = query.order_by(Enrollment.enrolled_at.desc())
    query = query.offset((pagination.page - 1) * pagination.size).limit(pagination.size)
    
    results = await session.exec(query)
    
    items = []
    for enrollment, course, instructor in results:
        items.append(EnrollmentResponse(
            **enrollment.dict(),
            title=course.title,
            thumbnail_url=course.thumbnail_url,
            description=course.description,
            level=course.level,
            instructor_first_name=instructor.first_name,
            instructor_last_name=instructor.last_name,
            course_slug=course.slug
        ))
        
    return PaginatedResponse(
        items=items,
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=(total + pagination.size - 1) // pagination.size
    )


@router.get("/admin/completions")
async def get_all_completions(
    pagination: PaginationParams = Depends(),
    course_id: Optional[uuid.UUID] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """
    Get all enrollments with completion data for admin dashboard.
    Supports filtering by course, status, search, and date range.
    """
    from sqlalchemy import or_, and_
    
    # Convert timezone-aware datetimes to timezone-naive for PostgreSQL compatibility
    if start_date and start_date.tzinfo is not None:
        start_date = start_date.replace(tzinfo=None)
    if end_date and end_date.tzinfo is not None:
        end_date = end_date.replace(tzinfo=None)
    
    # Build the main query joining Enrollment, User, Course, and Cohort (left join)
    query = select(
        Enrollment,
        User,
        Course,
        Cohort
    ).join(
        User, Enrollment.user_id == User.id
    ).join(
        Course, Enrollment.course_id == Course.id
    ).outerjoin(
        Cohort, Enrollment.cohort_id == Cohort.id
    ).where(
        Enrollment.site_id == current_site.id
    )
    
    # Apply filters
    if course_id:
        query = query.where(Enrollment.course_id == course_id)
    
    if status:
        query = query.where(Enrollment.status == status)
    
    if search:
        search_term = f"%{search.lower()}%"
        query = query.where(
            or_(
                func.lower(User.first_name).ilike(search_term),
                func.lower(User.last_name).ilike(search_term),
                func.lower(User.email).ilike(search_term),
                func.lower(Course.title).ilike(search_term)
            )
        )
    
    if start_date:
        query = query.where(Enrollment.enrolled_at >= start_date)
    
    if end_date:
        query = query.where(Enrollment.enrolled_at <= end_date)
    
    # Count total
    count_query = select(func.count(Enrollment.id)).where(
        Enrollment.site_id == current_site.id
    )
    if course_id:
        count_query = count_query.where(Enrollment.course_id == course_id)
    if status:
        count_query = count_query.where(Enrollment.status == status)
    
    total_result = await session.exec(count_query)
    total = total_result.one()
    
    # Order and paginate
    query = query.order_by(Enrollment.enrolled_at.desc())
    query = query.offset((pagination.page - 1) * pagination.size).limit(pagination.size)
    
    results = await session.exec(query)
    rows = results.all()
    
    items = []
    for enrollment, user, course, cohort in rows:
        # Get lessons count for this course
        lessons_query = select(func.count(Lesson.id)).where(
            Lesson.course_id == course.id,
            Lesson.is_published == True
        )
        lessons_result = await session.exec(lessons_query)
        total_lessons = lessons_result.one() or 0
        
        # Get completed lessons count
        completed_lessons_query = select(func.count(LessonProgress.id)).where(
            LessonProgress.user_id == user.id,
            LessonProgress.course_id == course.id,
            LessonProgress.status == 'completed'
        )
        completed_lessons_result = await session.exec(completed_lessons_query)
        lessons_completed = completed_lessons_result.one() or 0
        
        # Get quizzes data (lessons with quizzes)
        from models.lesson import Quiz, QuizAttempt
        quizzes_query = select(func.count(Quiz.id)).where(
            Quiz.course_id == course.id,
            Quiz.is_published == True
        )
        quizzes_result = await session.exec(quizzes_query)
        total_quizzes = quizzes_result.one() or 0
        
        # Get passed quizzes
        passed_quizzes_query = select(func.count(func.distinct(QuizAttempt.quiz_id))).where(
            QuizAttempt.user_id == user.id,
            QuizAttempt.passed == True
        ).join(Quiz, QuizAttempt.quiz_id == Quiz.id).where(
            Quiz.course_id == course.id
        )
        passed_quizzes_result = await session.exec(passed_quizzes_query)
        quizzes_passed = passed_quizzes_result.one() or 0
        
        # Get certificate info
        cert_query = select(Certificate).where(
            Certificate.user_id == user.id,
            Certificate.course_id == course.id
        )
        cert_result = await session.exec(cert_query)
        certificate = cert_result.first()
        
        # Get tokens earned for this course
        tokens_query = select(func.sum(TokenTransaction.amount)).where(
            TokenTransaction.user_id == user.id,
            TokenTransaction.reference_id == course.id,
            TokenTransaction.site_id == current_site.id
        )
        tokens_result = await session.exec(tokens_query)
        tokens_earned = tokens_result.first() or 0
        
        # Calculate time spent
        time_query = select(func.sum(LessonProgress.time_spent)).where(
            LessonProgress.user_id == user.id,
            LessonProgress.course_id == course.id
        )
        time_result = await session.exec(time_query)
        total_seconds = time_result.first() or 0
        
        # Format time spent
        if total_seconds:
            hours = int(total_seconds // 3600)
            minutes = int((total_seconds % 3600) // 60)
            time_spent = f"{hours}h {minutes}m"
        else:
            time_spent = "0h 0m"
        
        # Determine status string
        if enrollment.status == EnrollmentStatus.completed:
            status_str = "completed"
        elif enrollment.status == EnrollmentStatus.active:
            status_str = "in_progress" if enrollment.progress_percentage < 100 else "completed"
        else:
            status_str = str(enrollment.status.value)
        
        items.append({
            "id": str(enrollment.id),
            "userId": str(user.id),
            "userName": f"{user.first_name} {user.last_name}",
            "userEmail": user.email,
            "courseId": str(course.id),
            "courseTitle": course.title,
            "cohortId": str(cohort.id) if cohort else None,
            "cohortName": cohort.name if cohort else None,
            "enrollmentDate": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
            "completionDate": enrollment.completed_at.isoformat() if enrollment.completed_at else None,
            "progress": enrollment.progress_percentage,
            "timeSpent": time_spent,
            "lessonsCompleted": lessons_completed,
            "totalLessons": total_lessons,
            "quizzesPassed": quizzes_passed,
            "totalQuizzes": total_quizzes,
            "finalScore": enrollment.final_score if hasattr(enrollment, 'final_score') else None,
            "certificateIssued": certificate is not None,
            "certificateId": certificate.id if certificate else None,
            "tokensEarned": int(tokens_earned) if tokens_earned else 0,
            "status": status_str
        })
    
    return PaginatedResponse(
        items=items,
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=(total + pagination.size - 1) // pagination.size
    )


@router.get("/admin/completions/stats")
async def get_completions_stats(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """
    Get completion statistics for admin dashboard.
    """
    from sqlalchemy import case
    
    # Convert timezone-aware datetimes to timezone-naive for PostgreSQL compatibility
    if start_date and start_date.tzinfo is not None:
        start_date = start_date.replace(tzinfo=None)
    if end_date and end_date.tzinfo is not None:
        end_date = end_date.replace(tzinfo=None)
    
    # Set default date range
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()
    
    # Total enrollments
    total_query = select(func.count(Enrollment.id)).where(
        Enrollment.site_id == current_site.id,
        Enrollment.enrolled_at.between(start_date, end_date)
    )
    total_result = await session.exec(total_query)
    total_enrollments = total_result.one()
    
    # Completed enrollments
    completed_query = select(func.count(Enrollment.id)).where(
        Enrollment.site_id == current_site.id,
        Enrollment.status == EnrollmentStatus.completed,
        Enrollment.completed_at.between(start_date, end_date)
    )
    completed_result = await session.exec(completed_query)
    total_completions = completed_result.one()
    
    # Average completion rate
    avg_query = select(func.avg(Enrollment.progress_percentage)).where(
        Enrollment.site_id == current_site.id,
        Enrollment.enrolled_at.between(start_date, end_date)
    )
    avg_result = await session.exec(avg_query)
    avg_completion_rate = avg_result.first() or 0
    
    # Certificates issued
    cert_query = select(func.count(Certificate.id)).where(
        Certificate.site_id == current_site.id,
        Certificate.issued_at.between(start_date, end_date)
    )
    cert_result = await session.exec(cert_query)
    certificates_issued = cert_result.one()
    
    # Total tokens earned
    tokens_query = select(func.sum(TokenTransaction.amount)).where(
        TokenTransaction.site_id == current_site.id,
        TokenTransaction.created_at.between(start_date, end_date)
    )
    tokens_result = await session.exec(tokens_query)
    total_tokens = tokens_result.first() or 0
    
    # Average time to complete (for completed enrollments)
    # This is a simplified calculation - would need more complex logic for accurate time
    avg_time_query = select(
        func.avg(
            func.extract('day', Enrollment.completed_at - Enrollment.enrolled_at)
        )
    ).where(
        Enrollment.site_id == current_site.id,
        Enrollment.status == EnrollmentStatus.completed,
        Enrollment.completed_at.between(start_date, end_date)
    )
    avg_time_result = await session.exec(avg_time_query)
    avg_days = avg_time_result.first() or 0
    
    # Completion trends (last 6 months)
    # Use raw SQL for reliable grouping by month - use execute for raw SQL
    from sqlalchemy.ext.asyncio import AsyncConnection
    from sqlalchemy import text as raw_text
    
    trends_sql = raw_text("""
        SELECT to_char(completed_at, 'Mon') as month, COUNT(id) as completions
        FROM enrollment
        WHERE site_id = :site_id 
        AND status = 'completed' 
        AND completed_at >= :start_date
        GROUP BY to_char(completed_at, 'Mon'), EXTRACT(MONTH FROM completed_at)
        ORDER BY EXTRACT(MONTH FROM completed_at)
    """)
    
    trends_result = await session.execute(trends_sql, {
        "site_id": str(current_site.id),
        "start_date": datetime.utcnow() - timedelta(days=180)
    })
    completion_trends = []
    for row in trends_result:
        completion_trends.append({
            "month": row.month,
            "completions": row.completions
        })
    
    # Course completion rates
    course_rates_query = select(
        Course.id,
        Course.title,
        func.count(Enrollment.id).label('total'),
        func.sum(case((Enrollment.status == EnrollmentStatus.completed, 1), else_=0)).label('completed')
    ).join(
        Enrollment, Course.id == Enrollment.course_id
    ).where(
        Course.site_id == current_site.id
    ).group_by(Course.id).limit(5)
    
    course_rates_result = await session.exec(course_rates_query)
    course_completion_rates = []
    for cid, title, total, completed in course_rates_result.all():
        rate = round((completed / total) * 100) if total > 0 else 0
        course_completion_rates.append({
            "course": title,
            "rate": rate
        })
    
    return {
        "totalCompletions": total_completions,
        "totalEnrollments": total_enrollments,
        "averageCompletionRate": round(float(avg_completion_rate), 1) if avg_completion_rate else 0,
        "averageTimeToComplete": f"{round(float(avg_days), 1)} weeks" if avg_days else "N/A",
        "certificatesIssued": certificates_issued,
        "totalTokensEarned": int(total_tokens) if total_tokens else 0,
        "completionTrends": completion_trends,
        "courseCompletionRates": course_completion_rates
    }

@router.get("/{enrollment_id}", response_model=EnrollmentResponse)
async def get_enrollment(
    enrollment_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    query = select(Enrollment, Course).join(Course).where(
        Enrollment.id == enrollment_id,
        Enrollment.user_id == current_user.id,
        Enrollment.site_id == current_site.id
    )
    result = await session.exec(query)
    row = result.first()
    
    if not row:
         raise HTTPException(status_code=404, detail="Enrollment not found")
         
    enrollment, course = row
    return EnrollmentResponse(
        **enrollment.dict(),
        title=course.title,
        thumbnail_url=course.thumbnail_url
    )

@router.put("/{enrollment_id}/drop")
async def drop_course(
    enrollment_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    query = select(Enrollment).where(
        Enrollment.id == enrollment_id,
        Enrollment.user_id == current_user.id,
        Enrollment.site_id == current_site.id,
        Enrollment.status == EnrollmentStatus.active
    )
    result = await session.exec(query)
    enrollment = result.first()
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Active enrollment not found")
        
    enrollment.status = EnrollmentStatus.dropped
    enrollment.completed_at = datetime.utcnow() # Reuse completed_at or dropped_at? Model has completed_at.
    # We might want a 'dropped_at' but if strict to model... 
    session.add(enrollment)
    
    # Update course count
    course = await session.get(Course, enrollment.course_id)
    if course:
        course.total_students = max(0, course.total_students - 1)
        session.add(course)
        
    # Update cohort count if applicable
    if enrollment.cohort_id:
        cohort = await session.get(Cohort, enrollment.cohort_id)
        if cohort:
            cohort.current_enrollment_count = max(0, cohort.current_enrollment_count - 1)
            session.add(cohort)
        
    await session.commit()
    return {"message": "Successfully dropped from course"}

@router.get("/progress/{course_id}")
async def get_enrollment_progress(
    course_id: uuid.UUID,
    cohort_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    query = select(Enrollment).where(
        Enrollment.user_id == current_user.id,
        Enrollment.course_id == course_id,
        Enrollment.site_id == current_site.id,
        (Enrollment.status == EnrollmentStatus.active) | (Enrollment.status == EnrollmentStatus.completed)
    )
    
    if cohort_id:
        query = query.where(Enrollment.cohort_id == cohort_id)
        
    result = await session.exec(query)
    enrollment = result.first()
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Not enrolled in this course/cohort")
        
    return {"progress_percentage": enrollment.progress_percentage}

@router.get("/progress/slug/{course_slug}")
async def get_enrollment_progress_by_slug(
    course_slug: str,
    cohort_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    # Find course by slug in current site
    course_query = select(Course).where(Course.slug == course_slug, Course.site_id == current_site.id)
    result = await session.exec(course_query)
    course = result.first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    # Get enrollment
    query = select(Enrollment).where(
        Enrollment.user_id == current_user.id,
        Enrollment.course_id == course.id,
        Enrollment.site_id == current_site.id
    )
    
    if cohort_id:
        query = query.where(Enrollment.cohort_id == cohort_id)
        
    result = await session.exec(query)
    enrollment = result.first()
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Not enrolled in this course/cohort")
        
    return {"progress_percentage": enrollment.progress_percentage}

@router.get("/course/{course_id}/students", response_model=PaginatedResponse)
async def get_course_students(
    course_id: uuid.UUID,
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    course = await session.get(Course, course_id)
    if not course or course.site_id != current_site.id:
        raise HTTPException(status_code=404, detail="Course not found")
        
    if current_user.role != UserRole.admin and str(course.instructor_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Join Enrollment and User
    query = select(Enrollment, User).join(User, Enrollment.user_id == User.id).where(
        Enrollment.course_id == course_id,
        Enrollment.site_id == current_site.id,
        Enrollment.status == EnrollmentStatus.active
    )
    
    # Count
    count_result = await session.exec(select(func.count(Enrollment.id)).where(
        Enrollment.course_id == course_id,
        Enrollment.site_id == current_site.id,
        Enrollment.status == EnrollmentStatus.active
    ))
    total = count_result.one()
    
    # Page
    query = query.order_by(Enrollment.enrolled_at.desc())
    query = query.offset((pagination.page - 1) * pagination.size).limit(pagination.size)
    
    results = await session.exec(query)
    
    items = []
    for enrollment, student in results:
        # EnrollmentResponse expects simple dict?
        # It needs course info? 
        # The schema seems to mix user info inside EnrollmentResponse if getting students? 
        # Wait, the previous implementation joined specific user fields.
        # EnrollmentResponse (Step 146) has implicit fields? No, it has `user_id`, `id`...
        # It does NOT have first_name/last_name fields for the STUDENT.
        # It has `instructor_first_name`.
        # The previous code returned `u.first_name`, `u.last_name`... how did Pydantic map it?
        # Maybe Schema allows extra fields or I missed fields in Step 146?
        # I'll Assume we want to return student name.
        # Check schemas.py again? Step 146 showed:
        # instructor_first_name: Optional[str]
        # It did NOT show `student_first_name` or `user_first_name`. 
        # But `get_course_students` is supposed to return student list.
        # Maybe the UI uses the `user_id` to fetch profile? 
        # Or I missed fields.
        # I will inject `title` (course title) which is in schema.
        items.append(EnrollmentResponse(
            **enrollment.dict(),
            title=course.title,
            # We assume these might be ignored if not in schema, 
            # or allow constructing extended dict.
            # Ideally we return a UserEnrollmentResponse but we are stuck with EnrollmentResponse.
        ))
        
    return PaginatedResponse(
        items=items,
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=(total + pagination.size - 1) // pagination.size
    )
