import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from sqlmodel import select, func, or_, and_, desc, col
from sqlalchemy.ext.asyncio import AsyncSession
from models.user import User, UserProfile
from models.course import Course, Category, Section, CourseReview
from models.lesson import Lesson, QuizAttempt
from models.enrollment import Enrollment, Certificate, LessonProgress
from models.finance import RevenueRecord
from models.gamification import TokenBalance
from models.system import AdminAuditLog

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
    async def get_user_engagement_score(session: AsyncSession, user_id: uuid.UUID, days: int = 30) -> Dict[str, Any]:
        """Calculate user engagement score based on various activities"""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # NOTE: user_sessions table seems to be missing from models, 
        # but let's assume it might be added or we use active logins instead.
        # For now, let's use what we have or placeholder.
        # Actually, let's check if User model has last_login_at
        
        # 1. Login frequency (Placeholder or using User.last_login_at if applicable)
        # Assuming a dedicated sessions table for better tracking
        # For simplicity in migration, if model is missing, we might need a workaround.
        # Let's check lesson progress and quiz attempts as proxies for engagement if sessions is missing.
        
        # Course activity
        activity_query = select(
            func.count(func.distinct(LessonProgress.lesson_id)).label("lessons_accessed"),
            func.coalesce(func.sum(LessonProgress.time_spent), 0).label("total_time_spent"),
            func.count(col(LessonProgress.id)).where(LessonProgress.status == 'completed').label("lessons_completed")
        ).where(
            LessonProgress.user_id == user_id,
            LessonProgress.updated_at >= start_date
        )
        activity_res = await session.exec(activity_query)
        activity_data = activity_res.first()
        
        # Quiz attempts
        quiz_query = select(func.count(QuizAttempt.id)).where(
            QuizAttempt.user_id == user_id,
            QuizAttempt.completed_at >= start_date
        )
        quiz_attempts = (await session.exec(quiz_query)).one()
        
        # Calculate engagement score (0-100)
        # Adjusted weights since login_count is missing (using lessons_accessed as proxy)
        lesson_access_score = min(activity_data.lessons_accessed * 5, 40)
        completion_score = min(activity_data.lessons_completed * 4, 30)
        quiz_score = min(quiz_attempts * 6, 30)
        
        total_score = lesson_access_score + completion_score + quiz_score
        
        return {
            "engagement_score": total_score,
            "lessons_accessed": activity_data.lessons_accessed,
            "lessons_completed": activity_data.lessons_completed,
            "total_time_spent": activity_data.total_time_spent,
            "quiz_attempts": quiz_attempts,
            "score_breakdown": {
                "lesson_access_score": lesson_access_score,
                "completion_score": completion_score,
                "quiz_score": quiz_score
            }
        }
    
    @staticmethod
    async def get_learning_path_analytics(session: AsyncSession, user_id: uuid.UUID) -> Dict[str, Any]:
        """Get user's learning path progress and recommendations"""
        
        # Current enrollments and progress
        query = select(
            Course,
            Enrollment.progress_percentage,
            Enrollment.status,
            Enrollment.enrolled_at,
            func.count(Lesson.id).label("total_lessons"),
            func.count(col(LessonProgress.id)).where(LessonProgress.status == 'completed').label("completed_lessons")
        ).join(
            Enrollment, Enrollment.course_id == Course.id
        ).outerjoin(
            Lesson, and_(Lesson.course_id == Course.id, Lesson.is_published == True)
        ).outerjoin(
            LessonProgress, and_(LessonProgress.lesson_id == Lesson.id, LessonProgress.user_id == user_id)
        ).where(
            Enrollment.user_id == user_id,
            Enrollment.status.in_(['active', 'completed'])
        ).group_by(
            Course.id, Enrollment.id
        ).order_by(desc(Enrollment.enrolled_at))
        
        results = await session.exec(query)
        
        enrollments_list = []
        for course, progress, status, enrolled_at, total_l, comp_l in results.all():
            enrollments_list.append({
                "id": course.id,
                "title": course.title,
                "category_id": course.category_id,
                "difficulty_level": course.level,
                "progress_percentage": progress,
                "status": status,
                "enrolled_at": enrolled_at,
                "total_lessons": total_l,
                "completed_lessons": comp_l
            })
            
        # Skill progression
        skill_query = select(
            Category.name,
            func.count(col(Enrollment.id)).where(Enrollment.status == 'completed').label("completed_courses"),
            func.count(Enrollment.id).label("total_enrolled"),
            func.coalesce(func.avg(Enrollment.progress_percentage), 0).label("avg_progress")
        ).join(
            Course, Enrollment.course_id == Course.id
        ).join(
            Category, Course.category_id == Category.id
        ).where(
            Enrollment.user_id == user_id
        ).group_by(Category.name)
        
        skill_res = await session.exec(skill_query)
        skills_list = [dict(zip(["category", "completed_courses", "total_enrolled", "avg_progress"], row)) for row in skill_res.all()]
        
        return {
            "enrollments": enrollments_list,
            "skill_progression": skills_list,
            "total_courses": len(enrollments_list),
            "completed_courses": len([e for e in enrollments_list if e["status"] == 'completed']),
            "average_progress": sum(e["progress_percentage"] for e in enrollments_list) / len(enrollments_list) if enrollments_list else 0
        }

