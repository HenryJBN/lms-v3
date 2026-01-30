from pydantic import EmailStr, validator, computed_field
from typing import Optional, List
from datetime import datetime
import uuid

from schemas.common import BaseSchema
from models.enums import UserRole, UserStatus

class UserBase(BaseSchema):
    email: EmailStr
    username: str
    first_name: str
    last_name: str
    role: UserRole = UserRole.student
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    timezone: str = "UTC"
    language: str = "en"

    @computed_field
    def name(self) -> str:
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.first_name or self.last_name or " "

class BasicUser(BaseSchema):
    email: EmailStr
    first_name: str
    last_name: str
    role: UserRole = UserRole.student

class UserCreate(UserBase):
    password: str

    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class UserUpdate(BaseSchema):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    avatar_url: Optional[str] = None

class UserResponse(UserBase):
    id: uuid.UUID
    site_id: uuid.UUID
    status: UserStatus
    email_verified: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class UserProfile(BaseSchema):
    title: Optional[str] = None
    company: Optional[str] = None
    website: Optional[str] = None
    linkedin_url: Optional[str] = None
    twitter_url: Optional[str] = None
    github_url: Optional[str] = None
    location: Optional[str] = None
    interests: List[str] = []
    skills: List[str] = []
    experience_level: Optional[str] = None
    learning_goals: Optional[str] = None
    country: Optional[str] = None
    age_range: Optional[str] = None

class AdminUserResponse(UserResponse):
    total_enrollments: Optional[int] = None
    completed_courses: Optional[int] = None
    total_certificates: Optional[int] = None
    token_balance: Optional[float] = None
