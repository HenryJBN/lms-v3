from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
from sqlmodel import select, func, and_, desc, extract
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_session
from models.site import Site
from models.user import User
from models.course import Course
from models.enrollment import Enrollment
from schemas.system_admin import SiteResponse, SiteUpdate
from schemas.common import PaginationParams, PaginatedResponse
from middleware.auth import require_super_admin

router = APIRouter()

@router.get("/sites", response_model=PaginatedResponse[SiteResponse])
async def list_all_sites(
    pagination: PaginationParams = Depends(),
    name: Optional[str] = Query(None),
    subdomain: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    session: AsyncSession = Depends(get_session),
    super_admin = Depends(require_super_admin)
):
    """List all sites/tenants with basic statistics, pagination and filtering"""
    query = select(Site)
    
    if name:
        query = query.where(Site.name.ilike(f"%{name}%"))
    if subdomain:
        query = query.where(Site.subdomain.ilike(f"%{subdomain}%"))
    if is_active is not None:
        query = query.where(Site.is_active == is_active)
        
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await session.exec(count_query)).one()
    
    # Pagination
    query = query.order_by(Site.created_at.desc())
    query = query.offset((pagination.page - 1) * pagination.size).limit(pagination.size)
    
    result = await session.exec(query)
    sites = result.all()
    
    items = []
    for site in sites:
        # Get counts for each site
        user_count_query = select(func.count(User.id)).where(User.site_id == site.id)
        course_count_query = select(func.count(Course.id)).where(Course.site_id == site.id)
        
        user_count = (await session.exec(user_count_query)).one()
        course_count = (await session.exec(course_count_query)).one()
        
        site_data = site.model_dump()
        site_data.update({
            "user_count": user_count,
            "course_count": course_count
        })
        items.append(SiteResponse(**site_data))
        
    return PaginatedResponse(
        items=items,
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=(total + pagination.size - 1) // pagination.size
    )

@router.get("/sites/{site_id}", response_model=SiteResponse)
async def get_site_details(
    site_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    super_admin = Depends(require_super_admin)
):
    """Get detailed information for a specific site"""
    site = await session.get(Site, site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
        
    user_count = (await session.exec(select(func.count(User.id)).where(User.site_id == site.id))).one()
    course_count = (await session.exec(select(func.count(Course.id)).where(Course.site_id == site.id))).one()
    
    site_data = site.model_dump()
    site_data.update({
        "user_count": user_count,
        "course_count": course_count
    })
    return SiteResponse(**site_data)

@router.patch("/sites/{site_id}", response_model=SiteResponse)
async def update_site_status(
    site_id: uuid.UUID,
    site_update: SiteUpdate,
    session: AsyncSession = Depends(get_session),
    super_admin = Depends(require_super_admin)
):
    """Update site status (e.g., suspend/activate)"""
    site = await session.get(Site, site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
        
    update_data = site_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(site, key, value)
        
    session.add(site)
    await session.commit()
    await session.refresh(site)
    
    return await get_site_details(site.id, session, super_admin)

@router.get("/stats/global")
async def get_global_stats(
    session: AsyncSession = Depends(get_session),
    super_admin = Depends(require_super_admin)
):
    """Get platform-wide statistics"""
    total_sites = (await session.exec(select(func.count(Site.id)))).one()
    total_users = (await session.exec(select(func.count(User.id)))).one()
    total_courses = (await session.exec(select(func.count(Course.id)))).one()
    total_enrollments = (await session.exec(select(func.count(Enrollment.id)))).one()
    
    # Get changes in the last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    new_sites = (await session.exec(select(func.count(Site.id)).where(Site.created_at >= thirty_days_ago))).one()
    new_users = (await session.exec(select(func.count(User.id)).where(User.created_at >= thirty_days_ago))).one()
    
    return {
        "total_sites": total_sites,
        "total_users": total_users,
        "total_courses": total_courses,
        "total_enrollments": total_enrollments,
        "new_sites_30d": new_sites,
        "new_users_30d": new_users
    }

@router.get("/stats/activity")
async def get_activity_stats(
    limit: int = Query(5, ge=1, le=20),
    session: AsyncSession = Depends(get_session),
    super_admin = Depends(require_super_admin)
):
    """Get recent platform activity"""
    # Recent Sites
    recent_sites_query = select(Site).order_by(desc(Site.created_at)).limit(limit)
    recent_sites = (await session.exec(recent_sites_query)).all()
    
    # Recent Users
    recent_users_query = select(User).order_by(desc(User.created_at)).limit(limit)
    recent_users = (await session.exec(recent_users_query)).all()
    
    # Recent Enrollments
    # We join with Site and Course to get more context
    recent_enrollments_query = select(Enrollment, User.email, Site.name).join(
        User, Enrollment.user_id == User.id
    ).join(
        Site, User.site_id == Site.id
    ).order_by(desc(Enrollment.created_at)).limit(limit)
    
    recent_enrollments = (await session.exec(recent_enrollments_query)).all()
    
    activity = []
    
    for s in recent_sites:
        activity.append({
            "type": "site_registered",
            "title": f"New Site: {s.name}",
            "description": f"Subdomain: {s.subdomain}",
            "timestamp": s.created_at,
            "id": str(s.id)
        })
        
    for u in recent_users:
        activity.append({
            "type": "user_joined",
            "title": f"User Joined: {u.email}",
            "description": f"Role: {u.role}",
            "timestamp": u.created_at,
            "id": str(u.id)
        })
        
    for e, email, site_name in recent_enrollments:
        activity.append({
            "type": "course_enrollment",
            "title": f"Enrollment in {site_name}",
            "description": f"User: {email}",
            "timestamp": e.created_at,
            "id": str(e.id)
        })
        
    # Sort all by timestamp
    activity.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return activity[:limit*2]

@router.get("/stats/growth")
async def get_growth_stats(
    months: int = Query(6, ge=1, le=12),
    session: AsyncSession = Depends(get_session),
    super_admin = Depends(require_super_admin)
):
    """Get growth data for charts"""
    stats = []
    now = datetime.utcnow()
    
    for i in range(months):
        date = now - timedelta(days=i*30)
        month_start = date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)
        
        sites_count = (await session.exec(select(func.count(Site.id)).where(
            and_(Site.created_at >= month_start, Site.created_at <= month_end)
        ))).one()
        
        users_count = (await session.exec(select(func.count(User.id)).where(
            and_(User.created_at >= month_start, User.created_at <= month_end)
        ))).one()
        
        enrollments_count = (await session.exec(select(func.count(Enrollment.id)).where(
            and_(Enrollment.created_at >= month_start, Enrollment.created_at <= month_end)
        ))).one()
        
        stats.append({
            "month": month_start.strftime("%b %Y"),
            "sites": sites_count,
            "users": users_count,
            "enrollments": enrollments_count,
            "timestamp": month_start
        })
        
    stats.reverse()
    return stats
