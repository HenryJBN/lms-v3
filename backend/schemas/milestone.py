from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
from schemas.common import BaseSchema
from pydantic import Field
from models.enums import MilestoneType, RewardType, MilestoneStatus


# ============ Milestone Schemas ============

class MilestoneBase(BaseSchema):
    """Base schema for milestone data."""
    name: str
    description: Optional[str] = None
    type: MilestoneType = MilestoneType.progress
    threshold_value: int = 0
    threshold_type: str = "percentage"
    lesson_ids: Optional[List[uuid.UUID]] = None
    reward_type: RewardType = RewardType.tokens
    reward_value: float = 0.0
    reward_metadata: Optional[Dict[str, Any]] = None
    badge_icon: Optional[str] = None
    badge_color: Optional[str] = "#6366f1"
    celebration_message: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class MilestoneCreate(MilestoneBase):
    """Schema for creating a new milestone."""
    course_id: Optional[uuid.UUID] = None
    section_id: Optional[uuid.UUID] = None


class MilestoneUpdate(BaseSchema):
    """Schema for updating an existing milestone."""
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[MilestoneType] = None
    threshold_value: Optional[int] = None
    threshold_type: Optional[str] = None
    lesson_ids: Optional[List[uuid.UUID]] = None
    reward_type: Optional[RewardType] = None
    reward_value: Optional[float] = None
    reward_metadata: Optional[Dict[str, Any]] = None
    badge_icon: Optional[str] = None
    badge_color: Optional[str] = None
    celebration_message: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class MilestoneResponse(MilestoneBase):
    """Schema for milestone response."""
    id: uuid.UUID
    site_id: uuid.UUID
    course_id: Optional[uuid.UUID] = None
    section_id: Optional[uuid.UUID] = None
    is_auto_created: bool
    created_at: datetime
    updated_at: datetime


class MilestoneListResponse(BaseSchema):
    """Schema for list of milestones."""
    items: List[MilestoneResponse]
    total: int


# ============ UserMilestone Schemas ============

class UserMilestoneBase(BaseSchema):
    """Base schema for user milestone data."""
    milestone_id: uuid.UUID
    enrollment_id: uuid.UUID
    course_id: uuid.UUID


class UserMilestoneResponse(UserMilestoneBase):
    """Schema for user milestone response."""
    id: uuid.UUID
    site_id: uuid.UUID
    user_id: uuid.UUID
    achieved_at: datetime
    reward_claimed: bool
    reward_claimed_at: Optional[datetime] = None
    notification_sent: bool
    progress_at_achievement: int
    milestone: Optional[MilestoneResponse] = None


class UserMilestoneListResponse(BaseSchema):
    """Schema for list of user milestones."""
    items: List[UserMilestoneResponse]
    total: int


# ============ Milestone with Progress Schema ============

class MilestoneWithProgressResponse(MilestoneResponse):
    """Milestone with user's progress towards it."""
    is_achieved: bool = False
    progress_towards: int = 0  # Current progress towards this milestone (0-100)
    user_milestone: Optional[UserMilestoneResponse] = None


class CourseMilestonesProgressResponse(BaseSchema):
    """Complete milestone progress for a course enrollment."""
    course_id: uuid.UUID
    enrollment_id: uuid.UUID
    total_milestones: int
    achieved_milestones: int
    milestones: List[MilestoneWithProgressResponse]


# ============ Milestone Celebration Schema ============

class MilestoneCelebrationResponse(BaseSchema):
    """Schema for milestone celebration popup data."""
    milestone: MilestoneResponse
    user_milestone: UserMilestoneResponse
    celebration_title: str
    celebration_message: str
    reward_description: str
    next_milestone: Optional[MilestoneResponse] = None


# ============ Reward Claim Schema ============

class RewardClaimResponse(BaseSchema):
    """Schema for reward claim response."""
    success: bool
    user_milestone_id: uuid.UUID
    reward_type: RewardType
    reward_value: float
    claimed_at: datetime
    message: str


# ============ Auto-Generate Milestones Schema ============

class AutoGenerateMilestonesRequest(BaseSchema):
    """Schema for auto-generating milestones for a course."""
    course_id: uuid.UUID
    generate_section_milestones: bool = True
    progress_thresholds: Optional[List[int]] = Field(
        default=[10, 25, 50, 75, 100],
        description="Progress percentage thresholds for auto-milestones"
    )
    base_token_reward: Optional[int] = Field(
        default=5,
        description="Base token reward, multiplied by threshold percentage"
    )


class AutoGenerateMilestonesResponse(BaseSchema):
    """Schema for auto-generated milestones response."""
    created_count: int
    milestones: List[MilestoneResponse]