class CourseAnalytics:
    """Course-specific analytics utilities"""
    
    @staticmethod
    async def calculate_course_health_score(session: AsyncSession, course_id: uuid.UUID) -> Dict[str, Any]:
        """Calculate overall course health score"""
        
        # Enrollment metrics
        enrollment_query = select(
            func.count(Enrollment.id).label("total_enrollments"),
            func.count(col(Enrollment.id)).where(Enrollment.status == 'completed').label("completions"),
            func.count(col(Enrollment.id)).where(Enrollment.status == 'active').label("active_enrollments"),
            func.count(col(Enrollment.id)).where(Enrollment.status == 'dropped').label("dropouts"),
            func.coalesce(func.avg(Enrollment.progress_percentage), 0).label("avg_progress")
        ).where(Enrollment.course_id == course_id)
        
        enroll_res = await session.exec(enrollment_query)
        enrollment_data = enroll_res.first()
        
        # Review metrics
        review_query = select(
            func.count(CourseReview.id).label("total_reviews"),
            func.coalesce(func.avg(CourseReview.rating), 0).label("avg_rating"),
            func.count(col(CourseReview.id)).where(CourseReview.rating >= 4).label("positive_reviews")
        ).where(CourseReview.course_id == course_id, CourseReview.is_published == True)
        
        rev_res = await session.exec(review_query)
        review_data = rev_res.first()
        
        # Engagement metrics
        engagement_query = select(
            func.count(func.distinct(LessonProgress.user_id)).label("engaged_users"),
            func.coalesce(func.avg(LessonProgress.time_spent), 0).label("avg_time_per_lesson"),
            func.count(col(LessonProgress.id)).where(LessonProgress.status == 'completed').label("lesson_completions")
        ).join(
            Lesson, LessonProgress.lesson_id == Lesson.id
        ).where(Lesson.course_id == course_id, Lesson.is_published == True)
        
        eng_res = await session.exec(engagement_query)
        engagement_data = eng_res.first()
        
        # Calculate health score components
        completion_rate = AnalyticsCalculator.calculate_completion_rate(
            enrollment_data.completions, enrollment_data.total_enrollments
        )
        
        dropout_rate = AnalyticsCalculator.calculate_churn_rate(
            enrollment_data.dropouts, enrollment_data.total_enrollments
        )
        
        rating_score = (review_data.avg_rating / 5) * 100 if review_data.avg_rating else 0
        engagement_score = min(engagement_data.avg_time_per_lesson / 300 * 100, 100)
        
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
            "average_rating": float(review_data.avg_rating),
            "engagement_score": round(engagement_score, 2),
            "metrics": {
                "total_enrollments": enrollment_data.total_enrollments,
                "active_enrollments": enrollment_data.active_enrollments,
                "total_reviews": review_data.total_reviews,
                "engaged_users": engagement_data.engaged_users
            }
        }
    
    @staticmethod
    async def get_lesson_performance_analytics(session: AsyncSession, course_id: uuid.UUID) -> List[Dict[str, Any]]:
        """Get performance analytics for all lessons in a course"""
        
        query = select(
            Lesson.id, Lesson.title, Lesson.type, Lesson.sort_order,
            func.count(LessonProgress.id).label("total_views"),
            func.count(col(LessonProgress.id)).where(LessonProgress.status == 'completed').label("completions"),
            func.count(col(LessonProgress.id)).where(LessonProgress.status == 'in_progress').label("in_progress"),
            func.coalesce(func.avg(LessonProgress.progress_percentage), 0).label("avg_progress"),
            func.coalesce(func.avg(LessonProgress.time_spent), 0).label("avg_time_spent"),
            func.coalesce(func.min(LessonProgress.time_spent), 0).label("min_time_spent"),
            func.coalesce(func.max(LessonProgress.time_spent), 0).label("max_time_spent")
        ).outerjoin(
            LessonProgress, Lesson.id == LessonProgress.lesson_id
        ).where(
            Lesson.course_id == course_id, Lesson.is_published == True
        ).group_by(Lesson.id).order_by(Lesson.sort_order)
        
        results = await session.exec(query)
        
        output = []
        for row in results.all():
            comp_rate = AnalyticsCalculator.calculate_completion_rate(row.completions, row.total_views)
            output.append({
                "lesson_id": row.id,
                "title": row.title,
                "type": row.type,
                "sort_order": row.sort_order,
                "total_views": row.total_views,
                "completions": row.completions,
                "completion_rate": comp_rate,
                "avg_progress": round(float(row.avg_progress), 2),
                "avg_time_spent": round(float(row.avg_time_spent), 2),
                "time_range": {
                    "min": row.min_time_spent,
                    "max": row.max_time_spent,
                    "avg": round(float(row.avg_time_spent), 2)
                }
            })
        return output

