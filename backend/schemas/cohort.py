from typing import Optional
from datetime import datetime
import uuid
from schemas.common import BaseSchema

class CohortBase(BaseSchema):
    name: str
    start_date: datetime
    end_date: Optional[datetime] = None
    max_students: Optional[int] = None
    is_active: bool = True

class CohortCreate(CohortBase):
    course_id: uuid.UUID

class CohortUpdate(BaseSchema):
    name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    max_students: Optional[int] = None
    is_active: Optional[bool] = None

class CohortResponse(CohortBase):
    id: uuid.UUID
    course_id: uuid.UUID
    current_enrollment_count: int = 0
    created_at: datetime
    updated_at: datetime
