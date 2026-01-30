from enum import Enum

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
    audio = "audio"
    image = "image"
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
