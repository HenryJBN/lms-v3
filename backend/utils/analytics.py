from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import uuid
from database.connection import database

class AnalyticsCalculator:
    """Utility class for analytics calculations"""
    
    @staticmethod
    def calculate_completion_rate(completed: int, total: int) -> float:
        """Calculate completion rate as percentage"""
        if total == 0:
            return 0.0
        return round((completed / total) * 100, 2)
    
    @staticmethod
    def calculate_growth_rate(current: float, previous: float) -> float:
        """Calculate growth rate as percentage"""
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return round(((current - previous) / previous) * 100, 2)
    
    @staticmethod
    def calculate_retention_rate(retained: int, total: int) -> float:
        """Calculate retention rate as percentage"""
        if total == 0:
            return 0.0
        return round((retained / total) * 100, 2)
    
    @staticmethod
    def calculate_churn_rate(churned: int, total: int) -> float:
        """Calculate churn rate as percentage"""
        if total == 0:
            return 0.0
        return round((churned / total) * 100, 2)
    
    @staticmethod
    def calculate_average_session_duration(total_time: int, sessions: int) -> float:
        """Calculate average session duration in minutes"""
        if sessions == 0:
            return 0.0
        return round(total_time / sessions / 60, 2)  # Convert seconds to minutes

class DateRangeHelper:
    """Helper class for date range operations"""
    
    @staticmethod
    def get_date_range_periods(start_date: datetime, end_date: datetime, period: str) -> List[datetime]:
        """Generate date periods for analytics grouping"""
        periods = []
        current = start_date
        
        if period == "day":
            while current <= end_date:
                periods.append(current.replace(hour=0, minute=0, second=0, microsecond=0))
                current += timedelta(days=1)
        elif period == "week":
            # Start from beginning of week
            current = current - timedelta(days=current.weekday())
            while current <= end_date:
                periods.append(current.replace(hour=0, minute=0, second=0, microsecond=0))
                current += timedelta(weeks=1)
        elif period == "month":
            # Start from beginning of month
            current = current.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            while current <= end_date:
                periods.append(current)
                # Move to next month
                if current.month == 12:
                    current = current.replace(year=current.year + 1, month=1)
                else:
                    current = current.replace(month=current.month + 1)
        
        return periods
    
    @staticmethod
    def get_previous_period(start_date: datetime, end_date: datetime) -> Tuple[datetime, datetime]:
        """Get the previous period for comparison"""
        duration = end_date - start_date
        previous_end = start_date - timedelta(seconds=1)
        previous_start = previous_end - duration
        return previous_start, previous_end
    
    @staticmethod
    def get_cohort_periods(cohort_start: datetime, analysis_date: datetime) -> int:
        """Calculate number of periods since cohort start"""
        return (analysis_date.year - cohort_start.year) * 12 + (analysis_date.month - cohort_start.month)

