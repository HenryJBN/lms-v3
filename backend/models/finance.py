from typing import Optional
from datetime import datetime
import uuid
from sqlmodel import SQLModel, Field
from models.base import MultiTenantMixin

class RevenueRecord(MultiTenantMixin, table=True):
    __tablename__ = "revenue_records"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", index=True)
    
    amount: float
    currency: str = Field(default="USD")
    status: str = Field(default="completed")
    payment_method: Optional[str] = None
    transaction_id: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
