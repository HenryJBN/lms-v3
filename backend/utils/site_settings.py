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


def get_lesson_token_reward(site: Site) -> int:
    """
    Get the token reward amount for completing a lesson.
    
    Default: 10 tokens
    """
    return int(get_site_setting(site, "lesson_token_reward", 10))


def get_quiz_token_reward(site: Site) -> int:
    """
    Get the token reward amount for passing a quiz.
    
    Default: 15 tokens
    """
    return int(get_site_setting(site, "quiz_token_reward", 15))


def get_signup_token_reward(site: Site) -> int:
    """
    Get the token reward amount for new user registration.
    
    Default: 25 tokens
    """
    return int(get_site_setting(site, "signup_token_reward", 25))


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


# Email/SMTP Configuration Helpers

def get_smtp_host(site: Site) -> Optional[str]:
    """
    Get SMTP host from site configuration.

    Returns:
        SMTP host or None if not configured
    """
    return get_site_setting(site, "smtp_host")


def get_smtp_port(site: Site) -> int:
    """
    Get SMTP port from site configuration.

    Returns:
        SMTP port (default: 587)
    """
    return int(get_site_setting(site, "smtp_port", 587))


def get_smtp_username(site: Site) -> Optional[str]:
    """
    Get SMTP username from site configuration.

    Returns:
        SMTP username or None if not configured
    """
    return get_site_setting(site, "smtp_username")


def get_smtp_password(site: Site) -> Optional[str]:
    """
    Get encrypted SMTP password from site configuration.

    Note: This returns the encrypted value. Use decrypt_credential() to decrypt.

    Returns:
        Encrypted SMTP password or None if not configured
    """
    return get_site_setting(site, "smtp_password")


def get_smtp_from_email(site: Site) -> Optional[str]:
    """
    Get SMTP from email address from site configuration.

    Returns:
        From email address or None if not configured
    """
    return get_site_setting(site, "smtp_from_email")


def get_smtp_from_name(site: Site) -> Optional[str]:
    """
    Get SMTP from name from site configuration.

    Returns:
        From name or site name as fallback
    """
    from_name = get_site_setting(site, "smtp_from_name")
    if from_name:
        return from_name
    # Fallback to site name
    return site.name if site else None


def has_custom_email_config(site: Site) -> bool:
    """
    Check if the site has custom email configuration.

    Returns:
        True if site has configured SMTP settings
    """
    return bool(get_smtp_host(site) and get_smtp_username(site) and get_smtp_password(site))