class UserAnalytics:
    """User-specific analytics utilities"""
    
    @staticmethod
    async def get_user_engagement_score(user_id: uuid.UUID, days: int = 30) -> Dict[str, Any]:
        """Calculate user engagement score based on various activities"""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Login frequency
        login_query = """
            SELECT COUNT(*) as login_count
            FROM user_sessions 
            WHERE user_id = :user_id 
            AND created_at BETWEEN :start_date AND :end_date
        """
        login_data = await database.fetch_one(login_query, values={
            "user_id": user_id,
            "start_date": start_date,
            "end_date": end_date
        })
        
        # Course activity
        activity_query = """
            SELECT 
                COUNT(DISTINCT lp.lesson_id) as lessons_accessed,
                COALESCE(SUM(lp.time_spent), 0) as total_time_spent,
                COUNT(CASE WHEN lp.status = 'completed' THEN 1 END) as lessons_completed
            FROM lesson_progress lp
            WHERE lp.user_id = :user_id 
            AND lp.updated_at BETWEEN :start_date AND :end_date
        """
        activity_data = await database.fetch_one(activity_query, values={
            "user_id": user_id,
            "start_date": start_date,
            "end_date": end_date
        })
        
        # Quiz attempts
        quiz_query = """
            SELECT COUNT(*) as quiz_attempts
            FROM quiz_attempts 
            WHERE user_id = :user_id 
            AND completed_at BETWEEN :start_date AND :end_date
        """
        quiz_data = await database.fetch_one(quiz_query, values={
            "user_id": user_id,
            "start_date": start_date,
            "end_date": end_date
        })
        
        # Calculate engagement score (0-100)
        login_score = min(login_data.login_count * 5, 25)  # Max 25 points
        lesson_score = min(activity_data.lessons_accessed * 2, 30)  # Max 30 points
        completion_score = min(activity_data.lessons_completed * 3, 25)  # Max 25 points
        quiz_score = min(quiz_data.quiz_attempts * 4, 20)  # Max 20 points
        
        total_score = login_score + lesson_score + completion_score + quiz_score
        
        return {
            "engagement_score": total_score,
            "login_frequency": login_data.login_count,
            "lessons_accessed": activity_data.lessons_accessed,
            "lessons_completed": activity_data.lessons_completed,
            "total_time_spent": activity_data.total_time_spent,
            "quiz_attempts": quiz_data.quiz_attempts,
            "score_breakdown": {
                "login_score": login_score,
                "lesson_score": lesson_score,
                "completion_score": completion_score,
                "quiz_score": quiz_score
            }
        }
    
    @staticmethod
    async def get_learning_path_analytics(user_id: uuid.UUID) -> Dict[str, Any]:
        """Get user's learning path progress and recommendations"""
        
        # Current enrollments and progress
        enrollment_query = """
            SELECT 
                c.id, c.title, c.category, c.difficulty_level,
                ce.progress_percentage, ce.status, ce.enrolled_at,
                COUNT(l.id) as total_lessons,
                COUNT(CASE WHEN lp.status = 'completed' THEN 1 END) as completed_lessons
            FROM course_enrollments ce
            JOIN courses c ON ce.course_id = c.id
            LEFT JOIN lessons l ON c.id = l.course_id AND l.is_published = true
            LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = ce.user_id
            WHERE ce.user_id = :user_id AND ce.status IN ('active', 'completed')
            GROUP BY c.id, c.title, c.category, c.difficulty_level, ce.progress_percentage, ce.status, ce.enrolled_at
            ORDER BY ce.enrolled_at DESC
        """
        
        enrollments = await database.fetch_all(enrollment_query, values={"user_id": user_id})
        
        # Skill progression
        skill_query = """
            SELECT 
                c.category,
                COUNT(CASE WHEN ce.status = 'completed' THEN 1 END) as completed_courses,
                COUNT(*) as total_enrolled,
                COALESCE(AVG(ce.progress_percentage), 0) as avg_progress
            FROM course_enrollments ce
            JOIN courses c ON ce.course_id = c.id
            WHERE ce.user_id = :user_id
            GROUP BY c.category
        """
        
        skills = await database.fetch_all(skill_query, values={"user_id": user_id})
        
        return {
            "enrollments": [dict(enrollment) for enrollment in enrollments],
            "skill_progression": [dict(skill) for skill in skills],
            "total_courses": len(enrollments),
            "completed_courses": len([e for e in enrollments if e.status == 'completed']),
            "average_progress": sum(e.progress_percentage for e in enrollments) / len(enrollments) if enrollments else 0
        }

