from pydantic import BaseModel, EmailStr, validator, computed_field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum
import uuid

# Enums
class UserRole(str, Enum):
    student = "student"
    instructor = "instructor"
    admin = "admin"

class UserStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    suspended = "suspended"
    pending = "pending"
    deleted = "deleted"

class CourseStatus(str, Enum):
    draft = "draft"
    published = "published"
    archived = "archived"
    under_review = "under_review"

class CourseLevel(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"
    expert = "expert"

class LessonType(str, Enum):
    video = "video"
    text = "text"
    quiz = "quiz"
    assignment = "assignment"
    live_session = "live_session"

class EnrollmentStatus(str, Enum):
    active = "active"
    completed = "completed"
    dropped = "dropped"
    suspended = "suspended"

class CompletionStatus(str, Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    completed = "completed"

class NotificationType(str, Enum):
    system = "system"
    course = "course"
    assignment = "assignment"
    certificate = "certificate"
    payment = "payment"
    marketing = "marketing"
    reminder = "reminder"

class NotificationPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"

class CertificateStatus(str, Enum):
    pending = "pending"
    issued = "issued"
    minted = "minted"
    revoked = "revoked"

class QuizQuestionType(str, Enum):
    multiple_choice = "multiple_choice"
    true_false = "true_false"
    short_answer = "short_answer"
    essay = "essay"
    fill_blank = "fill_blank"

# Base schemas
class BaseSchema(BaseModel):
    class Config:
        from_attributes = True

# User schemas
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

# Authentication schemas
class Token(BaseSchema):
    access_token: str
    token_type: str
    expires_in: int
    user: UserResponse
    # Note: refresh_token will be sent as HTTP-only cookie, not in response body

class RefreshTokenResponse(BaseSchema):
    access_token: str
    token_type: str
    expires_in: int

class LoginRequest(BaseSchema):
    email: EmailStr
    password: str

class PasswordResetRequest(BaseSchema):
    email: EmailStr

class PasswordReset(BaseSchema):
    token: str
    new_password: str

class TwoFactorAuthResponse(BaseSchema):
    requires_2fa: bool
    session_id: str
    message: str

class TwoFactorVerifyRequest(BaseSchema):
    session_id: str
    code: str

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

class CourseResponse(BaseModel):
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
    level: Optional[str] = None  # e.g. beginner | intermediate | advanced
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

    # Extra joined fields
    instructor_first_name: Optional[str] = None
    instructor_last_name: Optional[str] = None
    category_name: Optional[str] = None

    @computed_field
    def instructor_name(self) -> str:
        """Combine instructor first and last name for UI display"""
        if self.instructor_first_name or self.instructor_last_name:
            return f"{self.instructor_first_name or ''} {self.instructor_last_name or ''}".strip()
        return "Unknown Instructor"

    class Config:
        orm_mode = True

# Lesson schemas
class LessonBase(BaseSchema):
    title: str
    slug: str
    description: Optional[str] = None
    content: Optional[str] = None
    video_url: Optional[str] = None
    video_duration: Optional[int] = None
    type: LessonType = LessonType.video
    sort_order: int = 0
    is_published: bool = True
    is_preview: bool = False
    prerequisites: List[uuid.UUID] = []
    resources: Optional[Dict[str, Any]] = None
    estimated_duration: Optional[int] = None
    attachments: Optional[List[Dict[str, Any]]] = None

class LessonCreate(LessonBase):
    course_id: uuid.UUID
    section_id: Optional[uuid.UUID] = None

class LessonUpdate(BaseSchema):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    video_url: Optional[str] = None
    video_duration: Optional[int] = None
    type: Optional[LessonType] = None
    sort_order: Optional[int] = None
    is_published: Optional[bool] = None
    is_preview: Optional[bool] = None
    prerequisites: Optional[List[uuid.UUID]] = None
    resources: Optional[Dict[str, Any]] = None
    estimated_duration: Optional[int] = None
    attachments: Optional[List[Dict[str, Any]]] = None

class LessonResponse(LessonBase):
    id: uuid.UUID
    course_id: uuid.UUID
    section_id: Optional[uuid.UUID] = None
    progress_status: Optional[str] = None
    progress_percentage: Optional[int] = None
    created_at: datetime
    updated_at: datetime

# Quiz schemas (updated and complete)
class QuizQuestionBase(BaseSchema):
    question: str
    type: QuizQuestionType = QuizQuestionType.multiple_choice
    options: Optional[Dict[str, Any]] = None
    correct_answer: str
    explanation: Optional[str] = None
    points: int = 1
    sort_order: int = 0

class QuizQuestionCreate(QuizQuestionBase):
    quiz_id: Optional[uuid.UUID] = None  # Optional for bulk creation

class QuizQuestionUpdate(BaseSchema):
    question: Optional[str] = None
    type: Optional[QuizQuestionType] = None
    options: Optional[Dict[str, Any]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    points: Optional[int] = None
    sort_order: Optional[int] = None

class QuizQuestionResponse(QuizQuestionBase):
    id: uuid.UUID
    quiz_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

class QuizBase(BaseSchema):
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    time_limit: Optional[int] = None  # in minutes
    passing_score: int = 70
    max_attempts: int = 3
    randomize_questions: bool = False
    show_correct_answers: bool = True
    is_published: bool = True

class QuizCreate(QuizBase):
    lesson_id: Optional[uuid.UUID] = None
    questions: List[QuizQuestionCreate] = []

class QuizUpdate(BaseSchema):
    title: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    time_limit: Optional[int] = None
    passing_score: Optional[int] = None
    max_attempts: Optional[int] = None
    randomize_questions: Optional[bool] = None
    show_correct_answers: Optional[bool] = None
    is_published: Optional[bool] = None

class QuizResponse(QuizBase):
    id: uuid.UUID
    course_id: uuid.UUID
    lesson_id: Optional[uuid.UUID] = None
    question_count: int = 0
    best_score: Optional[int] = None
    passed: Optional[bool] = None
    attempt_count: int = 0
    created_at: datetime
    updated_at: datetime

# Quiz attempt schemas
class QuizAttemptAnswer(BaseSchema):
    question_id: uuid.UUID
    answer: str
    is_correct: Optional[bool] = None
    points_earned: Optional[int] = None

class QuizAttemptCreate(BaseSchema):
    quiz_id: uuid.UUID
    answers: List[QuizAttemptAnswer]

class QuizAttemptUpdate(BaseSchema):
    completed_at: Optional[datetime] = None
    answers: Optional[List[QuizAttemptAnswer]] = None

class QuizAttemptResponse(BaseSchema):
    id: uuid.UUID
    user_id: uuid.UUID
    quiz_id: uuid.UUID
    course_id: uuid.UUID
    attempt_number: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    score: Optional[int] = None
    passed: bool = False
    time_taken: Optional[int] = None  # in seconds
    answers: Optional[List[QuizAttemptAnswer]] = None
    total_questions: int = 0
    correct_answers: int = 0

class QuizAttemptCreate(BaseSchema):
    quiz_id: uuid.UUID
    answers: Dict[str, Any]

class QuizAttemptResponse(BaseSchema):
    id: uuid.UUID
    user_id: uuid.UUID
    quiz_id: uuid.UUID
    course_id: uuid.UUID
    attempt_number: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    score: Optional[int] = None
    passed: bool
    time_taken: Optional[int] = None

# Enrollment schemas
class EnrollmentCreate(BaseSchema):
    course_id: uuid.UUID

class EnrollmentResponse(BaseSchema):
    id: uuid.UUID
    user_id: uuid.UUID
    course_id: uuid.UUID
    status: EnrollmentStatus
    enrolled_at: datetime
    completed_at: Optional[datetime] = None
    progress_percentage: int
    last_accessed_at: Optional[datetime] = None
    certificate_issued_at: Optional[datetime] = None
    title: Optional[str] = None
    thumbnail_url: Optional[str] = None
    description: Optional[str] = None
    level: Optional[str] = None
    instructor_first_name: Optional[str] = None
    instructor_last_name: Optional[str] = None

# Progress schemas
class LessonProgressUpdate(BaseSchema):
    progress_percentage: int
    time_spent: Optional[int] = None
    last_position: Optional[int] = None
    notes: Optional[str] = None

class LessonProgressResponse(BaseSchema):
    id: uuid.UUID
    user_id: uuid.UUID
    lesson_id: uuid.UUID
    course_id: uuid.UUID
    status: CompletionStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    time_spent: int
    progress_percentage: int
    last_position: int
    notes: Optional[str] = None
    lesson_title: Optional[str] = None
    lesson_type: Optional[str] = None

# Certificate schemas
class CertificateBase(BaseSchema):
    title: str
    description: Optional[str] = None
    status: CertificateStatus = CertificateStatus.pending
    blockchain_network: str = "polygon"

class CertificateCreate(BaseSchema):
    user_id: uuid.UUID
    course_id: uuid.UUID
    title: Optional[str] = None
    description: Optional[str] = None

class CertificateUpdate(BaseSchema):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[CertificateStatus] = None

class CertificateResponse(BaseSchema):
    id: uuid.UUID
    user_id: uuid.UUID
    course_id: uuid.UUID
    title: str
    description: Optional[str] = None
    status: CertificateStatus
    blockchain_network: str
    contract_address: Optional[str] = None
    token_id: Optional[str] = None
    token_uri: Optional[str] = None
    transaction_hash: Optional[str] = None
    image_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    issued_at: datetime
    minted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    course_title: Optional[str] = None
    course_thumbnail: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None

# Token schemas
class TokenBalance(BaseSchema):
    balance: float
    total_earned: float
    total_spent: float

class TokenTransaction(BaseSchema):
    id: uuid.UUID
    type: str
    amount: float
    balance_after: float
    description: str
    reference_type: Optional[str] = None
    reference_id: Optional[uuid.UUID] = None
    metadata: Optional[Dict[str, Any]] = None
    transaction_hash: Optional[str] = None
    created_at: datetime

# Notification schemas
class NotificationBase(BaseSchema):
    title: str
    message: str
    type: NotificationType
    priority: NotificationPriority = NotificationPriority.medium
    data: Optional[Dict[str, Any]] = None
    action_url: Optional[str] = None
    expires_at: Optional[datetime] = None

class NotificationCreate(NotificationBase):
    user_id: uuid.UUID

class NotificationUpdate(BaseSchema):
    title: Optional[str] = None
    message: Optional[str] = None
    type: Optional[NotificationType] = None
    priority: Optional[NotificationPriority] = None
    data: Optional[Dict[str, Any]] = None
    action_url: Optional[str] = None
    expires_at: Optional[datetime] = None

class NotificationResponse(NotificationBase):
    id: uuid.UUID
    user_id: uuid.UUID
    is_read: bool = False
    read_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

# Admin schemas
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

class AdminUserResponse(UserResponse):
    total_enrollments: Optional[int] = None
    completed_courses: Optional[int] = None
    total_certificates: Optional[int] = None
    token_balance: Optional[float] = None

class AdminCourseResponse(CourseResponse):
    instructor_first_name: Optional[str] = None
    instructor_last_name: Optional[str] = None
    category_name: Optional[str] = None
    total_lessons: Optional[int] = None
    total_revenue: Optional[float] = None

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

# Pagination schemas
class PaginationParams(BaseSchema):
    page: int = 1
    size: int = 20
    
    @validator('page')
    def validate_page(cls, v):
        if v < 1:
            raise ValueError('Page must be greater than 0')
        return v
    
    @validator('size')
    def validate_size(cls, v):
        if v < 1 or v > 1000:
            raise ValueError('Size must be between 1 and 1000')
        return v

class PaginatedResponse(BaseSchema):
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int

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

# Review and Rating schemas
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
    user_first_name: Optional[str] = None
    user_last_name: Optional[str] = None
    user_avatar_url: Optional[str] = None

# Discussion and Forum schemas
class DiscussionBase(BaseSchema):
    title: str
    content: str
    is_pinned: bool = False
    is_locked: bool = False

class DiscussionCreate(DiscussionBase):
    course_id: uuid.UUID

class DiscussionUpdate(BaseSchema):
    title: Optional[str] = None
    content: Optional[str] = None
    is_pinned: Optional[bool] = None
    is_locked: Optional[bool] = None

class DiscussionResponse(DiscussionBase):
    id: uuid.UUID
    user_id: uuid.UUID
    course_id: uuid.UUID
    reply_count: int = 0
    last_reply_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    user_first_name: Optional[str] = None
    user_last_name: Optional[str] = None
    user_avatar_url: Optional[str] = None

class DiscussionReplyBase(BaseSchema):
    content: str

class DiscussionReplyCreate(DiscussionReplyBase):
    discussion_id: uuid.UUID

class DiscussionReplyUpdate(BaseSchema):
    content: Optional[str] = None

class DiscussionReplyResponse(DiscussionReplyBase):
    id: uuid.UUID
    user_id: uuid.UUID
    discussion_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    user_first_name: Optional[str] = None
    user_last_name: Optional[str] = None
    user_avatar_url: Optional[str] = None

# Assignment schemas
class AssignmentBase(BaseSchema):
    title: str
    description: str
    instructions: Optional[str] = None
    due_date: Optional[datetime] = None
    max_points: int = 100
    allow_late_submission: bool = True
    is_published: bool = True

class AssignmentCreate(AssignmentBase):
    course_id: uuid.UUID
    lesson_id: Optional[uuid.UUID] = None

class AssignmentUpdate(BaseSchema):
    title: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    due_date: Optional[datetime] = None
    max_points: Optional[int] = None
    allow_late_submission: Optional[bool] = None
    is_published: Optional[bool] = None

class AssignmentResponse(AssignmentBase):
    id: uuid.UUID
    course_id: uuid.UUID
    lesson_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

class AssignmentSubmissionBase(BaseSchema):
    content: Optional[str] = None
    attachments: Optional[List[Dict[str, Any]]] = None
    submitted_at: datetime

class AssignmentSubmissionCreate(BaseSchema):
    assignment_id: uuid.UUID
    content: Optional[str] = None
    attachments: Optional[List[Dict[str, Any]]] = None

class AssignmentSubmissionUpdate(BaseSchema):
    content: Optional[str] = None
    attachments: Optional[List[Dict[str, Any]]] = None

class AssignmentSubmissionResponse(AssignmentSubmissionBase):
    id: uuid.UUID
    user_id: uuid.UUID
    assignment_id: uuid.UUID
    status: str
    grade: Optional[int] = None
    feedback: Optional[str] = None
    graded_at: Optional[datetime] = None
    graded_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

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
