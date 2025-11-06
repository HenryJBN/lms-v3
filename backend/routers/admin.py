from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta

from database.connection import database
from models.schemas import (
    AdminDashboardStats, AdminUserResponse, AdminCourseResponse,
    PaginationParams, PaginatedResponse, AdminAuditLog
)
from middleware.auth import require_admin, get_current_active_user
from utils.analytics import (
    AnalyticsCalculator, UserAnalytics, CourseAnalytics, 
    RevenueAnalytics, get_platform_kpis, get_top_performing_content
)

router = APIRouter()

@router.get("/dashboard", response_model=AdminDashboardStats)
async def get_admin_dashboard(current_user = Depends(require_admin)):
    """Get admin dashboard statistics"""
    
    # Get basic stats
    stats_query = """
        SELECT 
            (SELECT COUNT(*) FROM users WHERE status = 'active') as total_users,
            (SELECT COUNT(*) FROM users WHERE role = 'student' AND status = 'active') as total_students,
            (SELECT COUNT(*) FROM users WHERE role = 'instructor' AND status = 'active') as total_instructors,
            (SELECT COUNT(*) FROM courses WHERE status = 'published') as total_courses,
            (SELECT COUNT(*) FROM course_enrollments WHERE status = 'active') as total_enrollments,
            (SELECT COUNT(*) FROM course_enrollments WHERE status = 'completed') as total_completions,
            (SELECT COUNT(*) FROM certificates WHERE status = 'issued') as total_certificates,
            (SELECT COALESCE(SUM(amount), 0) FROM revenue_records WHERE status = 'completed') as total_revenue
    """
    
    stats = await database.fetch_one(stats_query)
    
    # Get recent activity (last 30 days)
    recent_activity_query = """
        SELECT 
            (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_30d,
            (SELECT COUNT(*) FROM courses WHERE created_at >= NOW() - INTERVAL '30 days') as new_courses_30d,
            (SELECT COUNT(*) FROM course_enrollments WHERE enrolled_at >= NOW() - INTERVAL '30 days') as new_enrollments_30d,
            (SELECT COUNT(*) FROM certificates WHERE issued_at >= NOW() - INTERVAL '30 days') as new_certificates_30d
    """
    
    recent_activity = await database.fetch_one(recent_activity_query)
    
    # Get top courses by enrollment
    top_courses_query = """
        SELECT c.id, c.title, c.enrollment_count, c.thumbnail_url
        FROM courses c
        WHERE c.status = 'published'
        ORDER BY c.enrollment_count DESC
        LIMIT 5
    """
    
    top_courses = await database.fetch_all(top_courses_query)
    
    # Get recent user registrations
    recent_users_query = """
        SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.created_at
        FROM users u
        WHERE u.status = 'active'
        ORDER BY u.created_at DESC
        LIMIT 10
    """
    
    recent_users = await database.fetch_all(recent_users_query)
    
    return AdminDashboardStats(
        total_users=stats.total_users,
        total_students=stats.total_students,
        total_instructors=stats.total_instructors,
        total_courses=stats.total_courses,
        total_enrollments=stats.total_enrollments,
        total_completions=stats.total_completions,
        total_certificates=stats.total_certificates,
        total_revenue=float(stats.total_revenue),
        new_users_30d=recent_activity.new_users_30d,
        new_courses_30d=recent_activity.new_courses_30d,
        new_enrollments_30d=recent_activity.new_enrollments_30d,
        new_certificates_30d=recent_activity.new_certificates_30d,
        top_courses=[dict(course) for course in top_courses],
        recent_users=[dict(user) for user in recent_users]
    )

@router.get("/users", response_model=PaginatedResponse)
async def get_admin_users(
    pagination: PaginationParams = Depends(),
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user = Depends(require_admin)
):
    """Get all users with admin details"""
    
    # Build query with filters
    where_conditions = []
    values = {"size": pagination.size, "offset": (pagination.page - 1) * pagination.size}
    
    if role:
        where_conditions.append("u.role = :role")
        values["role"] = role
    
    if status:
        where_conditions.append("u.status = :status")
        values["status"] = status
    
    if search:
        where_conditions.append("""
            (u.first_name ILIKE :search OR u.last_name ILIKE :search OR 
             u.email ILIKE :search OR u.username ILIKE :search)
        """)
        values["search"] = f"%{search}%"
    
    where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
    
    # Get total count
    count_query = f"SELECT COUNT(*) as total FROM users u {where_clause}"
    total_result = await database.fetch_one(count_query, values=values)
    total = total_result.total
    
    # Get users with additional admin info
    query = f"""
        SELECT u.*, 
               (SELECT COUNT(*) FROM course_enrollments WHERE user_id = u.id) as total_enrollments,
               (SELECT COUNT(*) FROM certificates WHERE user_id = u.id) as total_certificates,
               (SELECT balance FROM l_tokens WHERE user_id = u.id) as token_balance
        FROM users u {where_clause}
        ORDER BY u.created_at DESC
        LIMIT :size OFFSET :offset
    """
    
    users = await database.fetch_all(query, values=values)
    
    return PaginatedResponse(
        items=[AdminUserResponse(**user) for user in users],
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=(total + pagination.size - 1) // pagination.size
    )