class RevenueAnalytics:
    """Revenue-specific analytics utilities"""
    
    @staticmethod
    async def calculate_revenue_metrics(
        session: AsyncSession,
        start_date: datetime, 
        end_date: datetime,
        course_id: Optional[uuid.UUID] = None
    ) -> Dict[str, Any]:
        """Calculate comprehensive revenue metrics"""
        
        def get_rev_query(s_date, e_date):
            q = select(
                func.coalesce(func.sum(RevenueRecord.amount), 0).label("total_revenue"),
                func.count(RevenueRecord.id).label("total_transactions"),
                func.count(col(RevenueRecord.id)).where(RevenueRecord.status == 'completed').label("successful_transactions"),
                func.count(col(RevenueRecord.id)).where(RevenueRecord.status == 'failed').label("failed_transactions"),
                func.coalesce(func.avg(RevenueRecord.amount), 0).label("avg_transaction_value"),
                func.coalesce(func.min(RevenueRecord.amount), 0).label("min_transaction_value"),
                func.coalesce(func.max(RevenueRecord.amount), 0).label("max_transaction_value")
            ).where(RevenueRecord.created_at >= s_date, RevenueRecord.created_at <= e_date)
            if course_id:
                q = q.where(RevenueRecord.course_id == course_id)
            return q

        current_res = await session.exec(get_rev_query(start_date, end_date))
        current_data = current_res.first()
        
        previous_start, previous_end = DateRangeHelper.get_previous_period(start_date, end_date)
        prev_res = await session.exec(get_rev_query(previous_start, previous_end))
        previous_data = prev_res.first()
        
        success_rate = AnalyticsCalculator.calculate_completion_rate(
            current_data.successful_transactions, current_data.total_transactions
        )
        revenue_growth = AnalyticsCalculator.calculate_growth_rate(
            float(current_data.total_revenue), float(previous_data.total_revenue)
        )
        
        return {
            "current_period": {
                "total_revenue": float(current_data.total_revenue),
                "total_transactions": current_data.total_transactions,
                "successful_transactions": current_data.successful_transactions,
                "success_rate": success_rate,
                "avg_transaction_value": round(float(current_data.avg_transaction_value), 2)
            },
            "previous_period": {
                "total_revenue": float(previous_data.total_revenue),
                "total_transactions": previous_data.total_transactions
            },
            "growth": {
                "revenue_growth": revenue_growth,
                "transaction_growth": AnalyticsCalculator.calculate_growth_rate(
                    current_data.total_transactions, previous_data.total_transactions
                )
            },
            "transaction_range": {
                "min": float(current_data.min_transaction_value),
                "max": float(current_data.max_transaction_value),
                "avg": round(float(current_data.avg_transaction_value), 2)
            }
        }

