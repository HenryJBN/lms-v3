from typing import Optional, Dict, Any
from datetime import datetime
import uuid
from schemas.common import BaseSchema
from models.enums import NotificationType, NotificationPriority

# Notification schemas
class NotificationBase(BaseSchema):
    title: str
    message: str
    type: NotificationType
    priority: NotificationPriority = NotificationPriority.medium
    data: Optional[Dict[str, Any]] = None
    action_url: Optional[str] = None
    expires_at: Optional[datetime] = None

class NotificationCreate(NotificationBase):
    user_id: uuid.UUID

class NotificationUpdate(BaseSchema):
    title: Optional[str] = None
    message: Optional[str] = None
    type: Optional[NotificationType] = None
    priority: Optional[NotificationPriority] = None
    data: Optional[Dict[str, Any]] = None
    action_url: Optional[str] = None
    expires_at: Optional[datetime] = None

class NotificationResponse(NotificationBase):
    id: uuid.UUID
    user_id: uuid.UUID
    is_read: bool = False
    read_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

# Discussion and Forum schemas
class DiscussionBase(BaseSchema):
    title: str
    content: str
    is_pinned: bool = False
    is_locked: bool = False

class DiscussionCreate(DiscussionBase):
    course_id: uuid.UUID

class DiscussionUpdate(BaseSchema):
    title: Optional[str] = None
    content: Optional[str] = None
    is_pinned: Optional[bool] = None
    is_locked: Optional[bool] = None

class DiscussionResponse(DiscussionBase):
    id: uuid.UUID
    user_id: uuid.UUID
    course_id: uuid.UUID
    reply_count: int = 0
    last_reply_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    user_first_name: Optional[str] = None
    user_last_name: Optional[str] = None
    user_avatar_url: Optional[str] = None

class DiscussionReplyBase(BaseSchema):
    content: str

class DiscussionReplyCreate(DiscussionReplyBase):
    discussion_id: uuid.UUID

class DiscussionReplyUpdate(BaseSchema):
    content: Optional[str] = None

class DiscussionReplyResponse(DiscussionReplyBase):
    id: uuid.UUID
    user_id: uuid.UUID
    discussion_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    user_first_name: Optional[str] = None
    user_last_name: Optional[str] = None
    user_avatar_url: Optional[str] = None
