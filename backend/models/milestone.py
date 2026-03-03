from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
from sqlmodel import SQLModel, Field, JSON
from sqlalchemy import Column as SAColumn, Enum as SAEnum
from models.enums import MilestoneType, RewardType, MilestoneStatus
from models.base import MultiTenantMixin


class Milestone(MultiTenantMixin, table=True):
    """Defines a milestone that can be achieved in a course.
    
    Inherits site_id from MultiTenantMixin for multi-tenant support.
    """
    __tablename__ = "milestones"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    course_id: Optional[uuid.UUID] = Field(default=None, foreign_key="course.id", index=True)
    section_id: Optional[uuid.UUID] = Field(default=None, foreign_key="section.id", index=True)
    
    # Basic info
    name: str = Field(index=True)
    description: Optional[str] = None
    type: MilestoneType = Field(
        sa_column=SAColumn(SAEnum(MilestoneType, name="milestonetype"), default=MilestoneType.progress)
    )
    is_auto_created: bool = Field(default=False)
    
    # Achievement criteria
    threshold_value: int = Field(default=0)  # e.g., 25 for 25% progress, 5 for 5 lessons
    threshold_type: str = Field(default="percentage")  # percentage, lessons, minutes, sections
    lesson_ids: Optional[List[uuid.UUID]] = Field(default=None, sa_column=SAColumn(JSON))
    
    # Rewards
    reward_type: RewardType = Field(
        sa_column=SAColumn(SAEnum(RewardType, name="rewardtype"), default=RewardType.tokens)
    )
    reward_value: float = Field(default=0.0)
    reward_metadata: Optional[Dict[str, Any]] = Field(default=None, sa_column=SAColumn(JSON))
    
    # Badge/Visual
    badge_icon: Optional[str] = None  # Icon identifier or URL
    badge_color: Optional[str] = Field(default="#6366f1")  # Default indigo color
    celebration_message: Optional[str] = None
    
    # Display settings
    sort_order: int = Field(default=0)
    is_active: bool = Field(default=True)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class UserMilestone(MultiTenantMixin, table=True):
    """Tracks when a user achieves a milestone.
    
    Inherits site_id from MultiTenantMixin for multi-tenant support.
    """
    __tablename__ = "user_milestones"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    milestone_id: uuid.UUID = Field(foreign_key="milestones.id", index=True)
    enrollment_id: uuid.UUID = Field(foreign_key="enrollment.id", index=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", index=True)
    
    # Achievement tracking
    achieved_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Reward claiming
    reward_claimed: bool = Field(default=False)
    reward_claimed_at: Optional[datetime] = None
    
    # Notification
    notification_sent: bool = Field(default=False)
    notification_sent_at: Optional[datetime] = None
    
    # Progress at time of achievement
    progress_at_achievement: int = Field(default=0)  # Progress percentage when achieved
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)