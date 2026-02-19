from typing import Optional
from datetime import datetime
import uuid
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, Enum as SAEnum
from models.enums import EnrollmentStatus, CompletionStatus
from models.base import MultiTenantMixin

class Enrollment(MultiTenantMixin, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", index=True)
    cohort_id: Optional[uuid.UUID] = Field(default=None, foreign_key="cohort.id", index=True)
    
    status: EnrollmentStatus = Field(
        sa_column=Column(SAEnum(EnrollmentStatus, name="enrollmentstatus"), default=EnrollmentStatus.active)
    )
    
    enrolled_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    last_accessed_at: Optional[datetime] = None
    
    progress_percentage: int = Field(default=0)
    certificate_issued_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class LessonProgress(MultiTenantMixin, table=True):
    __tablename__ = "lesson_progress"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    lesson_id: uuid.UUID = Field(foreign_key="lesson.id", index=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", index=True)
    
    status: CompletionStatus = Field(
        sa_column=Column(SAEnum(CompletionStatus, name="completion_status"), default=CompletionStatus.not_started)
    )
    progress_percentage: int = Field(default=0)
    last_position: int = Field(default=0) # time in seconds
    time_spent: int = Field(default=0) # total duration in seconds
    
    notes: Optional[str] = None
    
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Certificate(MultiTenantMixin, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", index=True)
    
    title: str
    description: Optional[str] = None
    certificate_url: Optional[str] = None
    status: str = Field(default="issued")
    
    blockchain_network: Optional[str] = None
    blockchain_hash: Optional[str] = None
    token_id: Optional[str] = None
    
    issued_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
