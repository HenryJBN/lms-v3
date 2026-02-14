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

class SiteSettingsUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    support_email: Optional[EmailStr] = None
    theme_config: Optional[Dict[str, Any]] = None