@router.get("/courses", response_model=PaginatedResponse)
async def get_admin_courses(
    pagination: PaginationParams = Depends(),
    status: Optional[str] = Query(None),
    instructor_id: Optional[uuid.UUID] = Query(None),
    search: Optional[str] = Query(None),
    current_user = Depends(require_admin)
):
    """Get all courses with admin details"""
    
    # Build query with filters
    where_conditions = []
    values = {"size": pagination.size, "offset": (pagination.page - 1) * pagination.size}
    
    if status:
        where_conditions.append("c.status = :status")
        values["status"] = status
    
    if instructor_id:
        where_conditions.append("c.instructor_id = :instructor_id")
        values["instructor_id"] = instructor_id
    
    if search:
        where_conditions.append("""
            (c.title ILIKE :search OR c.description ILIKE :search)
        """)
        values["search"] = f"%{search}%"
    
    where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
    
    # Get total count
    count_query = f"SELECT COUNT(*) as total FROM courses c {where_clause}"
    total_result = await database.fetch_one(count_query, values=values)
    total = total_result.total
    
    # Get courses with additional admin info
    query = f"""
        SELECT c.*, u.first_name as instructor_first_name, u.last_name as instructor_last_name,
               cat.name as category_name,
               (SELECT COUNT(*) FROM lessons WHERE course_id = c.id) as total_lessons,
               (SELECT COALESCE(SUM(amount), 0) FROM revenue_records WHERE course_id = c.id AND status = 'completed') as total_revenue
        FROM courses c
        LEFT JOIN users u ON c.instructor_id = u.id
        LEFT JOIN categories cat ON c.category_id = cat.id
        {where_clause}
        ORDER BY c.created_at DESC
        LIMIT :size OFFSET :offset
    """
    
    courses = await database.fetch_all(query, values=values)
    
    return PaginatedResponse(
        items=[AdminCourseResponse(**course) for course in courses],
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=(total + pagination.size - 1) // pagination.size
    )

@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: uuid.UUID,
    status: str,
    reason: Optional[str] = None,
    current_user = Depends(require_admin)
):
    """Update user status"""
    
    if status not in ["active", "inactive", "suspended"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status"
        )
    
    # Check if user exists
    user_query = "SELECT * FROM users WHERE id = :user_id"
    user = await database.fetch_one(user_query, values={"user_id": user_id})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update user status
    update_query = """
        UPDATE users SET status = :status, updated_at = NOW()
        WHERE id = :user_id
        RETURNING *
    """
    
    updated_user = await database.fetch_one(update_query, values={
        "status": status,
        "user_id": user_id
    })
    
    # Log admin action
    log_query = """
        INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, description, metadata)
        VALUES (:admin_id, :action, 'user', :target_id, :description, :metadata)
    """
    
    await database.execute(log_query, values={
        "admin_id": current_user.id,
        "action": f"user_status_changed",
        "target_id": user_id,
        "description": f"Changed user status from {user.status} to {status}",
        "metadata": {"old_status": user.status, "new_status": status, "reason": reason}
    })
    
    return {"message": f"User status updated to {status}"}

@router.put("/courses/{course_id}/status")
async def update_course_status(
    course_id: uuid.UUID,
    status: str,
    reason: Optional[str] = None,
    current_user = Depends(require_admin)
):
    """Update course status"""
    
    if status not in ["draft", "published", "archived", "suspended"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status"
        )
    
    # Check if course exists
    course_query = "SELECT * FROM courses WHERE id = :course_id"
    course = await database.fetch_one(course_query, values={"course_id": course_id})
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Update course status
    update_query = """
        UPDATE courses SET status = :status, updated_at = NOW()
        WHERE id = :course_id
        RETURNING *
    """
    
    updated_course = await database.fetch_one(update_query, values={
        "status": status,
        "course_id": course_id
    })
    
    # Log admin action
    log_query = """
        INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, description, metadata)
        VALUES (:admin_id, :action, 'course', :target_id, :description, :metadata)
    """
    
    await database.execute(log_query, values={
        "admin_id": current_user.id,
        "action": f"course_status_changed",
        "target_id": course_id,
        "description": f"Changed course status from {course.status} to {status}",
        "metadata": {"old_status": course.status, "new_status": status, "reason": reason}
    })
    
    return {"message": f"Course status updated to {status}"}

