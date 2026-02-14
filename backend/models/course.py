from typing import Optional, List
from datetime import datetime
import uuid
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, JSON
from models.enums import CourseLevel, CourseStatus
from models.base import MultiTenantMixin

class Category(MultiTenantMixin, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(index=True)
    slug: str = Field(index=True, unique=True)
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    parent_id: Optional[uuid.UUID] = Field(default=None, foreign_key="category.id")
    sort_order: int = Field(default=0)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Course(MultiTenantMixin, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    instructor_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    category_id: Optional[uuid.UUID] = Field(default=None, foreign_key="category.id", index=True)
    
    title: str
    slug: str = Field(index=True)
    description: Optional[str] = None
    short_description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    trailer_video_url: Optional[str] = None
    
    level: CourseLevel = Field(default=CourseLevel.beginner)
    price: float = Field(default=0.0)
    original_price: Optional[float] = None
    currency: str = Field(default="USD")
    duration_hours: Optional[int] = None
    language: str = Field(default="en")
    
    status: CourseStatus = Field(default=CourseStatus.draft)
    
    is_featured: bool = Field(default=False)
    is_free: bool = Field(default=False)
    enrollment_limit: Optional[int] = None
    
    total_students: int = Field(default=0)
    rating: float = Field(default=0.0)
    token_reward: int = Field(default=0)
    
    # Content fields
    requirements: List[str] = Field(default=[], sa_column=Column(JSON))
    learning_outcomes: List[str] = Field(default=[], sa_column=Column(JSON))
    target_audience: Optional[str] = None
    tags: List[str] = Field(default=[], sa_column=Column(JSON))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Section(MultiTenantMixin, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", index=True)
    title: str
    description: Optional[str] = None
    sort_order: int = Field(default=0)
    is_published: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CourseReview(MultiTenantMixin, table=True):
    __tablename__ = "course_reviews"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", index=True)
    
    rating: int = Field(default=5)
    comment: Optional[str] = None
    is_published: bool = Field(default=True)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
