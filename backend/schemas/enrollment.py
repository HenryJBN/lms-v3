from typing import Optional
from datetime import datetime
import uuid
from schemas.common import BaseSchema
from models.enums import EnrollmentStatus, CompletionStatus, CertificateStatus

class EnrollmentCreate(BaseSchema):
    course_id: uuid.UUID
    cohort_id: Optional[uuid.UUID] = None

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
    time_spent: Optional[int] = 0
    progress_percentage: int = 0
    last_position: Optional[int] = 0
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
    metadata: Optional[dict] = None
    issued_at: datetime
    minted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    course_title: Optional[str] = None
    course_thumbnail: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