@router.get("/audit-log", response_model=PaginatedResponse)
async def get_audit_log(
    pagination: PaginationParams = Depends(),
    admin_user_id: Optional[uuid.UUID] = Query(None),
    action: Optional[str] = Query(None),
    target_type: Optional[str] = Query(None),
    current_user = Depends(require_admin)
):
    """Get admin audit log"""
    
    # Build query with filters
    where_conditions = []
    values = {"size": pagination.size, "offset": (pagination.page - 1) * pagination.size}
    
    if admin_user_id:
        where_conditions.append("aal.admin_user_id = :admin_user_id")
        values["admin_user_id"] = admin_user_id
    
    if action:
        where_conditions.append("aal.action = :action")
        values["action"] = action
    
    if target_type:
        where_conditions.append("aal.target_type = :target_type")
        values["target_type"] = target_type
    
    where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
    
    # Get total count
    count_query = f"SELECT COUNT(*) as total FROM admin_audit_log aal {where_clause}"
    total_result = await database.fetch_one(count_query, values=values)
    total = total_result.total
    
    # Get audit log entries
    query = f"""
        SELECT aal.*, u.first_name as admin_first_name, u.last_name as admin_last_name
        FROM admin_audit_log aal
        JOIN users u ON aal.admin_user_id = u.id
        {where_clause}
        ORDER BY aal.created_at DESC
        LIMIT :size OFFSET :offset
    """
    
    logs = await database.fetch_all(query, values=values)
    
    return PaginatedResponse(
        items=[AdminAuditLog(**log) for log in logs],
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=(total + pagination.size - 1) // pagination.size
    )

@router.post("/reports/generate")
async def generate_admin_report(
    report_type: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    filters: Optional[Dict[str, Any]] = None,
    current_user = Depends(require_admin)
):
    """Generate admin reports"""
    
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    try:
        if report_type == "platform_overview":
            report_data = await get_platform_kpis(start_date, end_date)
        
        elif report_type == "user_engagement":
            # Get user engagement data
            user_query = """
                SELECT u.id, u.first_name, u.last_name, u.email, u.created_at
                FROM users u 
                WHERE u.status = 'active' AND u.role = 'student'
                ORDER BY u.created_at DESC
                LIMIT 100
            """
            users = await database.fetch_all(user_query)
            
            engagement_data = []
            for user in users:
                engagement = await UserAnalytics.get_user_engagement_score(user.id)
                engagement_data.append({
                    "user_id": user.id,
                    "name": f"{user.first_name} {user.last_name}",
                    "email": user.email,
                    **engagement
                })
            
            report_data = {"user_engagement": engagement_data}
        
        elif report_type == "course_performance":
            # Get top performing courses
            top_courses = await get_top_performing_content("courses", "enrollments", 20, start_date, end_date)
            
            course_health = []
            for course in top_courses:
                health = await CourseAnalytics.calculate_course_health_score(course["id"])
                course_health.append({
                    "course_id": course["id"],
                    "title": course["title"],
                    **health
                })
            
            report_data = {"course_performance": course_health}
        
        elif report_type == "revenue_analysis":
            revenue_data = await RevenueAnalytics.calculate_revenue_metrics(start_date, end_date)
            report_data = {"revenue_analysis": revenue_data}
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid report type"
            )
        
        # Log report generation
        log_query = """
            INSERT INTO admin_audit_log (admin_user_id, action, target_type, description, metadata)
            VALUES (:admin_id, 'report_generated', 'system', :description, :metadata)
        """
        
        await database.execute(log_query, values={
            "admin_id": current_user.id,
            "description": f"Generated {report_type} report",
            "metadata": {"report_type": report_type, "start_date": start_date, "end_date": end_date}
        })
        
        return {
            "report_type": report_type,
            "generated_at": datetime.utcnow(),
            "date_range": {"start_date": start_date, "end_date": end_date},
            "data": report_data
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate report: {str(e)}"
        )

