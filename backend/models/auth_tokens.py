from typing import Optional
from datetime import datetime, timedelta
import uuid
from sqlmodel import SQLModel, Field
from models.base import MultiTenantMixin

class PasswordResetToken(SQLModel, table=True):
    __tablename__ = "password_reset_tokens"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    token: str = Field(index=True)
    
    expires_at: datetime
    used_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class EmailVerificationToken(SQLModel, table=True):
    __tablename__ = "email_verification_tokens"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    token: str = Field(index=True)
    
    expires_at: datetime
    verified_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
