from typing import Optional
from datetime import datetime
import uuid
from sqlmodel import SQLModel, Field
from models.enums import UserRole, UserStatus

class User(SQLModel, table=True):
    __tablename__ = "users"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    site_id: uuid.UUID = Field(foreign_key="site.id", index=True)
    
    email: str = Field(index=True)
    username: str = Field(index=True)
    hashed_password: str
    
    first_name: str
    last_name: str
    role: UserRole = Field(default=UserRole.student)
    status: UserStatus = Field(default=UserStatus.active)
    
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    timezone: str = "UTC"
    language: str = "en"
    
    email_verified: bool = Field(default=False)
    
    last_login_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserProfile(SQLModel, table=True):
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
