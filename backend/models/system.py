from typing import Optional
from datetime import datetime
import uuid
from sqlmodel import SQLModel, Field
from models.base import MultiTenantMixin

class AdminAuditLog(MultiTenantMixin, SQLModel, table=True):
    __tablename__ = "admin_audit_log"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    admin_user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    
    action: str
    target_type: str
    target_id: Optional[uuid.UUID] = None
    
    description: Optional[str] = None
    action_metadata: Optional[str] = Field(default=None, alias="metadata_alias") # Renamed from metadata to avoid reserved word
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
