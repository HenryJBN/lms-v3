from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta

from database.connection import database
from models.schemas import (
    AnalyticsResponse, CourseAnalytics, UserAnalytics, RevenueAnalytics,
    PaginationParams, PaginatedResponse
)
from middleware.auth import get_current_active_user, require_instructor_or_admin, require_admin

router = APIRouter()

@router.get("/overview")
async def get_analytics_overview(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user = Depends(require_admin)
):
    """Get overall platform analytics"""
    
    # Set default date range (last 30 days)
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()
    
    # User analytics
    user_analytics_query = """
        SELECT 
            COUNT(*) as total_users,
            COUNT(CASE WHEN created_at >= :start_date THEN 1 END) as new_users,
            COUNT(CASE WHEN last_login_at >= :start_date THEN 1 END) as active_users,
            COUNT(CASE WHEN role = 'student' THEN 1 END) as total_students,
            COUNT(CASE WHEN role = 'instructor' THEN 1 END) as total_instructors
        FROM users 
        WHERE status = 'active' AND created_at <= :end_date
    """
    
    user_stats = await database.fetch_one(user_analytics_query, values={
        "start_date": start_date,
        "end_date": end_date
    })
    
    # Course analytics
    course_analytics_query = """
        SELECT 
            COUNT(*) as total_courses,
            COUNT(CASE WHEN created_at >= :start_date THEN 1 END) as new_courses,
            COUNT(CASE WHEN status = 'published' THEN 1 END) as published_courses,
            COALESCE(SUM(enrollment_count), 0) as total_enrollments,
            COALESCE(AVG(enrollment_count), 0) as avg_enrollments_per_course
        FROM courses 
        WHERE created_at <= :end_date
    """
    
    course_stats = await database.fetch_one(course_analytics_query, values={
        "start_date": start_date,
        "end_date": end_date
    })
    
    # Enrollment analytics
    enrollment_analytics_query = """
        SELECT 
            COUNT(*) as total_enrollments,
            COUNT(CASE WHEN enrolled_at >= :start_date THEN 1 END) as new_enrollments,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_enrollments,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_enrollments
        FROM course_enrollments 
        WHERE enrolled_at <= :end_date
    """
    
    enrollment_stats = await database.fetch_one(enrollment_analytics_query, values={
        "start_date": start_date,
        "end_date": end_date
    })
    
    # Revenue analytics
    revenue_analytics_query = """
        SELECT 
            COALESCE(SUM(amount), 0) as total_revenue,
            COALESCE(SUM(CASE WHEN created_at >= :start_date THEN amount ELSE 0 END), 0) as period_revenue,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
            COALESCE(AVG(amount), 0) as avg_transaction_value
        FROM revenue_records 
        WHERE created_at <= :end_date
    """
    
    revenue_stats = await database.fetch_one(revenue_analytics_query, values={
        "start_date": start_date,
        "end_date": end_date
    })
    
    # Certificate analytics
    certificate_analytics_query = """
        SELECT 
            COUNT(*) as total_certificates,
            COUNT(CASE WHEN issued_at >= :start_date THEN 1 END) as new_certificates,
            COUNT(CASE WHEN status = 'minted' THEN 1 END) as minted_certificates
        FROM certificates 
        WHERE issued_at <= :end_date
    """
    
    certificate_stats = await database.fetch_one(certificate_analytics_query, values={
        "start_date": start_date,
        "end_date": end_date
    })
    
    return {
        "period": {"start_date": start_date, "end_date": end_date},
        "users": dict(user_stats),
        "courses": dict(course_stats),
        "enrollments": dict(enrollment_stats),
        "revenue": dict(revenue_stats),
        "certificates": dict(certificate_stats)
    }

