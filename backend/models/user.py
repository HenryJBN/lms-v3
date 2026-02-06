from typing import Optional
from datetime import datetime
import uuid
from sqlmodel import SQLModel, Field
from models.enums import UserRole, UserStatus
from models.base import MultiTenantMixin

from sqlalchemy import Enum as SAEnum

class User(MultiTenantMixin, table=True):
    __tablename__ = "users"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    
    email: str = Field(index=True)
    username: str = Field(index=True)
    password_hash: str
    
    first_name: str
    last_name: str
    role: UserRole = Field(default=UserRole.student, sa_type=SAEnum(UserRole, name="user_role"))
    status: UserStatus = Field(default=UserStatus.active, sa_type=SAEnum(UserStatus, name="user_status"))
    
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    timezone: str = "UTC"
    language: str = "en"
    
    email_verified: bool = Field(default=False)
    
    last_login_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserProfile(MultiTenantMixin, table=True):
    __tablename__ = "user_profiles"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, unique=True)
    
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    
    phone: Optional[str] = None
    website: Optional[str] = None
    
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    
    age_range: Optional[str] = None
    gender: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
