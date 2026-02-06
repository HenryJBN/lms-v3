from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
from sqlmodel import select, func, and_, or_, desc

from database.session import get_session, AsyncSession
from dependencies import get_current_site
from models.site import Site
from models.enrollment import Enrollment, LessonProgress, Certificate
from models.course import Course, CourseReview
from models.lesson import Lesson
from models.gamification import TokenBalance
from models.user import User
from schemas.system import AnalyticsResponse, CourseAnalytics, UserAnalytics, RevenueAnalytics
from schemas.common import PaginationParams, PaginatedResponse
from models.enums import UserRole, UserStatus
from middleware.auth import get_current_active_user, require_instructor_or_admin, require_admin

router = APIRouter()

@router.get("/me")
async def get_student_analytics(
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Return consolidated analytics for the current student dashboard"""
    user_id = current_user.id
    
    # 1. Basic Stats
    # Courses completed
    completed_query = select(func.count(Enrollment.id)).where(
        Enrollment.user_id == user_id, 
        Enrollment.site_id == current_site.id,
        Enrollment.status == 'completed'
    )
    completed_result = await session.exec(completed_query)
    courses_completed = completed_result.one()
    
    # Courses in progress
    active_query = select(func.count(Enrollment.id)).where(
        Enrollment.user_id == user_id, 
        Enrollment.site_id == current_site.id,
        Enrollment.status == 'active'
    )
    active_result = await session.exec(active_query)
    courses_in_progress = active_result.one()
    
    # Certificates earned
    cert_query = select(func.count(Certificate.id)).where(
        Certificate.user_id == user_id,
        Certificate.site_id == current_site.id
    )
    cert_result = await session.exec(cert_query)
    certificates_earned = cert_result.one()
    
    # Tokens balance
    token_query = select(TokenBalance.balance).where(
        TokenBalance.user_id == user_id,
        TokenBalance.site_id == current_site.id
    )
    token_result = await session.exec(token_query)
    tokens_balance = token_result.first() or 0.0
    
    # 2. Recent Activity (Last 5 lesson interactions)
    activity_query = select(
        LessonProgress.status, 
        LessonProgress.updated_at, 
        Lesson.title.label("lesson_title"), 
        Course.title.label("course_title"), 
        Course.slug.label("course_slug")
    ).join(
        Lesson, LessonProgress.lesson_id == Lesson.id
    ).join(
        Course, LessonProgress.course_id == Course.id
    ).where(
        LessonProgress.user_id == user_id,
        LessonProgress.site_id == current_site.id
    ).order_by(desc(LessonProgress.updated_at)).limit(5)
    
    activity_result = await session.exec(activity_query)
    recent_activity = []
    for status_val, updated_at, lesson_title, course_title, course_slug in activity_result.all():
        recent_activity.append({
            "status": status_val,
            "updated_at": updated_at,
            "lesson_title": lesson_title,
            "course_title": course_title,
            "course_slug": course_slug
        })
    
    # 3. Weekly Progress (last 7 days completions)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    weekly_query = select(func.date(LessonProgress.updated_at).label("date"), func.count(LessonProgress.id).label("count")).where(
        LessonProgress.user_id == user_id, 
        LessonProgress.site_id == current_site.id,
        LessonProgress.status == 'completed', 
        LessonProgress.updated_at >= seven_days_ago
    ).group_by(func.date(LessonProgress.updated_at)).order_by("date")
    
    weekly_result = await session.exec(weekly_query)
    weekly_progress = [{"date": str(row[0]), "count": row[1]} for row in weekly_result.all()]
    
    # 4. Active Course Enrollments
    enrollments_query = select(
        Enrollment.progress_percentage, 
        Course.title, 
        Course.slug, 
        Course.thumbnail_url, 
        Course.id.label("course_id")
    ).join(
        Course, Enrollment.course_id == Course.id
    ).where(
        Enrollment.user_id == user_id, 
        Enrollment.site_id == current_site.id,
        Enrollment.status == 'active'
    ).order_by(desc(Enrollment.last_accessed_at)).limit(4)
    
    enrollments_result = await session.exec(enrollments_query)
    active_courses = []
    for progress, title, slug, thumb, cid in enrollments_result.all():
        active_courses.append({
            "progress_percentage": progress,
            "title": title,
            "slug": slug,
            "thumbnail_url": thumb,
            "course_id": cid
        })
    
    # 5. Last Accessed Lesson
    last_lesson_query = select(
        LessonProgress.lesson_id, 
        LessonProgress.course_id, 
        Course.slug.label("course_slug")
    ).join(
        Course, LessonProgress.course_id == Course.id
    ).where(
        LessonProgress.user_id == user_id,
        LessonProgress.site_id == current_site.id
    ).order_by(desc(LessonProgress.updated_at)).limit(1)
    
    last_lesson_result = await session.exec(last_lesson_query)
    last_lesson = last_lesson_result.first()
    
    return {
        "stats": {
            "courses_completed": courses_completed,
            "courses_in_progress": courses_in_progress,
            "certificates_earned": certificates_earned,
            "tokens_balance": float(tokens_balance)
        },
        "recent_activity": recent_activity,
        "weekly_progress": weekly_progress,
        "learning_path": active_courses,
        "last_accessed": {
            "lesson_id": str(last_lesson[0]) if last_lesson else None,
            "course_id": str(last_lesson[1]) if last_lesson else None,
            "course_slug": last_lesson[2] if last_lesson else None
        }
    }

@router.get("/users")
async def get_user_analytics(
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Return aggregated user analytics for admin dashboards"""
    from models.user import User
    
    query = select(
        func.count(User.id).label("total_users"),
        func.count(select(User.id).where(User.status == 'active').scalar_subquery()).label("active_users"),
        func.count(select(User.id).where(User.role == 'student').scalar_subquery()).label("total_students"),
        func.count(select(User.id).where(User.role == 'instructor').scalar_subquery()).label("total_instructors"),
        func.count(select(User.id).where(User.role == 'admin').scalar_subquery()).label("total_admins")
    )
    
    # Simpler way with multiple queries or group by if possible, but let's stick to translating the logic
    # Actually, a single select with func.sum(case(...)) is better
    from sqlalchemy import case
    
    query = select(
        func.count(User.id).label("total_users"),
        func.sum(case((User.status == UserStatus.active, 1), else_=0)).label("active_users"),
        func.sum(case((User.role == UserRole.student, 1), else_=0)).label("total_students"),
        func.sum(case((User.role == UserRole.instructor, 1), else_=0)).label("total_instructors"),
        func.sum(case((User.role == UserRole.admin, 1), else_=0)).label("total_admins")
    ).where(User.site_id == current_site.id)
    
    result = await session.exec(query)
    row = result.first()
    
    return {
        "total_users": int(row.total_users) if row and row.total_users else 0,
        "active_users": int(row.active_users) if row and row.active_users else 0,
        "students": int(row.total_students) if row and row.total_students else 0,
        "instructors": int(row.total_instructors) if row and row.total_instructors else 0,
        "admins": int(row.total_admins) if row and row.total_admins else 0,
    }

@router.get("/overview")
async def get_analytics_overview(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Get overall platform analytics"""
    from models.user import User
    from sqlalchemy import case

    # Set default date range (last 30 days)
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()
    
    # User analytics
    user_query = select(
        func.count(User.id).label("total_users"),
        func.sum(case((User.created_at >= start_date, 1), else_=0)).label("new_users"),
        func.sum(case((User.last_login_at >= start_date, 1), else_=0)).label("active_users"),
        func.sum(case((User.role == UserRole.student, 1), else_=0)).label("total_students"),
        func.sum(case((User.role == UserRole.instructor, 1), else_=0)).label("total_instructors")
    ).where(User.status == UserStatus.active, User.created_at <= end_date, User.site_id == current_site.id)
    
    user_res = await session.exec(user_query)
    user_stats = user_res.first()
    
    # Course analytics
    course_query = select(
        func.count(Course.id).label("total_courses"),
        func.sum(case((Course.created_at >= start_date, 1), else_=0)).label("new_courses"),
        func.sum(case((Course.status == 'published', 1), else_=0)).label("published_courses"),
        func.coalesce(func.sum(Course.enrollment_count), 0).label("total_enrollments"),
        func.coalesce(func.avg(Course.enrollment_count), 0).label("avg_enrollments_per_course")
    ).where(Course.created_at <= end_date, Course.site_id == current_site.id)
    
    course_res = await session.exec(course_query)
    course_stats = course_res.first()
    
    # Enrollment analytics
    enrollment_query = select(
        func.count(Enrollment.id).label("total_enrollments"),
        func.sum(case((Enrollment.enrolled_at >= start_date, 1), else_=0)).label("new_enrollments"),
        func.sum(case((Enrollment.status == 'completed', 1), else_=0)).label("completed_enrollments"),
        func.sum(case((Enrollment.status == 'active', 1), else_=0)).label("active_enrollments")
    ).where(Enrollment.enrolled_at <= end_date, Enrollment.site_id == current_site.id)
    
    enroll_res = await session.exec(enrollment_query)
    enroll_stats = enroll_res.first()
    
    # Revenue analytics (placeholder for now, need Revenue model)
    # revenue_query = ...
    revenue_stats = {
        "total_revenue": 0,
        "period_revenue": 0,
        "completed_transactions": 0,
        "avg_transaction_value": 0
    }
    
    # Certificate analytics
    cert_query = select(
        func.count(Certificate.id).label("total_certificates"),
        func.sum(case((Certificate.issued_at >= start_date, 1), else_=0)).label("new_certificates"),
        func.sum(case((Certificate.status == 'minted', 1), else_=0)).label("minted_certificates")
    ).where(Certificate.issued_at <= end_date, Certificate.site_id == current_site.id)
    
    cert_res = await session.exec(cert_query)
    cert_stats = cert_res.first()
    
    return {
        "period": {"start_date": start_date, "end_date": end_date},
        "users": {
            "total_users": int(user_stats.total_users or 0),
            "new_users": int(user_stats.new_users or 0),
            "active_users": int(user_stats.active_users or 0),
            "total_students": int(user_stats.total_students or 0),
            "total_instructors": int(user_stats.total_instructors or 0)
        },
        "courses": {
            "total_courses": int(course_stats.total_courses or 0),
            "new_courses": int(course_stats.new_courses or 0),
            "published_courses": int(course_stats.published_courses or 0),
            "total_enrollments": int(course_stats.total_enrollments or 0),
            "avg_enrollments_per_course": float(course_stats.avg_enrollments_per_course or 0)
        },
        "enrollments": {
            "total_enrollments": int(enroll_stats.total_enrollments or 0),
            "new_enrollments": int(enroll_stats.new_enrollments or 0),
            "completed_enrollments": int(enroll_stats.completed_enrollments or 0),
            "active_enrollments": int(enroll_stats.active_enrollments or 0)
        },
        "revenue": revenue_stats,
        "certificates": {
            "total_certificates": int(cert_stats.total_certificates or 0),
            "new_certificates": int(cert_stats.new_certificates or 0),
            "minted_certificates": int(cert_stats.minted_certificates or 0)
        }
    }

@router.get("/courses/{course_id}")
async def get_course_analytics(
    course_id: uuid.UUID,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Get analytics for a specific course"""
    from sqlalchemy import case
    
    # Check if user has access to course
    query = select(Course).where(Course.id == course_id, Course.site_id == current_site.id)
    result = await session.exec(query)
    course = result.first()
    
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    
    # Check permissions
    if current_user.role != UserRole.admin and str(course.instructor_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    # Set default date range
    if not start_date:
        start_date = course.created_at
    if not end_date:
        end_date = datetime.utcnow()
    
    # Enrollment analytics
    enroll_query = select(
        func.count(Enrollment.id).label("total_enrollments"),
        func.sum(case((Enrollment.status == 'completed', 1), else_=0)).label("completions"),
        func.sum(case((Enrollment.status == 'active', 1), else_=0)).label("active_enrollments"),
        func.sum(case((Enrollment.status == 'dropped', 1), else_=0)).label("dropped_enrollments"),
        func.coalesce(func.avg(Enrollment.progress_percentage), 0).label("avg_progress")
    ).where(Enrollment.course_id == course_id, Enrollment.site_id == current_site.id, Enrollment.enrolled_at.between(start_date, end_date))
    
    enroll_res = await session.exec(enroll_query)
    enrollment_stats = enroll_res.first()
    
    # Lesson engagement
    lesson_engagement_query = select(
        Lesson.id, Lesson.title, Lesson.type,
        func.count(LessonProgress.id).label("total_views"),
        func.sum(case((LessonProgress.status == 'completed', 1), else_=0)).label("completions"),
        func.coalesce(func.avg(LessonProgress.progress_percentage), 0).label("avg_progress"),
        func.coalesce(func.avg(LessonProgress.time_spent), 0).label("avg_time_spent")
    ).outerjoin(
        LessonProgress, and_(Lesson.id == LessonProgress.lesson_id, LessonProgress.created_at.between(start_date, end_date))
    ).where(
        Lesson.course_id == course_id, Lesson.is_published == True, Lesson.site_id == current_site.id
    ).group_by(Lesson.id).order_by(Lesson.sort_order)
    
    lesson_res = await session.exec(lesson_engagement_query)
    lesson_stats = []
    for lid, title, ltype, views, comps, progress, time_spent in lesson_res.all():
        lesson_stats.append({
            "id": lid, "title": title, "type": ltype,
            "total_views": views, "completions": comps,
            "avg_progress": float(progress), "avg_time_spent": float(time_spent)
        })
    
    # Quiz performance
    from models.lesson import Quiz, QuizAttempt
    quiz_performance_query = select(
        Quiz.id, Quiz.title,
        func.count(QuizAttempt.id).label("total_attempts"),
        func.sum(case((QuizAttempt.passed == True, 1), else_=0)).label("passed_attempts"),
        func.coalesce(func.avg(QuizAttempt.score), 0).label("avg_score"),
        func.count(func.distinct(QuizAttempt.user_id)).label("unique_participants")
    ).outerjoin(
        QuizAttempt, and_(Quiz.id == QuizAttempt.quiz_id, QuizAttempt.completed_at.between(start_date, end_date))
    ).where(
        Quiz.course_id == course_id, Quiz.is_published == True, Quiz.site_id == current_site.id
    ).group_by(Quiz.id).order_by(Quiz.created_at)
    
    quiz_res = await session.exec(quiz_performance_query)
    quiz_stats = []
    for qid, title, attempts, passed, score, participants in quiz_res.all():
        quiz_stats.append({
            "id": qid, "title": title, "total_attempts": attempts,
            "passed_attempts": passed, "avg_score": float(score),
            "unique_participants": participants
        })
    
    # Student demographics (skipped for now as it needs UserProfile)
    demographics = []
    
    return CourseAnalytics(
        course_id=course_id,
        course_title=course.title,
        period={"start_date": start_date, "end_date": end_date},
        enrollments={
            "total_enrollments": int(enrollment_stats.total_enrollments or 0),
            "completions": int(enrollment_stats.completions or 0),
            "active_enrollments": int(enrollment_stats.active_enrollments or 0),
            "dropped_enrollments": int(enrollment_stats.dropped_enrollments or 0),
            "avg_progress": float(enrollment_stats.avg_progress or 0)
        },
        lessons=lesson_stats,
        quizzes=quiz_stats,
        revenue={"total_revenue": 0, "total_transactions": 0, "avg_transaction_value": 0},
        demographics=demographics
    )

@router.get("/instructors/{instructor_id}")
async def get_instructor_analytics(
    instructor_id: uuid.UUID,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Get analytics for an instructor"""
    from models.user import User
    from sqlalchemy import case
    
    # Check permissions
    if current_user.role != UserRole.admin and str(current_user.id) != str(instructor_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    # Check if instructor exists
    query = select(User).where(User.id == instructor_id, User.role == UserRole.instructor, User.site_id == current_site.id)
    res = await session.exec(query)
    instructor = res.first()
    
    if not instructor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor not found")
    
    # Set default date range
    if not start_date:
        start_date = instructor.created_at
    if not end_date:
        end_date = datetime.utcnow()
    
    # Course statistics
    course_query = select(
        func.count(Course.id).label("total_courses"),
        func.sum(case((Course.status == 'published', 1), else_=0)).label("published_courses"),
        func.sum(case((Course.created_at >= start_date, 1), else_=0)).label("new_courses"),
        func.coalesce(func.sum(Course.enrollment_count), 0).label("total_enrollments"),
        func.coalesce(func.avg(Course.enrollment_count), 0).label("avg_enrollments_per_course")
    ).where(Course.instructor_id == instructor_id, Course.created_at <= end_date)
    
    course_res = await session.exec(course_query)
    course_stats = course_res.first()
    
    # Revenue placeholder
    revenue_stats = {"total_revenue": 0, "period_revenue": 0, "completed_transactions": 0}
    
    # Student statistics
    student_query = select(
        func.count(func.distinct(Enrollment.user_id)).label("total_students"),
        func.sum(case((Enrollment.status == 'completed', 1), else_=0)).label("completed_students"),
        func.sum(case((Enrollment.enrolled_at >= start_date, 1), else_=0)).label("new_students")
    ).join(
        Course, Enrollment.course_id == Course.id
    ).where(Course.instructor_id == instructor_id, Course.site_id == current_site.id, Enrollment.enrolled_at <= end_date)
    
    student_res = await session.exec(student_query)
    student_stats = student_res.first()
    
    # Top performing courses
    top_courses_query = select(
        Course.id, Course.title, Course.enrollment_count, Course.thumbnail_url,
        func.coalesce(func.avg(CourseReview.rating), 0).label("avg_rating"),
        func.count(CourseReview.id).label("review_count")
    ).outerjoin(
        CourseReview, and_(Course.id == CourseReview.course_id, CourseReview.is_published == True)
    ).where(
        Course.instructor_id == instructor_id, Course.status == 'published', Course.site_id == current_site.id
    ).group_by(Course.id).order_by(desc(Course.enrollment_count)).limit(5)
    
    top_courses_res = await session.exec(top_courses_query)
    top_courses = []
    for cid, title, count, thumb, rating, reviews in top_courses_res.all():
        top_courses.append({
            "id": cid, "title": title, "enrollment_count": count,
            "thumbnail_url": thumb, "avg_rating": float(rating), "review_count": reviews
        })
    
    return {
        "instructor_id": instructor_id,
        "instructor_name": f"{instructor.first_name} {instructor.last_name}",
        "period": {"start_date": start_date, "end_date": end_date},
        "courses": {
            "total_courses": int(course_stats.total_courses or 0),
            "published_courses": int(course_stats.published_courses or 0),
            "new_courses": int(course_stats.new_courses or 0),
            "total_enrollments": int(course_stats.total_enrollments or 0),
            "avg_enrollments_per_course": float(course_stats.avg_enrollments_per_course or 0)
        },
        "revenue": revenue_stats,
        "students": {
            "total_students": int(student_stats.total_students or 0),
            "completed_students": int(student_stats.completed_students or 0),
            "new_students": int(student_stats.new_students or 0)
        },
        "top_courses": top_courses
    }

@router.get("/revenue")
async def get_revenue_analytics(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    group_by: Optional[str] = Query("day"),
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """Get revenue analytics (Placeholder)"""
    return RevenueAnalytics(
        period={"start_date": start_date or datetime.utcnow(), "end_date": end_date or datetime.utcnow()},
        summary={"total_revenue": 0, "total_transactions": 0, "avg_transaction_value": 0, "courses_with_revenue": 0},
        revenue_over_time=[],
        revenue_by_course=[],
        revenue_by_instructor=[]
    )

@router.get("/engagement")
async def get_engagement_analytics(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Get user engagement analytics (Partial SQLModel)"""
    from models.user import User
    
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()
    
    # Daily active users
    dau_query = select(
        func.date(User.last_login_at).label("date"),
        func.count(func.distinct(User.id)).label("active_users")
    ).where(
        User.last_login_at.between(start_date, end_date),
        User.status == UserStatus.active,
        User.site_id == current_site.id
    ).group_by(func.date(User.last_login_at)).order_by("date")
    
    dau_res = await session.exec(dau_query)
    daily_active_users = [{"date": str(d), "active_users": u} for d, u in dau_res.all()]
    
    # Course engagement
    course_query = select(
        func.date(LessonProgress.updated_at).label("date"),
        func.count(func.distinct(LessonProgress.user_id)).label("engaged_users"),
        func.count(LessonProgress.id).label("lesson_interactions"),
        func.coalesce(func.avg(LessonProgress.time_spent), 0).label("avg_time_spent")
    ).where(
        LessonProgress.updated_at.between(start_date, end_date),
        LessonProgress.site_id == current_site.id
    ).group_by(func.date(LessonProgress.updated_at)).order_by("date")
    
    course_res = await session.exec(course_query)
    course_engagement = [{"date": str(d), "engaged_users": u, "lesson_interactions": i, "avg_time_spent": float(t)} for d, u, i, t in course_res.all()]
    
    return {
        "period": {"start_date": start_date, "end_date": end_date},
        "daily_active_users": daily_active_users,
        "course_engagement": course_engagement,
        "user_retention": [] # Logic too complex for simple migration, usually handled by BI
    }
