from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import uuid
from sqlmodel import select, func, and_
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
    
    return {
        "total_sites": total_sites,
        "total_users": total_users,
        "total_courses": total_courses,
        "total_enrollments": total_enrollments
    }