class CourseAnalytics:
    """Course-specific analytics utilities"""
    
    @staticmethod
    async def calculate_course_health_score(course_id: uuid.UUID) -> Dict[str, Any]:
        """Calculate overall course health score"""
        
        # Enrollment metrics
        enrollment_query = """
            SELECT 
                COUNT(*) as total_enrollments,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completions,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_enrollments,
                COUNT(CASE WHEN status = 'dropped' THEN 1 END) as dropouts,
                COALESCE(AVG(progress_percentage), 0) as avg_progress
            FROM course_enrollments 
            WHERE course_id = :course_id
        """
        
        enrollment_data = await database.fetch_one(enrollment_query, values={"course_id": course_id})
        
        # Review metrics
        review_query = """
            SELECT 
                COUNT(*) as total_reviews,
                COALESCE(AVG(rating), 0) as avg_rating,
                COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_reviews
            FROM course_reviews 
            WHERE course_id = :course_id AND is_published = true
        """
        
        review_data = await database.fetch_one(review_query, values={"course_id": course_id})
        
        # Engagement metrics
        engagement_query = """
            SELECT 
                COUNT(DISTINCT lp.user_id) as engaged_users,
                COALESCE(AVG(lp.time_spent), 0) as avg_time_per_lesson,
                COUNT(CASE WHEN lp.status = 'completed' THEN 1 END) as lesson_completions
            FROM lessons l
            LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id
            WHERE l.course_id = :course_id AND l.is_published = true
        """
        
        engagement_data = await database.fetch_one(engagement_query, values={"course_id": course_id})
        
        # Calculate health score components
        completion_rate = AnalyticsCalculator.calculate_completion_rate(
            enrollment_data.completions, enrollment_data.total_enrollments
        )
        
        dropout_rate = AnalyticsCalculator.calculate_churn_rate(
            enrollment_data.dropouts, enrollment_data.total_enrollments
        )
        
        rating_score = (review_data.avg_rating / 5) * 100 if review_data.avg_rating else 0
        
        engagement_score = min(engagement_data.avg_time_per_lesson / 300 * 100, 100)  # 5 minutes = 100%
        
        # Overall health score (weighted average)
        health_score = (
            completion_rate * 0.3 +
            (100 - dropout_rate) * 0.2 +
            rating_score * 0.3 +
            engagement_score * 0.2
        )
        
        return {
            "health_score": round(health_score, 2),
            "completion_rate": completion_rate,
            "dropout_rate": dropout_rate,
            "average_rating": review_data.avg_rating,
            "engagement_score": round(engagement_score, 2),
            "metrics": {
                "total_enrollments": enrollment_data.total_enrollments,
                "active_enrollments": enrollment_data.active_enrollments,
                "total_reviews": review_data.total_reviews,
                "engaged_users": engagement_data.engaged_users
            }
        }
    
    @staticmethod
    async def get_lesson_performance_analytics(course_id: uuid.UUID) -> List[Dict[str, Any]]:
        """Get performance analytics for all lessons in a course"""
        
        query = """
            SELECT 
                l.id, l.title, l.type, l.sort_order,
                COUNT(lp.id) as total_views,
                COUNT(CASE WHEN lp.status = 'completed' THEN 1 END) as completions,
                COUNT(CASE WHEN lp.status = 'in_progress' THEN 1 END) as in_progress,
                COALESCE(AVG(lp.progress_percentage), 0) as avg_progress,
                COALESCE(AVG(lp.time_spent), 0) as avg_time_spent,
                COALESCE(MIN(lp.time_spent), 0) as min_time_spent,
                COALESCE(MAX(lp.time_spent), 0) as max_time_spent
            FROM lessons l
            LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id
            WHERE l.course_id = :course_id AND l.is_published = true
            GROUP BY l.id, l.title, l.type, l.sort_order
            ORDER BY l.sort_order
        """
        
        lessons = await database.fetch_all(query, values={"course_id": course_id})
        
        result = []
        for lesson in lessons:
            completion_rate = AnalyticsCalculator.calculate_completion_rate(
                lesson.completions, lesson.total_views
            ) if lesson.total_views > 0 else 0
            
            result.append({
                "lesson_id": lesson.id,
                "title": lesson.title,
                "type": lesson.type,
                "sort_order": lesson.sort_order,
                "total_views": lesson.total_views,
                "completions": lesson.completions,
                "completion_rate": completion_rate,
                "avg_progress": round(lesson.avg_progress, 2),
                "avg_time_spent": round(lesson.avg_time_spent, 2),
                "time_range": {
                    "min": lesson.min_time_spent,
                    "max": lesson.max_time_spent,
                    "avg": round(lesson.avg_time_spent, 2)
                }
            })
        
        return result

