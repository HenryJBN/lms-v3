from typing import Optional, List
from datetime import datetime
import uuid
from pydantic import EmailStr
from .common import BaseSchema

class TenantCreate(BaseSchema):
    school_name: str
    subdomain: str
    admin_email: EmailStr
    admin_password: str
    admin_first_name: str
    admin_last_name: str

class SiteResponse(BaseSchema):
    id: uuid.UUID
    name: str
    subdomain: str
    domain: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Extra stats for super admin
    user_count: Optional[int] = 0
    course_count: Optional[int] = 0

class SiteUpdate(BaseSchema):
    name: Optional[str] = None
    is_active: Optional[bool] = None

class SubdomainCheck(BaseSchema):
    subdomain: str
    available: bool
    message: Optional[str] = None
