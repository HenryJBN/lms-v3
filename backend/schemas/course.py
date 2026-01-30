from typing import Optional, List, Any
from datetime import datetime
from pydantic import computed_field, validator, BaseModel
import uuid

from schemas.common import BaseSchema
from models.enums import CourseLevel, CourseStatus

# Category schemas
class CategoryBase(BaseSchema):
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None
    sort_order: int = 0
    is_active: bool = True

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseSchema):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None

class CategoryResponse(CategoryBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

# Course schemas
class CourseBase(BaseSchema):
    title: str
    slug: str
    description: Optional[str] = None
    short_description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    trailer_video_url: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    level: CourseLevel = CourseLevel.beginner
    price: float = 0
    original_price: Optional[float] = None
    currency: str = "USD"
    duration_hours: Optional[int] = None
    language: str = "en"
    requirements: List[str] = []
    learning_outcomes: List[str] = []
    target_audience: Optional[str] = None
    tags: List[str] = []
    is_featured: bool = False
    is_free: bool = False
    enrollment_limit: Optional[int] = None

class CourseCreate(CourseBase):
    pass

class CourseUpdate(BaseSchema):
    title: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    trailer_video_url: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    level: Optional[CourseLevel] = None
    price: Optional[float] = None
    original_price: Optional[float] = None
    duration_hours: Optional[int] = None
    requirements: Optional[List[str]] = None
    learning_outcomes: Optional[List[str]] = None
    target_audience: Optional[str] = None
    tags: Optional[List[str]] = None
    is_featured: Optional[bool] = None
    is_free: Optional[bool] = None
    enrollment_limit: Optional[int] = None

class CourseResponse(BaseModel): # Use BaseModel if config isn't enough, but BaseSchema has config.
    # Original used BaseModel with `class Config: orm_mode = True` inline.
    # BaseSchema matches that.
    # Note `is_enrolled` is computed often or set manually, doesn't map directly to DB often.
    
    id: uuid.UUID
    title: str
    slug: str
    description: Optional[str] = None
    short_description: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    instructor_id: Optional[uuid.UUID] = None
    status: str
    thumbnail_url: Optional[str] = None
    trailer_video_url: Optional[str] = None
    level: Optional[str] = None 
    is_free: Optional[bool] = None
    is_featured: Optional[bool] = None
    duration_hours: Optional[float] = 0.0
    total_students: Optional[int] = 0
    rating: Optional[float] = 0.0
    price: Optional[float] = 0.0
    token_reward: Optional[int] = 0
    is_enrolled: Optional[bool] = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    instructor_first_name: Optional[str] = None
    instructor_last_name: Optional[str] = None
    category_name: Optional[str] = None

    @computed_field
    def instructor_name(self) -> str:
        if self.instructor_first_name or self.instructor_last_name:
            return f"{self.instructor_first_name or ''} {self.instructor_last_name or ''}".strip()
        return "Unknown Instructor"

    class Config:
        from_attributes = True

class AdminCourseResponse(CourseResponse):
    total_lessons: Optional[int] = None
    total_revenue: Optional[float] = None

# Review schemas
class ReviewBase(BaseSchema):
    rating: int
    title: Optional[str] = None
    comment: Optional[str] = None
    
    @validator('rating')
    def validate_rating(cls, v):
        if v < 1 or v > 5:
            raise ValueError('Rating must be between 1 and 5')
        return v

class ReviewCreate(ReviewBase):
    course_id: uuid.UUID

class ReviewUpdate(BaseSchema):
    rating: Optional[int] = None
    title: Optional[str] = None
    comment: Optional[str] = None
    
    @validator('rating')
    def validate_rating(cls, v):
        if v is not None and (v < 1 or v > 5):
            raise ValueError('Rating must be between 1 and 5')
        return v

class ReviewResponse(ReviewBase):
    id: uuid.UUID
    user_id: uuid.UUID
    course_id: uuid.UUID
    is_published: bool
    created_at: datetime
    updated_at: datetime
    user_last_name: Optional[str] = None
    user_avatar_url: Optional[str] = None

# Section schemas
class SectionBase(BaseSchema):
    title: str
    description: Optional[str] = None
    sort_order: int = 0
    is_published: bool = True

class SectionCreate(SectionBase):
    course_id: uuid.UUID

class SectionUpdate(BaseSchema):
    title: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None
    is_published: Optional[bool] = None

class SectionResponse(SectionBase):
    id: uuid.UUID
    course_id: uuid.UUID
    lesson_count: Optional[int] = 0
    created_at: datetime
    updated_at: datetime
