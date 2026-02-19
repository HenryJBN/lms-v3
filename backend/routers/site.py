from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from database.session import get_session
from dependencies import get_current_site
from models.site import Site
from utils.site_settings import get_theme_colors

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