class RevenueAnalytics:
    """Revenue-specific analytics utilities"""
    
    @staticmethod
    async def calculate_revenue_metrics(
        start_date: datetime, 
        end_date: datetime,
        course_id: Optional[uuid.UUID] = None
    ) -> Dict[str, Any]:
        """Calculate comprehensive revenue metrics"""
        
        base_query = """
            SELECT 
                COALESCE(SUM(amount), 0) as total_revenue,
                COUNT(*) as total_transactions,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_transactions,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
                COALESCE(AVG(amount), 0) as avg_transaction_value,
                COALESCE(MIN(amount), 0) as min_transaction_value,
                COALESCE(MAX(amount), 0) as max_transaction_value
            FROM revenue_records 
            WHERE created_at BETWEEN :start_date AND :end_date
        """
        
        values = {"start_date": start_date, "end_date": end_date}
        
        if course_id:
            base_query += " AND course_id = :course_id"
            values["course_id"] = course_id
        
        revenue_data = await database.fetch_one(base_query, values=values)
        
        # Calculate success rate
        success_rate = AnalyticsCalculator.calculate_completion_rate(
            revenue_data.successful_transactions, revenue_data.total_transactions
        )
        
        # Get previous period for comparison
        previous_start, previous_end = DateRangeHelper.get_previous_period(start_date, end_date)
        
        previous_query = base_query.replace(
            "BETWEEN :start_date AND :end_date",
            "BETWEEN :previous_start AND :previous_end"
        )
        
        previous_values = dict(values)
        previous_values.update({
            "previous_start": previous_start,
            "previous_end": previous_end
        })
        previous_values.pop("start_date", None)
        previous_values.pop("end_date", None)
        
        previous_data = await database.fetch_one(previous_query, values=previous_values)
        
        # Calculate growth rate
        revenue_growth = AnalyticsCalculator.calculate_growth_rate(
            revenue_data.total_revenue, previous_data.total_revenue
        )
        
        return {
            "current_period": {
                "total_revenue": revenue_data.total_revenue,
                "total_transactions": revenue_data.total_transactions,
                "successful_transactions": revenue_data.successful_transactions,
                "success_rate": success_rate,
                "avg_transaction_value": round(revenue_data.avg_transaction_value, 2)
            },
            "previous_period": {
                "total_revenue": previous_data.total_revenue,
                "total_transactions": previous_data.total_transactions
            },
            "growth": {
                "revenue_growth": revenue_growth,
                "transaction_growth": AnalyticsCalculator.calculate_growth_rate(
                    revenue_data.total_transactions, previous_data.total_transactions
                )
            },
            "transaction_range": {
                "min": revenue_data.min_transaction_value,
                "max": revenue_data.max_transaction_value,
                "avg": round(revenue_data.avg_transaction_value, 2)
            }
        }

class CohortAnalytics:
    """Cohort analysis utilities"""
    
    @staticmethod
    async def calculate_user_retention_cohorts(months_back: int = 12) -> List[Dict[str, Any]]:
        """Calculate user retention by monthly cohorts"""
        
        query = """
            WITH monthly_cohorts AS (
                SELECT 
                    u.id as user_id,
                    DATE_TRUNC('month', u.created_at) as cohort_month,
                    DATE_TRUNC('month', s.created_at) as activity_month
                FROM users u
                LEFT JOIN user_sessions s ON u.id = s.user_id
                WHERE u.created_at >= CURRENT_DATE - INTERVAL '%s months'
                AND u.status = 'active'
            ),
            cohort_data AS (
                SELECT 
                    cohort_month,
                    COUNT(DISTINCT user_id) as cohort_size,
                    activity_month,
                    COUNT(DISTINCT CASE WHEN activity_month IS NOT NULL THEN user_id END) as active_users,
                    EXTRACT(MONTH FROM AGE(activity_month, cohort_month)) as period_number
                FROM monthly_cohorts
                GROUP BY cohort_month, activity_month
            )
            SELECT 
                cohort_month,
                cohort_size,
                period_number,
                active_users,
                CASE 
                    WHEN cohort_size > 0 THEN ROUND((active_users::float / cohort_size) * 100, 2)
                    ELSE 0 
                END as retention_rate
            FROM cohort_data
            WHERE period_number IS NOT NULL AND period_number >= 0
            ORDER BY cohort_month, period_number
        """ % months_back
        
        cohort_data = await database.fetch_all(query)
        
        # Group by cohort month
        cohorts = {}
        for row in cohort_data:
            cohort_key = row.cohort_month.strftime('%Y-%m')
            if cohort_key not in cohorts:
                cohorts[cohort_key] = {
                    "cohort_month": cohort_key,
                    "cohort_size": row.cohort_size,
                    "retention_by_period": {}
                }
            
            cohorts[cohort_key]["retention_by_period"][int(row.period_number)] = {
                "active_users": row.active_users,
                "retention_rate": row.retention_rate
            }
        
        return list(cohorts.values())

