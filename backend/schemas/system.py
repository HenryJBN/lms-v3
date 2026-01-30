from typing import Optional, List, Dict, Any
from datetime import datetime, date
import uuid
from schemas.common import BaseSchema
from schemas.course import CourseResponse
from schemas.user import UserResponse

class AdminDashboardStats(BaseSchema):
    total_users: int
    total_students: int
    total_instructors: int
    total_courses: int
    total_enrollments: int
    total_completions: int
    total_certificates: int
    total_revenue: float
    new_users_30d: int
    new_courses_30d: int
    new_enrollments_30d: int
    new_certificates_30d: int
    top_courses: List[Dict[str, Any]]
    recent_users: List[Dict[str, Any]]

class AdminCourseResponse(CourseResponse):
    total_lessons: Optional[int] = None
    total_revenue: Optional[float] = None # Duplication with course.py definition? 
    # Yes, I defined AdminCourseResponse in course.py too?
    # Let's check course.py. 
    # If I defined it there, I should remove it here or import it.
    # In course.py I defined it. So I won't redefine it here.
    # I'll just import it if needed or leave it in course.py.
    pass

class AdminAuditLog(BaseSchema):
    id: uuid.UUID
    admin_user_id: uuid.UUID
    action: str
    target_type: str
    target_id: Optional[uuid.UUID] = None
    description: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    admin_first_name: Optional[str] = None
    admin_last_name: Optional[str] = None

# Analytics schemas
class AnalyticsResponse(BaseSchema):
    period: Dict[str, datetime]
    data: Dict[str, Any]

class CourseAnalytics(BaseSchema):
    course_id: uuid.UUID
    course_title: str
    period: Dict[str, datetime]
    enrollments: Dict[str, Any]
    lessons: List[Dict[str, Any]]
    quizzes: List[Dict[str, Any]]
    revenue: Dict[str, Any]
    demographics: List[Dict[str, Any]]

class UserAnalytics(BaseSchema):
    date: date
    new_users: int
    active_users: int
    course_enrollments: int
    lesson_completions: int
    quiz_attempts: int
    tokens_earned: float
    certificates_issued: int

class RevenueAnalytics(BaseSchema):
    period: Dict[str, datetime]
    summary: Dict[str, Any]
    revenue_over_time: List[Dict[str, Any]]
    revenue_by_course: List[Dict[str, Any]]
    revenue_by_instructor: List[Dict[str, Any]]

class InstructorAnalytics(BaseSchema):
    instructor_id: uuid.UUID
    instructor_name: str
    period: Dict[str, datetime]
    courses: Dict[str, Any]
    revenue: Dict[str, Any]
    students: Dict[str, Any]
    top_courses: List[Dict[str, Any]]

class EngagementAnalytics(BaseSchema):
    period: Dict[str, datetime]
    daily_active_users: List[Dict[str, Any]]
    course_engagement: List[Dict[str, Any]]
    user_retention: List[Dict[str, Any]]

# File upload schemas
class FileUploadResponse(BaseSchema):
    filename: str
    url: str
    size: int
    content_type: str
    uploaded_at: datetime

class VideoUploadResponse(FileUploadResponse):
    duration: Optional[int] = None
    thumbnail_url: Optional[str] = None

# System configuration schemas
class SystemConfigBase(BaseSchema):
    key: str
    value: str
    description: Optional[str] = None
    is_public: bool = False

class SystemConfigCreate(SystemConfigBase):
    pass

class SystemConfigUpdate(BaseSchema):
    value: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None

class SystemConfigResponse(SystemConfigBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

# Webhook schemas
class WebhookBase(BaseSchema):
    url: str
    events: List[str]
    is_active: bool = True
    secret: Optional[str] = None

class WebhookCreate(WebhookBase):
    pass

class WebhookUpdate(BaseSchema):
    url: Optional[str] = None
    events: Optional[List[str]] = None
    is_active: Optional[bool] = None
    secret: Optional[str] = None

class WebhookResponse(WebhookBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    last_triggered_at: Optional[datetime] = None
    success_count: int = 0
    failure_count: int = 0
