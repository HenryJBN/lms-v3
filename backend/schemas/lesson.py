from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
from schemas.common import BaseSchema
from models.enums import LessonType, QuizQuestionType

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
    course_id: uuid.UUID
    section_id: Optional[uuid.UUID] = None
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

# Quiz schemas
class QuizQuestionBase(BaseSchema):
    question: str
    type: QuizQuestionType = QuizQuestionType.multiple_choice
    options: Optional[Dict[str, Any]] = None
    correct_answer: str
    explanation: Optional[str] = None
    points: int = 1
    sort_order: int = 0

class QuizQuestionCreate(QuizQuestionBase):
    quiz_id: Optional[uuid.UUID] = None

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
    time_limit: Optional[int] = None
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

class QuizAttemptAnswer(BaseSchema):
    question_id: uuid.UUID
    answer: str
    is_correct: Optional[bool] = None
    points_earned: Optional[int] = None

class QuizAttemptCreate(BaseSchema):
    quiz_id: uuid.UUID
    answers: Dict[str, Any]

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
    passed: bool
    time_taken: Optional[int] = None
    answers: Optional[List[QuizAttemptAnswer]] = None
    total_questions: int = 0
    correct_answers: int = 0

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