@router.get("/courses/{course_id}")
async def get_course_analytics(
    course_id: uuid.UUID,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user = Depends(require_instructor_or_admin)
):
    """Get analytics for a specific course"""
    
    # Check if user has access to course
    course_query = "SELECT * FROM courses WHERE id = :course_id"
    course = await database.fetch_one(course_query, values={"course_id": course_id})
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check permissions
    if (current_user.role != "admin" and 
        str(course.instructor_id) != str(current_user.id)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view course analytics"
        )
    
    # Set default date range
    if not start_date:
        start_date = course.created_at
    if not end_date:
        end_date = datetime.utcnow()
    
    # Enrollment analytics
    enrollment_query = """
        SELECT 
            COUNT(*) as total_enrollments,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completions,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_enrollments,
            COUNT(CASE WHEN status = 'dropped' THEN 1 END) as dropped_enrollments,
            COALESCE(AVG(progress_percentage), 0) as avg_progress
        FROM course_enrollments 
        WHERE course_id = :course_id 
        AND enrolled_at BETWEEN :start_date AND :end_date
    """
    
    enrollment_stats = await database.fetch_one(enrollment_query, values={
        "course_id": course_id,
        "start_date": start_date,
        "end_date": end_date
    })
    
    # Lesson engagement
    lesson_engagement_query = """
        SELECT 
            l.id, l.title, l.type,
            COUNT(lp.id) as total_views,
            COUNT(CASE WHEN lp.status = 'completed' THEN 1 END) as completions,
            COALESCE(AVG(lp.progress_percentage), 0) as avg_progress,
            COALESCE(AVG(lp.time_spent), 0) as avg_time_spent
        FROM lessons l
        LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id 
            AND lp.created_at BETWEEN :start_date AND :end_date
        WHERE l.course_id = :course_id AND l.is_published = true
        GROUP BY l.id, l.title, l.type, l.sort_order
        ORDER BY l.sort_order
    """
    
    lesson_stats = await database.fetch_all(lesson_engagement_query, values={
        "course_id": course_id,
        "start_date": start_date,
        "end_date": end_date
    })
    
    # Quiz performance
    quiz_performance_query = """
        SELECT 
            q.id, q.title,
            COUNT(qa.id) as total_attempts,
            COUNT(CASE WHEN qa.passed = true THEN 1 END) as passed_attempts,
            COALESCE(AVG(qa.score), 0) as avg_score,
            COUNT(DISTINCT qa.user_id) as unique_participants
        FROM quizzes q
        LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id 
            AND qa.completed_at BETWEEN :start_date AND :end_date
        WHERE q.course_id = :course_id AND q.is_published = true
        GROUP BY q.id, q.title
        ORDER BY q.created_at
    """
    
    quiz_stats = await database.fetch_all(quiz_performance_query, values={
        "course_id": course_id,
        "start_date": start_date,
        "end_date": end_date
    })
    
    # Revenue analytics
    revenue_query = """
        SELECT 
            COALESCE(SUM(amount), 0) as total_revenue,
            COUNT(*) as total_transactions,
            COALESCE(AVG(amount), 0) as avg_transaction_value
        FROM revenue_records 
        WHERE course_id = :course_id 
        AND created_at BETWEEN :start_date AND :end_date
        AND status = 'completed'
    """
    
    revenue_stats = await database.fetch_one(revenue_query, values={
        "course_id": course_id,
        "start_date": start_date,
        "end_date": end_date
    })
    
    # Student demographics
    demographics_query = """
        SELECT 
            up.country,
            up.age_range,
            COUNT(*) as count
        FROM course_enrollments ce
        JOIN user_profiles up ON ce.user_id = up.user_id
        WHERE ce.course_id = :course_id 
        AND ce.enrolled_at BETWEEN :start_date AND :end_date
        AND up.country IS NOT NULL
        GROUP BY up.country, up.age_range
        ORDER BY count DESC
    """
    
    demographics = await database.fetch_all(demographics_query, values={
        "course_id": course_id,
        "start_date": start_date,
        "end_date": end_date
    })
    
    return CourseAnalytics(
        course_id=course_id,
        course_title=course.title,
        period={"start_date": start_date, "end_date": end_date},
        enrollments=dict(enrollment_stats),
        lessons=[dict(lesson) for lesson in lesson_stats],
        quizzes=[dict(quiz) for quiz in quiz_stats],
        revenue=dict(revenue_stats),
        demographics=[dict(demo) for demo in demographics]
    )

