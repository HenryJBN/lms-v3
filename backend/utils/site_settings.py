"""
Site Settings Utilities

Helper functions to retrieve and check site-specific settings from theme_config.
All settings are tenant-scoped and stored in the Site model's theme_config JSON field.
"""

from typing import Any, Optional
from uuid import UUID
from models.site import Site


def get_site_setting(site: Site, key: str, default: Any = None) -> Any:
    """
    Get a setting value from site's theme_config.
    
    Args:
        site: Site model instance
        key: Setting key to retrieve
        default: Default value if key not found
        
    Returns:
        Setting value or default
    """
    if not site or not site.theme_config:
        return default
    return site.theme_config.get(key, default)


def is_registration_enabled(site: Site) -> bool:
    """
    Check if user registration is enabled for this site.
    
    Default: True (registration allowed)
    """
    return get_site_setting(site, "allow_registration", True)


def is_email_verification_required(site: Site) -> bool:
    """
    Check if email verification is required for new users.
    
    Default: True (verification required)
    """
    return get_site_setting(site, "require_email_verification", True)


def are_course_reviews_enabled(site: Site) -> bool:
    """
    Check if course reviews are enabled.
    
    Default: True (reviews enabled)
    """
    return get_site_setting(site, "enable_course_reviews", True)


def are_courses_auto_approved(site: Site) -> bool:
    """
    Check if new courses are automatically approved/published.
    
    Default: False (manual approval required)
    """
    return get_site_setting(site, "auto_approve_courses", False)


def are_token_rewards_enabled(site: Site) -> bool:
    """
    Check if token rewards are enabled for course completion.
    
    Default: True (rewards enabled)
    """
    return get_site_setting(site, "enable_token_rewards", True)


def get_default_token_reward(site: Site) -> int:
    """
    Get the default token reward amount for course completion.
    
    Default: 25 tokens
    """
    return int(get_site_setting(site, "default_token_reward", 25))


def are_notifications_enabled(site: Site) -> bool:
    """
    Check if email notifications are enabled.
    
    Default: True (notifications enabled)
    """
    return get_site_setting(site, "enable_notifications", True)


def is_maintenance_mode(site: Site) -> bool:
    """
    Check if the site is in maintenance mode.
    
    Default: False (site is active)
    """
    return get_site_setting(site, "maintenance_mode", False)


def get_site_description(site: Site) -> Optional[str]:
    """Get site description from theme_config."""
    return get_site_setting(site, "description")


def get_support_email(site: Site) -> Optional[str]:
    """Get support email from theme_config."""
    return get_site_setting(site, "support_email")


def get_theme_colors(site: Site) -> dict:
    """
    Get theme color configuration.
    
    Returns:
        Dict with primary_color, secondary_color, accent_color
    """
    return {
        "primary_color": get_site_setting(site, "primary_color", "#ef4444"),
        "secondary_color": get_site_setting(site, "secondary_color", "#3b82f6"),
        "accent_color": get_site_setting(site, "accent_color", "#8b5cf6"),
    }
