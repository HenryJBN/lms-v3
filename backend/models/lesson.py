from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
from sqlmodel import SQLModel, Field, JSON, Column
from sqlalchemy import Column as SAColumn, Enum as SAEnum
from models.enums import LessonType, QuizQuestionType
from models.base import MultiTenantMixin

class Lesson(MultiTenantMixin, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", index=True)
    section_id: Optional[uuid.UUID] = Field(default=None, foreign_key="section.id", index=True)
    
    title: str
    slug: str = Field(index=True)
    description: Optional[str] = None
    content: Optional[str] = None
    video_url: Optional[str] = None
    video_duration: Optional[int] = None
    
    type: LessonType = Field(
        sa_column=SAColumn(SAEnum(LessonType, name="lessontype"), default=LessonType.video)
    )
    sort_order: int = Field(default=0)
    is_published: bool = Field(default=True)
    is_preview: bool = Field(default=False)
    
    # Prerequisites and attachments as JSON for simplicity in this migration
    prerequisites: List[uuid.UUID] = Field(default=[], sa_column=Column(JSON))
    resources: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    attachments: Optional[List[Dict[str, Any]]] = Field(default=None, sa_column=Column(JSON))
    
    estimated_duration: Optional[int] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Quiz(MultiTenantMixin, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", index=True)
    lesson_id: Optional[uuid.UUID] = Field(default=None, foreign_key="lesson.id", index=True)
    
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    time_limit: Optional[int] = None # in minutes
    passing_score: int = Field(default=70)
    max_attempts: int = Field(default=3)
    randomize_questions: bool = Field(default=False)
    show_correct_answers: bool = Field(default=True)
    is_published: bool = Field(default=True)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class QuizQuestion(MultiTenantMixin, table=True):
    __tablename__ = "quiz_questions"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    quiz_id: uuid.UUID = Field(foreign_key="quiz.id", index=True)
    
    question: str
    type: QuizQuestionType = Field(
        sa_column=SAColumn(SAEnum(QuizQuestionType, name="quizquestiontype"), default=QuizQuestionType.multiple_choice)
    )
    options: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    correct_answer: str
    explanation: Optional[str] = None
    points: int = Field(default=1)
    sort_order: int = Field(default=0)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class QuizAttempt(MultiTenantMixin, table=True):
    __tablename__ = "quiz_attempts"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    quiz_id: uuid.UUID = Field(foreign_key="quiz.id", index=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", index=True)
    
    attempt_number: int
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    score: Optional[int] = None # percentage
    passed: bool = Field(default=False)
    
    # Store answers as JSON
    answers: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Assignment(MultiTenantMixin, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", index=True)
    lesson_id: Optional[uuid.UUID] = Field(default=None, foreign_key="lesson.id", index=True)
    
    title: str
    description: str
    instructions: Optional[str] = None
    due_date: Optional[datetime] = None
    max_points: int = Field(default=100)
    allow_late_submission: bool = Field(default=True)
    is_published: bool = Field(default=True)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AssignmentSubmission(MultiTenantMixin, table=True):
    __tablename__ = "assignment_submissions"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    assignment_id: uuid.UUID = Field(foreign_key="assignment.id", index=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", index=True)
    
    content: Optional[str] = None
    attachments: Optional[List[Dict[str, Any]]] = Field(default=None, sa_column=Column(JSON))
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    
    status: str = Field(default="pending") # pending, graded, revision_required
    grade: Optional[int] = None
    feedback: Optional[str] = None
    graded_at: Optional[datetime] = None
    graded_by: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