@router.get("/instructors/{instructor_id}")
async def get_instructor_analytics(
    instructor_id: uuid.UUID,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user = Depends(require_instructor_or_admin)
):
    """Get analytics for an instructor"""
    
    # Check permissions
    if (current_user.role != "admin" and 
        str(current_user.id) != str(instructor_id)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view instructor analytics"
        )
    
    # Check if instructor exists
    instructor_query = "SELECT * FROM users WHERE id = :instructor_id AND role = 'instructor'"
    instructor = await database.fetch_one(instructor_query, values={"instructor_id": instructor_id})
    
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found"
        )
    
    # Set default date range
    if not start_date:
        start_date = instructor.created_at
    if not end_date:
        end_date = datetime.utcnow()
    
    # Course statistics
    course_stats_query = """
        SELECT 
            COUNT(*) as total_courses,
            COUNT(CASE WHEN status = 'published' THEN 1 END) as published_courses,
            COUNT(CASE WHEN created_at >= :start_date THEN 1 END) as new_courses,
            COALESCE(SUM(enrollment_count), 0) as total_enrollments,
            COALESCE(AVG(enrollment_count), 0) as avg_enrollments_per_course
        FROM courses 
        WHERE instructor_id = :instructor_id 
        AND created_at <= :end_date
    """
    
    course_stats = await database.fetch_one(course_stats_query, values={
        "instructor_id": instructor_id,
        "start_date": start_date,
        "end_date": end_date
    })
    
    # Revenue statistics
    revenue_stats_query = """
        SELECT 
            COALESCE(SUM(rr.amount), 0) as total_revenue,
            COALESCE(SUM(CASE WHEN rr.created_at >= :start_date THEN rr.amount ELSE 0 END), 0) as period_revenue,
            COUNT(CASE WHEN rr.status = 'completed' THEN 1 END) as completed_transactions
        FROM revenue_records rr
        JOIN courses c ON rr.course_id = c.id
        WHERE c.instructor_id = :instructor_id 
        AND rr.created_at <= :end_date
    """
    
    revenue_stats = await database.fetch_one(revenue_stats_query, values={
        "instructor_id": instructor_id,
        "start_date": start_date,
        "end_date": end_date
    })
    
    # Student statistics
    student_stats_query = """
        SELECT 
            COUNT(DISTINCT ce.user_id) as total_students,
            COUNT(CASE WHEN ce.status = 'completed' THEN 1 END) as completed_students,
            COUNT(CASE WHEN ce.enrolled_at >= :start_date THEN 1 END) as new_students
        FROM course_enrollments ce
        JOIN courses c ON ce.course_id = c.id
        WHERE c.instructor_id = :instructor_id 
        AND ce.enrolled_at <= :end_date
    """
    
    student_stats = await database.fetch_one(student_stats_query, values={
        "instructor_id": instructor_id,
        "start_date": start_date,
        "end_date": end_date
    })
    
    # Top performing courses
    top_courses_query = """
        SELECT 
            c.id, c.title, c.enrollment_count, c.thumbnail_url,
            COALESCE(AVG(cr.rating), 0) as avg_rating,
            COUNT(cr.id) as review_count
        FROM courses c
        LEFT JOIN course_reviews cr ON c.id = cr.course_id AND cr.is_published = true
        WHERE c.instructor_id = :instructor_id AND c.status = 'published'
        GROUP BY c.id, c.title, c.enrollment_count, c.thumbnail_url
        ORDER BY c.enrollment_count DESC
        LIMIT 5
    """
    
    top_courses = await database.fetch_all(top_courses_query, values={"instructor_id": instructor_id})
    
    return {
        "instructor_id": instructor_id,
        "instructor_name": f"{instructor.first_name} {instructor.last_name}",
        "period": {"start_date": start_date, "end_date": end_date},
        "courses": dict(course_stats),
        "revenue": dict(revenue_stats),
        "students": dict(student_stats),
        "top_courses": [dict(course) for course in top_courses]
    }

