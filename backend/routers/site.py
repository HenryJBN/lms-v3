from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from database.session import get_session
from dependencies import get_current_site
from models.site import Site
from models.user import User
from models.course import Course
from models.enrollment import Enrollment, Certificate
from models.system import SystemConfig
from utils.site_settings import get_theme_colors
from sqlmodel import select, func

router = APIRouter()

@router.get("/theme")
async def get_site_theme(
    current_site: Site = Depends(get_current_site)
):
    """
    Public endpoint to get tenant theme configuration.
    No authentication required - used for styling the frontend.
    """
    theme_colors = get_theme_colors(current_site)
    
    return {
        "site_name": current_site.name,
        "logo_url": current_site.logo_url,
        "primary_color": theme_colors["primary_color"],
        "secondary_color": theme_colors["secondary_color"],
        "accent_color": theme_colors["accent_color"],
    }

@router.get("/info")
async def get_site_info(
    current_site: Site = Depends(get_current_site)
):
    """
    Public endpoint to get basic site information.
    No authentication required.
    """
    config = current_site.theme_config or {}
    
    return {
        "name": current_site.name,
        "description": config.get("description"),
        "logo_url": current_site.logo_url,
        "support_email": config.get("support_email"),
    }

@router.get("/global/theme")
async def get_global_theme(session: AsyncSession = Depends(get_session)):
    """
    Public endpoint to get the global platform theme and settings.
    No authentication required.
    """
    # Fetch platform name from SystemConfig
    result = await session.exec(select(SystemConfig).where(SystemConfig.key == "site_name"))
    site_name_config = result.first()
    site_name = site_name_config.value if site_name_config else "DCA LMS"
    
    return {
        "site_name": site_name,
        "logo_url": None, # Could be fetched from config if available
        "primary_color": "#A40100", # Red 500
        "secondary_color": "#000000", # Black
        "accent_color": "#A40100", # Red 400
    }

@router.get("/global/stats")
async def get_public_global_stats(session: AsyncSession = Depends(get_session)):
    """
    Public endpoint to get global platform statistics for the homepage.
    No authentication required.
    """
    total_sites = (await session.exec(select(func.count(Site.id)).where(Site.is_active == True))).one()
    total_students = (await session.exec(select(func.count(User.id)).where(User.role == "student"))).one()
    total_courses = (await session.exec(select(func.count(Course.id)).where(Course.status == "published"))).one()
    total_enrollments = (await session.exec(select(func.count(Enrollment.id)))).one()
    total_certificates = (await session.exec(select(func.count(Certificate.id)))).one()

    return {
        "total_schools": total_sites,
        "total_students": total_students,
        "total_courses": total_courses,
        "total_enrollments": total_enrollments,
        "total_certificates": total_certificates
    }