class CohortAnalytics:
    """Cohort analysis utilities"""
    
    @staticmethod
    async def calculate_user_retention_cohorts(session: AsyncSession, site_id: uuid.UUID, months_back: int = 12) -> List[Dict[str, Any]]:
        """Calculate user retention by monthly cohorts using session-based activity"""
        from sqlalchemy import func, cast, Float, extract, text
        from sqlalchemy.sql import expression
        
        # 1. monthly_cohorts CTE
        monthly_cohorts = select(
            User.id.label("user_id"),
            func.date_trunc('month', User.created_at).label("cohort_month"),
            func.date_trunc('month', LessonProgress.updated_at).label("activity_month")
        ).outerjoin(
            LessonProgress, User.id == LessonProgress.user_id
        ).where(
            User.site_id == site_id,
            User.created_at >= func.now() - text(f"INTERVAL '{months_back} months'"),
            User.status == 'active'
        ).cte("monthly_cohorts")

        # 2. cohort_data CTE
        period_number = (
            extract('year', func.age(monthly_cohorts.c.activity_month, monthly_cohorts.c.cohort_month)) * 12 +
            extract('month', func.age(monthly_cohorts.c.activity_month, monthly_cohorts.c.cohort_month))
        ).label("period_number")

        cohort_data = select(
            monthly_cohorts.c.cohort_month,
            func.count(func.distinct(monthly_cohorts.c.user_id)).label("cohort_size"),
            monthly_cohorts.c.activity_month,
            func.count(func.distinct(expression.case(
                (monthly_cohorts.c.activity_month != None, monthly_cohorts.c.user_id),
            ))).label("active_users"),
            period_number
        ).group_by(
            monthly_cohorts.c.cohort_month, 
            monthly_cohorts.c.activity_month
        ).cte("cohort_data")

        # 3. Final Query
        query = select(
            cohort_data.c.cohort_month,
            cohort_data.c.cohort_size,
            cohort_data.c.period_number,
            cohort_data.c.active_users,
            expression.case(
                (cohort_data.c.cohort_size > 0, func.round(cast(cohort_data.c.active_users, Float) / cohort_data.c.cohort_size * 100, 2)),
                else_=0
            ).label("retention_rate")
        ).where(
            cohort_data.c.period_number != None,
            cohort_data.c.period_number >= 0
        ).order_by(
            cohort_data.c.cohort_month,
            cohort_data.c.period_number
        )
        
        result = await session.exec(query)
        rows = result.all()
        
        cohorts = {}
        for row in rows:
            c_month = row[0]
            cohort_key = c_month.strftime('%Y-%m')
            if cohort_key not in cohorts:
                cohorts[cohort_key] = {
                    "cohort_month": cohort_key,
                    "cohort_size": row[1],
                    "retention_by_period": {}
                }
            
            cohorts[cohort_key]["retention_by_period"][int(row[2])] = {
                "active_users": row[3],
                "retention_rate": float(row[4])
            }
        
        return list(cohorts.values())