@router.get("/revenue")
async def get_revenue_analytics(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    group_by: Optional[str] = Query("day"),
    current_user = Depends(require_admin)
):
    """Get revenue analytics"""
    
    # Set default date range
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()
    
    # Validate group_by parameter
    if group_by not in ["day", "week", "month"]:
        group_by = "day"
    
    # Revenue over time
    if group_by == "day":
        date_trunc = "DATE(created_at)"
    elif group_by == "week":
        date_trunc = "DATE_TRUNC('week', created_at)"
    else:  # month
        date_trunc = "DATE_TRUNC('month', created_at)"
    
    revenue_over_time_query = f"""
        SELECT 
            {date_trunc} as period,
            COALESCE(SUM(amount), 0) as revenue,
            COUNT(*) as transactions
        FROM revenue_records 
        WHERE created_at BETWEEN :start_date AND :end_date
        AND status = 'completed'
        GROUP BY {date_trunc}
        ORDER BY period
    """
    
    revenue_over_time = await database.fetch_all(revenue_over_time_query, values={
        "start_date": start_date,
        "end_date": end_date
    })
    
    # Revenue by course
    revenue_by_course_query = """
        SELECT 
            c.id, c.title,
            COALESCE(SUM(rr.amount), 0) as revenue,
            COUNT(rr.id) as transactions
        FROM courses c
        LEFT JOIN revenue_records rr ON c.id = rr.course_id 
            AND rr.created_at BETWEEN :start_date AND :end_date
            AND rr.status = 'completed'
        WHERE c.status = 'published'
        GROUP BY c.id, c.title
        HAVING SUM(rr.amount) > 0
        ORDER BY revenue DESC
        LIMIT 10
    """
    
    revenue_by_course = await database.fetch_all(revenue_by_course_query, values={
        "start_date": start_date,
        "end_date": end_date
    })
    
    # Revenue by instructor
    revenue_by_instructor_query = """
        SELECT 
            u.id, u.first_name, u.last_name,
            COALESCE(SUM(rr.amount), 0) as revenue,
            COUNT(rr.id) as transactions
        FROM users u
        JOIN courses c ON u.id = c.instructor_id
        LEFT JOIN revenue_records rr ON c.id = rr.course_id 
            AND rr.created_at BETWEEN :start_date AND :end_date
            AND rr.status = 'completed'
        WHERE u.role = 'instructor'
        GROUP BY u.id, u.first_name, u.last_name
        HAVING SUM(rr.amount) > 0
        ORDER BY revenue DESC
        LIMIT 10
    """
    
    revenue_by_instructor = await database.fetch_all(revenue_by_instructor_query, values={
        "start_date": start_date,
        "end_date": end_date
    })
    
    # Total revenue summary
    total_revenue_query = """
        SELECT 
            COALESCE(SUM(amount), 0) as total_revenue,
            COUNT(*) as total_transactions,
            COALESCE(AVG(amount), 0) as avg_transaction_value,
            COUNT(DISTINCT course_id) as courses_with_revenue
        FROM revenue_records 
        WHERE created_at BETWEEN :start_date AND :end_date
        AND status = 'completed'
    """
    
    total_revenue = await database.fetch_one(total_revenue_query, values={
        "start_date": start_date,
        "end_date": end_date
    })
    
    return RevenueAnalytics(
        period={"start_date": start_date, "end_date": end_date},
        summary=dict(total_revenue),
        revenue_over_time=[dict(item) for item in revenue_over_time],
        revenue_by_course=[dict(item) for item in revenue_by_course],
        revenue_by_instructor=[dict(item) for item in revenue_by_instructor]
    )

@router.get("/engagement")
async def get_engagement_analytics(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user = Depends(require_admin)
):
    """Get user engagement analytics"""
    
    # Set default date range
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()
    
    # Daily active users
    dau_query = """
        SELECT 
            DATE(last_login_at) as date,
            COUNT(DISTINCT id) as active_users
        FROM users 
        WHERE last_login_at BETWEEN :start_date AND :end_date
        AND status = 'active'
        GROUP BY DATE(last_login_at)
        ORDER BY date
    """
    
    daily_active_users = await database.fetch_all(dau_query, values={
        "start_date": start_date,
        "end_date": end_date
    })
    
    # Course engagement
    course_engagement_query = """
        SELECT 
            DATE(lp.updated_at) as date,
            COUNT(DISTINCT lp.user_id) as engaged_users,
            COUNT(lp.id) as lesson_interactions,
            COALESCE(AVG(lp.time_spent), 0) as avg_time_spent
        FROM lesson_progress lp
        WHERE lp.updated_at BETWEEN :start_date AND :end_date
        GROUP BY DATE(lp.updated_at)
        ORDER BY date
    """
    
    course_engagement = await database.fetch_all(course_engagement_query, values={
        "start_date": start_date,
        "end_date": end_date
    })
    
    # User retention
    retention_query = """
        WITH user_cohorts AS (
            SELECT 
                u.id,
                DATE_TRUNC('month', u.created_at) as cohort_month,
                DATE_TRUNC('month', u.last_login_at) as login_month
            FROM users u
            WHERE u.created_at >= :start_date - INTERVAL '6 months'
            AND u.status = 'active'
        )
        SELECT 
            cohort_month,
            COUNT(DISTINCT id) as cohort_size,
            COUNT(DISTINCT CASE WHEN login_month = cohort_month THEN id END) as month_0,
            COUNT(DISTINCT CASE WHEN login_month = cohort_month + INTERVAL '1 month' THEN id END) as month_1,
            COUNT(DISTINCT CASE WHEN login_month = cohort_month + INTERVAL '2 months' THEN id END) as month_2,
            COUNT(DISTINCT CASE WHEN login_month = cohort_month + INTERVAL '3 months' THEN id END) as month_3
        FROM user_cohorts
        GROUP BY cohort_month
        ORDER BY cohort_month
    """
    
    retention_data = await database.fetch_all(retention_query, values={
        "start_date": start_date
    })
    
    return {
        "period": {"start_date": start_date, "end_date": end_date},
        "daily_active_users": [dict(item) for item in daily_active_users],
        "course_engagement": [dict(item) for item in course_engagement],
        "user_retention": [dict(item) for item in retention_data]
    }
