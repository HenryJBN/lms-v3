from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
import uuid

class SiteSettings(BaseModel):
    name: str
    description: Optional[str] = None
    support_email: Optional[EmailStr] = None
    logo_url: Optional[str] = None
    theme_config: Dict[str, Any] = {}
    is_active: bool
    # Email configuration fields (masked for security)
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None  # Will show "***configured***" if set
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None

class SiteSettingsUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    support_email: Optional[EmailStr] = None
    theme_config: Optional[Dict[str, Any]] = None
    # Email configuration fields
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None  # Write-only - will be encrypted
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None