# Utility functions for common analytics operations
async def get_top_performing_content(
    content_type: str, 
    metric: str = "enrollments", 
    limit: int = 10,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> List[Dict[str, Any]]:
    """Get top performing content by various metrics"""
    
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    if content_type == "courses":
        if metric == "enrollments":
            query = """
                SELECT 
                    c.id, c.title, c.thumbnail_url,
                    COUNT(ce.id) as metric_value,
                    COALESCE(AVG(cr.rating), 0) as avg_rating
                FROM courses c
                LEFT JOIN course_enrollments ce ON c.id = ce.course_id 
                    AND ce.enrolled_at BETWEEN :start_date AND :end_date
                LEFT JOIN course_reviews cr ON c.id = cr.course_id AND cr.is_published = true
                WHERE c.status = 'published'
                GROUP BY c.id, c.title, c.thumbnail_url
                ORDER BY metric_value DESC
                LIMIT :limit
            """
        elif metric == "revenue":
            query = """
                SELECT 
                    c.id, c.title, c.thumbnail_url,
                    COALESCE(SUM(rr.amount), 0) as metric_value,
                    COALESCE(AVG(cr.rating), 0) as avg_rating
                FROM courses c
                LEFT JOIN revenue_records rr ON c.id = rr.course_id 
                    AND rr.created_at BETWEEN :start_date AND :end_date
                    AND rr.status = 'completed'
                LEFT JOIN course_reviews cr ON c.id = cr.course_id AND cr.is_published = true
                WHERE c.status = 'published'
                GROUP BY c.id, c.title, c.thumbnail_url
                ORDER BY metric_value DESC
                LIMIT :limit
            """
        else:  # completion_rate
            query = """
                SELECT 
                    c.id, c.title, c.thumbnail_url,
                    CASE 
                        WHEN COUNT(ce.id) > 0 THEN 
                            ROUND((COUNT(CASE WHEN ce.status = 'completed' THEN 1 END)::float / COUNT(ce.id)) * 100, 2)
                        ELSE 0 
                    END as metric_value,
                    COALESCE(AVG(cr.rating), 0) as avg_rating
                FROM courses c
                LEFT JOIN course_enrollments ce ON c.id = ce.course_id 
                    AND ce.enrolled_at BETWEEN :start_date AND :end_date
                LEFT JOIN course_reviews cr ON c.id = cr.course_id AND cr.is_published = true
                WHERE c.status = 'published'
                GROUP BY c.id, c.title, c.thumbnail_url
                HAVING COUNT(ce.id) > 0
                ORDER BY metric_value DESC
                LIMIT :limit
            """
    
    results = await database.fetch_all(query, values={
        "start_date": start_date,
        "end_date": end_date,
        "limit": limit
    })
    
    return [dict(result) for result in results]

async def get_platform_kpis(
    start_date: datetime, 
    end_date: datetime
) -> Dict[str, Any]:
    """Get key platform KPIs for dashboard"""
    
    # User KPIs
    user_kpis_query = """
        SELECT 
            COUNT(*) as total_users,
            COUNT(CASE WHEN created_at BETWEEN :start_date AND :end_date THEN 1 END) as new_users,
            COUNT(CASE WHEN last_login_at BETWEEN :start_date AND :end_date THEN 1 END) as active_users,
            COUNT(CASE WHEN role = 'student' THEN 1 END) as total_students,
            COUNT(CASE WHEN role = 'instructor' THEN 1 END) as total_instructors
        FROM users 
        WHERE status = 'active'
    """
    
    user_kpis = await database.fetch_one(user_kpis_query, values={
        "start_date": start_date,
        "end_date": end_date
    })
    
    # Course KPIs
    course_kpis_query = """
        SELECT 
            COUNT(*) as total_courses,
            COUNT(CASE WHEN status = 'published' THEN 1 END) as published_courses,
            COALESCE(SUM(enrollment_count), 0) as total_enrollments,
            COUNT(CASE WHEN created_at BETWEEN :start_date AND :end_date THEN 1 END) as new_courses
        FROM courses
    """
    
    course_kpis = await database.fetch_one(course_kpis_query, values={
        "start_date": start_date,
        "end_date": end_date
    })
    
    # Revenue KPIs
    revenue_kpis_query = """
        SELECT 
            COALESCE(SUM(amount), 0) as total_revenue,
            COUNT(*) as total_transactions,
            COALESCE(AVG(amount), 0) as avg_transaction_value
        FROM revenue_records 
        WHERE created_at BETWEEN :start_date AND :end_date
        AND status = 'completed'
    """
    
    revenue_kpis = await database.fetch_one(revenue_kpis_query, values={
        "start_date": start_date,
        "end_date": end_date
    })
    
    # Engagement KPIs
    engagement_kpis_query = """
        SELECT 
            COUNT(DISTINCT user_id) as engaged_users,
            COALESCE(SUM(time_spent), 0) as total_learning_time,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as lesson_completions
        FROM lesson_progress 
        WHERE updated_at BETWEEN :start_date AND :end_date
    """
    
    engagement_kpis = await database.fetch_one(engagement_kpis_query, values={
        "start_date": start_date,
        "end_date": end_date
    })
    
    return {
        "users": dict(user_kpis),
        "courses": dict(course_kpis),
        "revenue": dict(revenue_kpis),
        "engagement": dict(engagement_kpis)
    }