# Utility functions for common analytics operations
async def get_top_performing_content(
    session: AsyncSession,
    content_type: str, 
    metric: str = "enrollments", 
    limit: int = 10,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> List[Dict[str, Any]]:
    """Get top performing content by various metrics"""
    if not end_date: end_date = datetime.utcnow()
    if not start_date: start_date = end_date - timedelta(days=30)
    
    if content_type == "courses":
        if metric == "enrollments":
            query = select(
                Course.id, Course.title, Course.thumbnail_url,
                func.count(Enrollment.id).label("metric_value"),
                func.coalesce(func.avg(CourseReview.rating), 0).label("avg_rating")
            ).outerjoin(
                Enrollment, and_(Enrollment.course_id == Course.id, Enrollment.enrolled_at >= start_date, Enrollment.enrolled_at <= end_date)
            ).outerjoin(
                CourseReview, and_(CourseReview.course_id == Course.id, CourseReview.is_published == True)
            ).where(Course.status == 'published').group_by(Course.id).order_by(desc("metric_value")).limit(limit)
        
        elif metric == "revenue":
            query = select(
                Course.id, Course.title, Course.thumbnail_url,
                func.coalesce(func.sum(RevenueRecord.amount), 0).label("metric_value"),
                func.coalesce(func.avg(CourseReview.rating), 0).label("avg_rating")
            ).outerjoin(
                RevenueRecord, and_(RevenueRecord.course_id == Course.id, RevenueRecord.status == 'completed', RevenueRecord.created_at >= start_date, RevenueRecord.created_at <= end_date)
            ).outerjoin(
                CourseReview, and_(CourseReview.course_id == Course.id, CourseReview.is_published == True)
            ).where(Course.status == 'published').group_by(Course.id).order_by(desc("metric_value")).limit(limit)
        else: # completion_rate
            query = select(
                Course.id, Course.title, Course.thumbnail_url,
                (func.count(col(Enrollment.id)).where(Enrollment.status == 'completed') * 100.0 / func.nullif(func.count(Enrollment.id), 0)).label("metric_value"),
                func.coalesce(func.avg(CourseReview.rating), 0).label("avg_rating")
            ).join(
                Enrollment, and_(Enrollment.course_id == Course.id, Enrollment.enrolled_at >= start_date, Enrollment.enrolled_at <= end_date)
            ).outerjoin(
                CourseReview, and_(CourseReview.course_id == Course.id, CourseReview.is_published == True)
            ).where(Course.status == 'published').group_by(Course.id).order_by(desc("metric_value")).limit(limit)

    results = await session.exec(query)
    return [dict(zip(["id", "title", "thumbnail_url", "metric_value", "avg_rating"], [row[0], row[1], row[2], float(row[3]), float(row[4])])) for row in results.all()]

async def get_platform_kpis(
    session: AsyncSession,
    start_date: datetime, 
    end_date: datetime
) -> Dict[str, Any]:
    """Get key platform KPIs for dashboard using SQLModel"""
    
    # User KPIs
    user_query = select(
        func.count(User.id).label("total_users"),
        func.count(col(User.id)).where(User.created_at >= start_date, User.created_at <= end_date).label("new_users"),
        func.count(col(User.id)).where(User.last_login_at >= start_date, User.last_login_at <= end_date).label("active_users"),
        func.count(col(User.id)).where(User.role == 'student').label("total_students"),
        func.count(col(User.id)).where(User.role == 'instructor').label("total_instructors")
    ).where(User.status == 'active')
    
    u_res = await session.exec(user_query)
    user_kpis = u_res.first()
    
    # Course KPIs
    course_query = select(
        func.count(Course.id).label("total_courses"),
        func.count(col(Course.id)).where(Course.status == 'published').label("published_courses"),
        func.coalesce(func.sum(Course.enrollment_count), 0).label("total_enrollments"),
        func.count(col(Course.id)).where(Course.created_at >= start_date, Course.created_at <= end_date).label("new_courses")
    )
    c_res = await session.exec(course_query)
    course_kpis = c_res.first()
    
    # Revenue KPIs
    revenue_query = select(
        func.coalesce(func.sum(RevenueRecord.amount), 0).label("total_revenue"),
        func.count(RevenueRecord.id).label("total_transactions"),
        func.coalesce(func.avg(RevenueRecord.amount), 0).label("avg_transaction_value")
    ).where(RevenueRecord.created_at >= start_date, RevenueRecord.created_at <= end_date, RevenueRecord.status == 'completed')
    r_res = await session.exec(revenue_query)
    revenue_kpis = r_res.first()
    
    # Engagement KPIs
    engagement_query = select(
        func.count(func.distinct(LessonProgress.user_id)).label("engaged_users"),
        func.coalesce(func.sum(LessonProgress.time_spent), 0).label("total_learning_time"),
        func.count(col(LessonProgress.id)).where(LessonProgress.status == 'completed').label("lesson_completions")
    ).where(LessonProgress.updated_at >= start_date, LessonProgress.updated_at <= end_date)
    e_res = await session.exec(engagement_query)
    engagement_kpis = e_res.first()
    
    return {
        "users": dict(zip(["total_users", "new_users", "active_users", "total_students", "total_instructors"], user_kpis)),
        "courses": dict(zip(["total_courses", "published_courses", "total_enrollments", "new_courses"], course_kpis)),
        "revenue": {
            "total_revenue": float(revenue_kpis.total_revenue),
            "total_transactions": revenue_kpis.total_transactions,
            "avg_transaction_value": float(revenue_kpis.avg_transaction_value)
        },
        "engagement": dict(zip(["engaged_users", "total_learning_time", "lesson_completions"], engagement_kpis))
    }
