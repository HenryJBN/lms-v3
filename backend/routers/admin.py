from fastapi import APIRouter, Depends, HTTPException, status, Query, Body, UploadFile, File, Form
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta, UTC
import io

from database.session import get_session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func, or_, and_, desc
from models.user import User, UserProfile
from models.course import Course, Category
from models.enrollment import Enrollment, Certificate
from models.finance import RevenueRecord
from models.system import AdminAuditLog
from models.site import Site
from dependencies import get_current_site
from schemas.system import AdminDashboardStats
from schemas.user import BasicUser, UserResponse, AdminUserResponse
from schemas.course import AdminCourseResponse
from schemas.common import PaginationParams, PaginatedResponse
from middleware.auth import get_password_hash, get_user_by_email, require_admin, get_current_active_user
from utils.analytics import (
    AnalyticsCalculator, UserAnalytics, CourseAnalytics, 
    RevenueAnalytics, get_platform_kpis, get_top_performing_content
)
from tasks.email_tasks import send_admin_created_user_email_task
from routers.admin_import import import_admin_data
import secrets
import string
import json

router = APIRouter()

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user_by_admin(
    user_id: uuid.UUID,
    payload: Dict[str, Any],
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Update user fields by admin. Allows updating first_name, last_name, email, and role."""
    # Fetch existing user
    query = select(User).where(User.id == user_id, User.site_id == current_site.id)
    result = await session.exec(query)
    user = result.first()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    allowed_fields = {"first_name", "last_name", "email", "role"}
    updated_data = {}

    for key, value in payload.items():
        if key in allowed_fields and value is not None:
            if key == "email":
                # Ensure email uniqueness within site
                dup_query = select(User.id).where(User.email == value, User.id != user_id, User.site_id == current_site.id)
                dup_res = await session.exec(dup_query)
                if dup_res.first():
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use in this site")
            setattr(user, key, value)
            updated_data[key] = value

    if updated_data:
        user.updated_at = datetime.utcnow()
        session.add(user)
        
        # Audit log
        audit_log = AdminAuditLog(
            admin_user_id=current_user.id,
            action="user_updated",
            target_type="user",
            target_id=user_id,
            description="Admin updated user profile",
            action_metadata=json.dumps(updated_data),
            site_id=current_site.id
        )
        session.add(audit_log)
        
        await session.commit()
        await session.refresh(user)

    return user

@router.get("/dashboard", response_model=AdminDashboardStats)
async def get_admin_dashboard(
    period: str = Query("30d", description="Time period for stats: today, yesterday, 7d, 30d, 3m, 6m, 1y"),
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Get admin dashboard statistics"""
    from sqlalchemy import case
    
    # Calculate time range
    now = datetime.utcnow()
    end_date = now
    
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "yesterday":
        end_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        start_date = end_date - timedelta(days=1)
    elif period == "7d":
        start_date = now - timedelta(days=7)
    elif period == "3m":
        start_date = now - timedelta(days=90)
    elif period == "6m":
        start_date = now - timedelta(days=180)
    elif period == "1y":
        start_date = now - timedelta(days=365)
    else:  # default 30d
        start_date = now - timedelta(days=30)

    # Basic stats (Totals remain cumulative)
    user_count_query = select(func.count(User.id)).where(User.status == 'active', User.site_id == current_site.id)
    student_count_query = select(func.count(User.id)).where(User.role == 'student', User.status == 'active', User.site_id == current_site.id)
    instructor_count_query = select(func.count(User.id)).where(User.role == 'instructor', User.status == 'active', User.site_id == current_site.id)
    course_count_query = select(func.count(Course.id)).where(Course.status == 'published', Course.site_id == current_site.id)
    enrollment_count_query = select(func.count(Enrollment.id)).where(Enrollment.status == 'active', Enrollment.site_id == current_site.id)
    completion_count_query = select(func.count(Enrollment.id)).where(Enrollment.status == 'completed', Enrollment.site_id == current_site.id)
    certificate_count_query = select(func.count(Certificate.id)).where(Certificate.status == 'issued', Certificate.site_id == current_site.id)
    revenue_sum_query = select(func.coalesce(func.sum(RevenueRecord.amount), 0)).where(RevenueRecord.status == 'completed', RevenueRecord.site_id == current_site.id)
    
    total_users = (await session.exec(user_count_query)).one()
    total_students = (await session.exec(student_count_query)).one()
    total_instructors = (await session.exec(instructor_count_query)).one()
    total_courses = (await session.exec(course_count_query)).one()
    total_enrollments = (await session.exec(enrollment_count_query)).one()
    total_completions = (await session.exec(completion_count_query)).one()
    total_certificates = (await session.exec(certificate_count_query)).one()
    total_revenue = (await session.exec(revenue_sum_query)).one()
    
    # Recent activity based on selected period
    new_users_period = (await session.exec(select(func.count(User.id)).where(User.created_at >= start_date, User.created_at <= end_date, User.site_id == current_site.id))).one()
    new_courses_period = (await session.exec(select(func.count(Course.id)).where(Course.created_at >= start_date, Course.created_at <= end_date, Course.site_id == current_site.id))).one()
    new_enrollments_period = (await session.exec(select(func.count(Enrollment.id)).where(Enrollment.enrolled_at >= start_date, Enrollment.enrolled_at <= end_date, Enrollment.site_id == current_site.id))).one()
    new_certificates_period = (await session.exec(select(func.count(Certificate.id)).where(Certificate.issued_at >= start_date, Certificate.issued_at <= end_date, Certificate.site_id == current_site.id))).one()
    
    # Top courses (count enrollments per course)
    enrollment_count_sub = select(
        Enrollment.course_id, 
        func.count(Enrollment.id).label("enroll_count")
    ).where(
        Enrollment.site_id == current_site.id
    ).group_by(Enrollment.course_id).subquery()

    top_courses_query = select(
        Course.id, 
        Course.title, 
        func.coalesce(enrollment_count_sub.c.enroll_count, 0).label("enrollment_count"), 
        Course.thumbnail_url
    ).outerjoin(
        enrollment_count_sub, Course.id == enrollment_count_sub.c.course_id
    ).where(
        Course.status == 'published',
        Course.site_id == current_site.id
    ).order_by(desc("enrollment_count")).limit(5)
    
    top_courses_res = await session.exec(top_courses_query)
    top_courses_list = [dict(zip(["id", "title", "enrollment_count", "thumbnail_url"], row)) for row in top_courses_res.all()]
    
    # Recent registrations
    recent_users_query = select(User.id, User.first_name, User.last_name, User.email, User.role, User.created_at).where(
        User.status == 'active',
        User.site_id == current_site.id
    ).order_by(desc(User.created_at)).limit(10)
    
    recent_users_res = await session.exec(recent_users_query)
    recent_users_list = [dict(zip(["id", "first_name", "last_name", "email", "role", "created_at"], row)) for row in recent_users_res.all()]
    
    return AdminDashboardStats(
        total_users=total_users,
        total_students=total_students,
        total_instructors=total_instructors,
        total_courses=total_courses,
        total_enrollments=total_enrollments,
        total_completions=total_completions,
        total_certificates=total_certificates,
        total_revenue=float(total_revenue),
        new_users_30d=new_users_period,
        new_courses_30d=new_courses_period,
        new_enrollments_30d=new_enrollments_period,
        new_certificates_30d=new_certificates_period,
        top_courses=top_courses_list,
        recent_users=recent_users_list
    )

@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: BasicUser,
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Create a new user by admin."""
    # Check if user already exists
    existing_user = await get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    # Derive username
    username = user_data.first_name.strip().lower()
    base_username = username
    attempt = 0
    while True:
        query = select(User).where(User.username == username, User.site_id == current_site.id)
        existing = (await session.exec(query)).first()
        if not existing:
            break
        attempt += 1
        suffix = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(3))
        username = f"{base_username}{suffix}"
        if attempt > 5:
            username = f"{base_username}{uuid.uuid4().hex[:6]}"
            break

    # Password generation
    alphabet = string.ascii_letters + string.digits + string.punctuation
    temp_password = ''.join(secrets.choice(alphabet) for _ in range(16))
    hashed_password = get_password_hash(temp_password)

    new_user = User(
        id=uuid.uuid4(),
        site_id=current_site.id,
        email=user_data.email,
        username=username,
        hashed_password=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=user_data.role
    )

    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)

    # Email notification
    try:
        send_admin_created_user_email_task.delay(
            email=user_data.email,
            first_name=user_data.first_name,
            username=username,
            password=temp_password
        )
    except Exception:
        pass

    return new_user

@router.get("/users", response_model=PaginatedResponse)
async def get_admin_users(
    pagination: PaginationParams = Depends(),
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Get all users with admin details"""
    offset = (pagination.page - 1) * pagination.size
    
    # Base query for users with aggregations
    # Subqueries for counts to avoid complex joins issues with pagination
    enrollment_count_sub = select(func.count(Enrollment.id)).where(Enrollment.user_id == User.id, Enrollment.site_id == current_site.id).scalar_subquery()
    cert_count_sub = select(func.count(Certificate.id)).where(Certificate.user_id == User.id, Certificate.site_id == current_site.id).scalar_subquery()
    token_balance_sub = select(TokenBalance.balance).where(TokenBalance.user_id == User.id, TokenBalance.site_id == current_site.id).limit(1).scalar_subquery()
    completion_count_sub = select(func.count(Enrollment.id)).where(Enrollment.user_id == User.id, Enrollment.status == 'completed', Enrollment.site_id == current_site.id).scalar_subquery()

    query = select(
        User,
        enrollment_count_sub.label("total_enrollments"),
        cert_count_sub.label("total_certificates"),
        token_balance_sub.label("token_balance"),
        completion_count_sub.label("completed_courses")
    )
    
    query = query.where(User.site_id == current_site.id)

    if role:
        query = query.where(User.role == role)
    if status:
        query = query.where(User.status == status)
    if search:
        query = query.where(or_(
            User.first_name.ilike(f"%{search}%"),
            User.last_name.ilike(f"%{search}%"),
            User.email.ilike(f"%{search}%"),
            User.username.ilike(f"%{search}%")
        ))
        
    # Count
    count_query = select(func.count(User.id)).where(User.site_id == current_site.id)
    if role: count_query = count_query.where(User.role == role)
    if status: count_query = count_query.where(User.status == status)
    if search: count_query = count_query.where(or_(
        User.first_name.ilike(f"%{search}%"),
        User.last_name.ilike(f"%{search}%"),
        User.email.ilike(f"%{search}%"),
        User.username.ilike(f"%{search}%")
    ))
    
    total = (await session.exec(count_query)).one()
    
    # Pagination & Ordering
    query = query.order_by(desc(User.created_at)).offset(offset).limit(pagination.size)
    results = await session.exec(query)
    
    transformed = []
    for user, en_count, cert_count, tokens, comp_count in results.all():
        u_dict = user.model_dump()
        u_dict.update({
            "total_enrollments": en_count,
            "total_certificates": cert_count,
            "token_balance": tokens,
            "completed_courses": comp_count
        })
        transformed.append(u_dict)
        
    return PaginatedResponse(
        items=transformed,
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
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Get all courses with admin details"""
    offset = (pagination.page - 1) * pagination.size
    
    # Subqueries for counts
    from models.lesson import Lesson
    lesson_count_sub = select(func.count(Lesson.id)).where(Lesson.course_id == Course.id, Lesson.site_id == current_site.id).scalar_subquery()
    revenue_sum_sub = select(func.coalesce(func.sum(RevenueRecord.amount), 0)).where(
        RevenueRecord.course_id == Course.id, RevenueRecord.status == 'completed', RevenueRecord.site_id == current_site.id
    ).scalar_subquery()

    # Join with instructor and category for details
    from models.user import User as Instructor
    query = select(
        Course, 
        Instructor.first_name.label("instructor_first_name"),
        Instructor.last_name.label("instructor_last_name"),
        Category.name.label("category_name"),
        lesson_count_sub.label("total_lessons"),
        revenue_sum_sub.label("total_revenue")
    ).outerjoin(Instructor, Course.instructor_id == Instructor.id).outerjoin(Category, Course.category_id == Category.id).where(Course.site_id == current_site.id)
    
    if status:
        query = query.where(Course.status == status)
    if instructor_id:
        query = query.where(Course.instructor_id == instructor_id)
    if search:
        query = query.where(or_(Course.title.ilike(f"%{search}%"), Course.description.ilike(f"%{search}%")))
        
    # Count
    count_query = select(func.count(Course.id)).where(Course.site_id == current_site.id)
    if status: count_query = count_query.where(Course.status == status)
    if instructor_id: count_query = count_query.where(Course.instructor_id == instructor_id)
    if search: count_query = count_query.where(or_(Course.title.ilike(f"%{search}%"), Course.description.ilike(f"%{search}%")))
    
    total = (await session.exec(count_query)).one()
    
    # Pagination & Ordering
    query = query.order_by(desc(Course.created_at)).offset(offset).limit(pagination.size)
    results = await session.exec(query)
    
    transformed = []
    for row in results.all():
        course = row[0]
        c_dict = course.model_dump()
        c_dict.update({
            "instructor_first_name": row[1],
            "instructor_last_name": row[2],
            "category_name": row[3],
            "total_lessons": row[4],
            "total_revenue": float(row[5])
        })
        transformed.append(c_dict)
        
    return PaginatedResponse(
        items=transformed,
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=(total + pagination.size - 1) // pagination.size
    )

@router.patch("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: uuid.UUID,
    payload: Optional[Dict[str, Any]] = None,
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Deactivate a user account (sets status to 'inactive')."""
    query = select(User).where(User.id == user_id, User.site_id == current_site.id)
    res = await session.exec(query)
    user = res.first()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if str(current_user.id) == str(user_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own account")

    if user.status == "inactive":
        return {"message": "User is already inactive"}

    old_status = user.status
    user.status = "inactive"
    user.updated_at = datetime.utcnow()
    session.add(user)

    # Audit log
    reason = (payload or {}).get("reason") if isinstance(payload, dict) else None
    audit_log = AdminAuditLog(
        admin_user_id=current_user.id,
        action="user_suspended",
        target_type="user",
        target_id=user_id,
        description="Deactivated user account",
        action_metadata=json.dumps({"old_status": old_status, "new_status": "inactive", "reason": reason}),
        site_id=current_site.id
    )
    session.add(audit_log)
    await session.commit()

    return {"message": "User deactivated"}

@router.patch("/users/{user_id}/soft-delete")
async def soft_delete_user(
    user_id: uuid.UUID,
    payload: Optional[Dict[str, Any]] = None,
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Soft delete a user account (sets status to 'deleted')."""
    query = select(User).where(User.id == user_id, User.site_id == current_site.id)
    res = await session.exec(query)
    user = res.first()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if str(current_user.id) == str(user_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account")

    if user.status == "deleted":
        return {"message": "User is already deleted"}

    old_status = user.status
    user.status = "deleted"
    user.updated_at = datetime.utcnow()
    session.add(user)

    # Audit log
    reason = (payload or {}).get("reason") if isinstance(payload, dict) else None
    audit_log = AdminAuditLog(
        admin_user_id=current_user.id,
        action="user_deleted",
        target_type="user",
        target_id=user_id,
        description="Soft deleted user account",
        action_metadata=json.dumps({"old_status": old_status, "new_status": "deleted", "reason": reason}),
        site_id=current_site.id
    )
    session.add(audit_log)
    await session.commit()

    return {"message": "User soft deleted"}


@router.patch("/users/{user_id}/reactivate")
async def reactivate_user(
    user_id: uuid.UUID,
    payload: Optional[Dict[str, Any]] = None,
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Reactivate a user account (sets status to 'active')."""
    query = select(User).where(User.id == user_id, User.site_id == current_site.id)
    res = await session.exec(query)
    user = res.first()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.status == "active":
        return {"message": "User is already active"}

    old_status = user.status
    user.status = "active"
    user.updated_at = datetime.utcnow()
    session.add(user)

    # Audit log
    reason = (payload or {}).get("reason") if isinstance(payload, dict) else None
    audit_log = AdminAuditLog(
        admin_user_id=current_user.id,
        action="user_activated",
        target_type="user",
        target_id=user_id,
        description="Reactivated user account",
        action_metadata=json.dumps({"old_status": old_status, "new_status": "active", "reason": reason}),
        site_id=current_site.id
    )
    session.add(audit_log)
    await session.commit()

    return {"message": "User reactivated"}


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: uuid.UUID,
    status: str,
    reason: Optional[str] = None,
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Update user status"""
    if status not in ["active", "inactive", "suspended"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    
    query = select(User).where(User.id == user_id, User.site_id == current_site.id)
    res = await session.exec(query)
    user = res.first()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    old_status = user.status
    user.status = status
    user.updated_at = datetime.utcnow()
    session.add(user)
    
    # Log admin action
    audit_log = AdminAuditLog(
        admin_user_id=current_user.id,
        action="user_status_changed",
        target_type="user",
        target_id=user_id,
        description=f"Changed user status from {old_status} to {status}",
        action_metadata=json.dumps({"old_status": old_status, "new_status": status, "reason": reason}),
        site_id=current_site.id
    )
    session.add(audit_log)
    await session.commit()
    
    return {"message": f"User status updated to {status}"}

@router.put("/courses/{course_id}/status")
async def update_course_status(
    course_id: uuid.UUID,
    status: str,
    reason: Optional[str] = None,
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Update course status"""
    if status not in ["draft", "published", "archived", "suspended"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    
    query = select(Course).where(Course.id == course_id, Course.site_id == current_site.id)
    res = await session.exec(query)
    course = res.first()
    
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    
    old_status = course.status
    course.status = status
    course.updated_at = datetime.utcnow()
    session.add(course)
    
    # Log admin action
    audit_log = AdminAuditLog(
        admin_user_id=current_user.id,
        action="course_status_changed",
        target_type="course",
        target_id=course_id,
        description=f"Changed course status from {old_status} to {status}",
        action_metadata=json.dumps({"old_status": old_status, "new_status": status, "reason": reason}),
        site_id=current_site.id
    )
    session.add(audit_log)
    await session.commit()
    
    return {"message": f"Course status updated to {status}"}

@router.get("/audit-log", response_model=PaginatedResponse)
async def get_audit_log(
    pagination: PaginationParams = Depends(),
    admin_user_id: Optional[uuid.UUID] = Query(None),
    action: Optional[str] = Query(None),
    target_type: Optional[str] = Query(None),
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Get admin audit log"""
    offset = (pagination.page - 1) * pagination.size
    
    query = select(
        AdminAuditLog, 
        User.first_name.label("admin_first_name"), 
        User.last_name.label("admin_last_name")
    ).join(User, AdminAuditLog.admin_user_id == User.id).where(AdminAuditLog.site_id == current_site.id)
    
    if admin_user_id:
        query = query.where(AdminAuditLog.admin_user_id == admin_user_id)
    if action:
        query = query.where(AdminAuditLog.action == action)
    if target_type:
        query = query.where(AdminAuditLog.target_type == target_type)
        
    # Count
    count_query = select(func.count(AdminAuditLog.id)).where(AdminAuditLog.site_id == current_site.id)
    if admin_user_id: count_query = count_query.where(AdminAuditLog.admin_user_id == admin_user_id)
    if action: count_query = count_query.where(AdminAuditLog.action == action)
    if target_type: count_query = count_query.where(AdminAuditLog.target_type == target_type)
    
    total = (await session.exec(count_query)).one()
    
    # Pagination & Ordering
    query = query.order_by(desc(AdminAuditLog.created_at)).offset(offset).limit(pagination.size)
    results = await session.exec(query)
    
    transformed = []
    for log, f_name, l_name in results.all():
        l_dict = log.model_dump()
        l_dict.update({
            "admin_first_name": f_name,
            "admin_last_name": l_name
        })
        transformed.append(l_dict)
        
    return PaginatedResponse(
        items=transformed,
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
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Generate admin reports"""
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    try:
        # NOTE: Many of these sub-calls still use legacy database.fetch
        # We'll need to migrate utils/analytics.py later
        if report_type == "platform_overview":
            report_data = await get_platform_kpis(session, start_date, end_date, site_id=current_site.id)
        elif report_type == "user_engagement":
            query = select(User).where(User.status == 'active', User.role == 'student', User.site_id == current_site.id).order_by(desc(User.created_at)).limit(100)
            users = (await session.exec(query)).all()
            
            engagement_data = []
            for user in users:
                engagement = await UserAnalytics.get_user_engagement_score(session, user.id)
                engagement_data.append({
                    "user_id": user.id,
                    "name": f"{user.first_name} {user.last_name}",
                    "email": user.email,
                    **engagement
                })
            report_data = {"user_engagement": engagement_data}
        elif report_type == "course_performance":
            top_courses = await get_top_performing_content(session, "courses", "enrollments", 20, start_date, end_date, site_id=current_site.id)
            course_health = []
            for course in top_courses:
                health = await CourseAnalytics.calculate_course_health_score(session, course["id"])
                course_health.append({"course_id": course["id"], "title": course["title"], **health})
            report_data = {"course_performance": course_health}
        elif report_type == "revenue_analysis":
            report_data = {"revenue_analysis": await RevenueAnalytics.calculate_revenue_metrics(session, start_date, end_date, site_id=current_site.id)}
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid report type")
        
        # Log report generation
        audit_log = AdminAuditLog(
            admin_user_id=current_user.id,
            action="report_generated",
            target_type="system",
            description=f"Generated {report_type} report",
            action_metadata=json.dumps({"report_type": report_type, "start_date": str(start_date), "end_date": str(end_date)}),
            site_id=current_site.id
        )
        session.add(audit_log)
        await session.commit()
        
        return {
            "report_type": report_type,
            "generated_at": datetime.utcnow(),
            "date_range": {"start_date": start_date, "end_date": end_date},
            "data": report_data
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to generate report: {str(e)}")

@router.post("/export")
async def export_admin_data(
    export_type: str = Body(...),
    format: str = Body("json"),
    filters: Optional[Dict[str, Any]] = Body(None),
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Export admin data"""
    if format not in ["json", "csv"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid export format. Supported: json, csv")
    
    try:
        export_data = []
        if export_type == "users":
            enrollment_count_sub = select(func.count(Enrollment.id)).where(Enrollment.user_id == User.id, Enrollment.site_id == current_site.id).scalar_subquery()
            cert_count_sub = select(func.count(Certificate.id)).where(Certificate.user_id == User.id, Certificate.site_id == current_site.id).scalar_subquery()
            token_balance_sub = select(TokenBalance.balance).where(TokenBalance.user_id == User.id, TokenBalance.site_id == current_site.id).limit(1).scalar_subquery()
            completion_count_sub = select(func.count(Enrollment.id)).where(Enrollment.user_id == User.id, Enrollment.status == 'completed', Enrollment.site_id == current_site.id).scalar_subquery()

            query = select(
                User,
                enrollment_count_sub.label("total_enrollments"),
                cert_count_sub.label("total_certificates"),
                token_balance_sub.label("token_balance"),
                completion_count_sub.label("completed_courses")
            )
            
            query = query.where(User.site_id == current_site.id)

            if filters:
                if filters.get("role"): query = query.where(User.role == filters["role"])
                if filters.get("status"): query = query.where(User.status == filters["status"])
                if filters.get("search"):
                    s = filters["search"]
                    query = query.where(or_(User.first_name.ilike(f"%{s}%"), User.last_name.ilike(f"%{s}%"), User.email.ilike(f"%{s}%")))

            results = await session.exec(query.order_by(desc(User.created_at)))
            for user, en_count, cert_count, tokens, comp_count in results.all():
                u_dict = user.model_dump()
                u_dict.update({
                    "total_enrollments": en_count,
                    "total_certificates": cert_count,
                    "token_balance": tokens,
                    "completed_courses": comp_count
                })
                export_data.append(u_dict)

        elif export_type == "courses":
            from models.lesson import Lesson
            lesson_count_sub = select(func.count(Lesson.id)).where(Lesson.course_id == Course.id, Lesson.site_id == current_site.id).scalar_subquery()
            revenue_sum_sub = select(func.coalesce(func.sum(RevenueRecord.amount), 0)).where(
                RevenueRecord.course_id == Course.id, RevenueRecord.status == 'completed', RevenueRecord.site_id == current_site.id
            ).scalar_subquery()

            from models.user import User as Instructor
            query = select(Course, Instructor.first_name, Instructor.last_name, Category.name, lesson_count_sub, revenue_sum_sub).outerjoin(Instructor, Course.instructor_id == Instructor.id).outerjoin(Category, Course.category_id == Category.id).where(Course.site_id == current_site.id)
            
            if filters:
                if filters.get("status"): query = query.where(Course.status == filters["status"])
                if filters.get("instructor_id"): query = query.where(Course.instructor_id == filters["instructor_id"])

            results = await session.exec(query.order_by(desc(Course.created_at)))
            for course, i_fname, i_lname, cat_name, l_count, rev_sum in results.all():
                c_dict = course.model_dump()
                c_dict.update({
                    "instructor_name": f"{i_fname or ''} {i_lname or ''}".strip(),
                    "category_name": cat_name,
                    "total_lessons": l_count,
                    "total_revenue": float(rev_sum)
                })
                export_data.append(c_dict)
        
        elif export_type == "enrollments":
            query = select(Enrollment, User.first_name, User.last_name, User.email, Course.title).join(User, Enrollment.user_id == User.id).join(Course, Enrollment.course_id == Course.id).where(Enrollment.site_id == current_site.id).order_by(desc(Enrollment.enrolled_at))
            results = await session.exec(query)
            for enroll, u_fname, u_lname, u_email, c_title in results.all():
                e_dict = enroll.model_dump()
                e_dict.update({"user_first_name": u_fname, "user_last_name": u_lname, "user_email": u_email, "course_title": c_title})
                export_data.append(e_dict)

        elif export_type == "revenue":
            query = select(RevenueRecord, User.first_name, User.last_name, User.email, Course.title).join(User, RevenueRecord.user_id == User.id).outerjoin(Course, RevenueRecord.course_id == Course.id).where(RevenueRecord.site_id == current_site.id).order_by(desc(RevenueRecord.created_at))
            results = await session.exec(query)
            for rev, u_fname, u_lname, u_email, c_title in results.all():
                r_dict = rev.model_dump()
                r_dict.update({"user_first_name": u_fname, "user_last_name": u_lname, "user_email": u_email, "course_title": c_title})
                export_data.append(r_dict)
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid export type")

        # Log export action
        audit_log = AdminAuditLog(
            admin_user_id=current_user.id,
            action="data_exported",
            target_type="system",
            description=f"Exported {export_type} data as {format}",
            action_metadata=json.dumps({"export_type": export_type, "format": format}),
            site_id=current_site.id
        )
        session.add(audit_log)
        await session.commit()

        if format == "csv":
            import csv
            output = io.StringIO()
            if export_data:
                writer = csv.DictWriter(output, fieldnames=export_data[0].keys())
                writer.writeheader()
                writer.writerows(export_data)
            
            output.seek(0)
            from fastapi.responses import StreamingResponse
            filename = f"{export_type}_export_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}.csv"
            return StreamingResponse(
                iter([output.getvalue()]),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
        
        return {
            "export_type": export_type,
            "format": format,
            "exported_at": datetime.utcnow(),
            "record_count": len(export_data),
            "data": export_data
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Export failed: {str(e)}")

@router.post("/import")
async def import_admin_data_endpoint(
    file: UploadFile = File(...),
    import_type: str = Form(...),
    current_user = Depends(require_admin),
    current_site: Site = Depends(get_current_site)
):
    """Import admin data from CSV file"""
    return await import_admin_data(file, import_type, current_user, site_id=current_site.id)

@router.get("/system-health")
async def get_system_health(
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """Get system health status"""
    from sqlalchemy import text
    try:
        # Check database connection
        await session.exec(text("SELECT 1"))
        db_status = "healthy"
        
        # Check recent error rates (last hour)
        hour_ago = datetime.utcnow() - timedelta(hours=1)
        error_query = select(func.count(AdminAuditLog.id)).where(AdminAuditLog.action.ilike("%error%"), AdminAuditLog.created_at >= hour_ago, AdminAuditLog.site_id == current_site.id)
        error_count = (await session.exec(error_query)).one()
        
        # Check system performance metrics (last hour)
        perf_query = select(
            func.count(AdminAuditLog.id).label("total_requests"),
            # Placeholder for response time if not tracked in audit log
            # In a real app we might have a specific metrics table
        ).where(AdminAuditLog.created_at >= hour_ago, AdminAuditLog.site_id == current_site.id)
        perf_res = (await session.exec(perf_query)).one()
        
        return {
            "status": "healthy" if db_status == "healthy" and error_count < 10 else "degraded",
            "database": db_status,
            "error_count_1h": error_count,
            "total_requests_1h": perf_res,
            "timestamp": datetime.utcnow()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow()
        }

