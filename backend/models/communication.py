from typing import Optional, Dict, Any
from datetime import datetime
import uuid
from sqlmodel import SQLModel, Field, JSON, Column
from sqlalchemy import Column as SAColumn, Enum as SAEnum
from models.enums import NotificationType, NotificationPriority
from models.base import MultiTenantMixin

class Notification(MultiTenantMixin, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    
    title: str
    message: str
    type: NotificationType = Field(
        sa_column=SAColumn(SAEnum(NotificationType, name="notificationtype"), default=NotificationType.system)
    )
    priority: NotificationPriority = Field(
        sa_column=SAColumn(SAEnum(NotificationPriority, name="notificationpriority"), default=NotificationPriority.medium)
    )
    
    is_read: bool = Field(default=False)
    read_at: Optional[datetime] = None
    
    link: Optional[str] = None
    data: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class NotificationSettings(MultiTenantMixin, table=True):
    __tablename__ = "notification_settings"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, unique=True)
    
    email_enabled: bool = Field(default=True)
    push_enabled: bool = Field(default=True)
    
    # Stores which types of notifications are enabled
    preferences: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    
    updated_at: datetime = Field(default_factory=datetime.utcnow)