@router.post("/export")
async def export_admin_data(
    export_type: str,
    format: str = "csv",
    filters: Optional[Dict[str, Any]] = None,
    current_user = Depends(require_admin)
):
    """Export admin data"""
    
    if format not in ["csv", "xlsx", "json"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid export format"
        )
    
    try:
        export_data = {}
        
        if export_type == "users":
            # Export user data
            where_conditions = []
            values = {}
            
            if filters:
                if filters.get("role"):
                    where_conditions.append("role = :role")
                    values["role"] = filters["role"]
                if filters.get("status"):
                    where_conditions.append("status = :status")
                    values["status"] = filters["status"]
            
            where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
            
            query = f"""
                SELECT id, first_name, last_name, email, role, status, created_at, last_login_at
                FROM users {where_clause}
                ORDER BY created_at DESC
            """
            
            users = await database.fetch_all(query, values=values)
            export_data = {"users": [dict(user) for user in users]}
        
        elif export_type == "courses":
            # Export course data
            query = """
                SELECT c.id, c.title, c.description, c.status, c.price, c.enrollment_count,
                       u.first_name as instructor_first_name, u.last_name as instructor_last_name,
                       c.created_at, c.updated_at
                FROM courses c
                LEFT JOIN users u ON c.instructor_id = u.id
                ORDER BY c.created_at DESC
            """
            
            courses = await database.fetch_all(query)
            export_data = {"courses": [dict(course) for course in courses]}
        
        elif export_type == "enrollments":
            # Export enrollment data
            query = """
                SELECT ce.id, ce.user_id, ce.course_id, ce.status, ce.progress_percentage,
                       ce.enrolled_at, ce.completed_at,
                       u.first_name, u.last_name, u.email,
                       c.title as course_title
                FROM course_enrollments ce
                JOIN users u ON ce.user_id = u.id
                JOIN courses c ON ce.course_id = c.id
                ORDER BY ce.enrolled_at DESC
            """
            
            enrollments = await database.fetch_all(query)
            export_data = {"enrollments": [dict(enrollment) for enrollment in enrollments]}
        
        elif export_type == "revenue":
            # Export revenue data
            query = """
                SELECT rr.id, rr.user_id, rr.course_id, rr.amount, rr.currency, rr.status,
                       rr.payment_method, rr.created_at,
                       u.first_name, u.last_name, u.email,
                       c.title as course_title
                FROM revenue_records rr
                JOIN users u ON rr.user_id = u.id
                LEFT JOIN courses c ON rr.course_id = c.id
                ORDER BY rr.created_at DESC
            """
            
            revenue = await database.fetch_all(query)
            export_data = {"revenue": [dict(record) for record in revenue]}
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid export type"
            )
        
        # Log data export
        log_query = """
            INSERT INTO admin_audit_log (admin_user_id, action, target_type, description, metadata)
            VALUES (:admin_id, 'data_exported', 'system', :description, :metadata)
        """
        
        await database.execute(log_query, values={
            "admin_id": current_user.id,
            "description": f"Exported {export_type} data as {format}",
            "metadata": {"export_type": export_type, "format": format}
        })
        
        return {
            "export_type": export_type,
            "format": format,
            "exported_at": datetime.utcnow(),
            "record_count": len(list(export_data.values())[0]) if export_data else 0,
            "data": export_data
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export data: {str(e)}"
        )

@router.get("/system-health")
async def get_system_health(current_user = Depends(require_admin)):
    """Get system health status"""
    
    try:
        # Check database connection
        db_status = "healthy"
        try:
            await database.fetch_one("SELECT 1")
        except Exception:
            db_status = "unhealthy"
        
        # Check recent error rates
        error_query = """
            SELECT COUNT(*) as error_count
            FROM admin_audit_log 
            WHERE action LIKE '%error%' AND created_at >= NOW() - INTERVAL '1 hour'
        """
        error_result = await database.fetch_one(error_query)
        
        # Check system performance metrics
        performance_query = """
            SELECT 
                COUNT(*) as total_requests,
                AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_response_time
            FROM admin_audit_log 
            WHERE created_at >= NOW() - INTERVAL '1 hour'
        """
        performance_result = await database.fetch_one(performance_query)
        
        return {
            "status": "healthy" if db_status == "healthy" and error_result.error_count < 10 else "degraded",
            "database": db_status,
            "error_count_1h": error_result.error_count,
            "total_requests_1h": performance_result.total_requests or 0,
            "avg_response_time": float(performance_result.avg_response_time) if performance_result.avg_response_time else 0,
            "timestamp": datetime.utcnow()
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow()
        }
