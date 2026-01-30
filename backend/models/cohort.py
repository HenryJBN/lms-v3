from typing import Optional
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
import uuid

class Cohort(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    site_id: uuid.UUID = Field(foreign_key="site.id")
    course_id: uuid.UUID = Field(foreign_key="course.id")  # Will link to Course table
    name: str
    start_date: datetime
    end_date: Optional[datetime] = None
    max_students: Optional[int] = None
    registration_open: bool = True
