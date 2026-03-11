from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Column, JSON, Relationship
import uuid

# Centralized default settings for all sites
DEFAULT_THEME_CONFIG: Dict[str, Any] = {
    "allow_registration": True,
    "require_email_verification": True,
    "enable_course_reviews": True,
    "auto_approve_courses": False,
    "enable_token_rewards": True,
    "default_token_reward": 25,
    "lesson_token_reward": 10,
    "quiz_token_reward": 15,
    "signup_token_reward": 25,
    "enable_notifications": True,
    "maintenance_mode": False,
    "primary_color": "#ef4444",
    "secondary_color": "#3b82f6",
    "accent_color": "#8b5cf6",
}


def get_default_theme_config() -> Dict[str, Any]:
    """Return a copy of the default theme configuration."""
    return DEFAULT_THEME_CONFIG.copy()


class Site(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    subdomain: str = Field(index=True, unique=True)
    custom_domain: Optional[str] = Field(default=None, index=True)
    name: str
    logo_url: Optional[str] = None
    theme_config: Dict[str, Any] = Field(
        default_factory=get_default_theme_config, 
        sa_column=Column(JSON)
    )
    owner_id: uuid.UUID
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships will be added as other models are defined
