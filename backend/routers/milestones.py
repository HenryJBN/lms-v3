from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from typing import List, Optional
import uuid
from datetime import datetime
from sqlmodel import select, func, or_, and_
from sqlmodel.ext.asyncio.session import AsyncSession

from database.session import get_session
from dependencies import get_current_site, SiteData
from models.site import Site
from models.user import User
from models.course import Course, Section
from models.enrollment import Enrollment, LessonProgress
from models.lesson import Lesson
from models.milestone import Milestone, UserMilestone
from models.enums import MilestoneType, RewardType, EnrollmentStatus

from schemas.milestone import (
    MilestoneCreate,
    MilestoneUpdate,
    MilestoneResponse,
    MilestoneListResponse,
    UserMilestoneResponse,
    UserMilestoneListResponse,
    MilestoneWithProgressResponse,
    CourseMilestonesProgressResponse,
    MilestoneCelebrationResponse,
    RewardClaimResponse,
    AutoGenerateMilestonesRequest,
    AutoGenerateMilestonesResponse
)
from schemas.common import PaginationParams, PaginatedResponse
from middleware.auth import get_current_active_user, get_current_user, require_admin
from utils.tokens import award_tokens
from utils.notifications import create_notification
from utils.file_upload import upload_image
from schemas.system import FileUploadResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ Admin Milestone Management Endpoints ============

@router.post("/", response_model=MilestoneResponse)
async def create_milestone(
    milestone_in: MilestoneCreate,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    """Create a new milestone (admin only)."""
    # Validate course if provided
    if milestone_in.course_id:
        course = await session.get(Course, milestone_in.course_id)
        if not course or course.site_id != current_site.id:
            raise HTTPException(status_code=404, detail="Course not found")
    
    # Validate section if provided
    if milestone_in.section_id:
        section = await session.get(Section, milestone_in.section_id)
        if not section or section.site_id != current_site.id:
            raise HTTPException(status_code=404, detail="Section not found")
    
    # Create milestone
    milestone = Milestone(
        **milestone_in.dict(),
        site_id=current_site.id,
        is_auto_created=False
    )
    session.add(milestone)
    await session.commit()
    await session.refresh(milestone)
    
    return MilestoneResponse.from_orm(milestone)


@router.post("/auto-generate", response_model=AutoGenerateMilestonesResponse)
async def auto_generate_milestones(
    request: AutoGenerateMilestonesRequest,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    """Auto-generate milestones for a course."""
    # Validate course
    course = await session.get(Course, request.course_id)
    if not course or course.site_id != current_site.id:
        raise HTTPException(status_code=404, detail="Course not found")
    
    created_milestones = []
    thresholds = request.progress_thresholds or [10, 25, 50, 75, 100]
    base_reward = request.base_token_reward or 5
    
    # Milestone names and messages for different thresholds
    milestone_config = {
        10: {
            "name": "Getting Started",
            "description": "You've taken your first steps in this course!",
            "message": "Great start! You're on your way!"
        },
        25: {
            "name": "Quarter Way",
            "description": "You've completed 25% of the course!",
            "message": "You're making excellent progress!"
        },
        50: {
            "name": "Halfway There",
            "description": "You've reached the halfway point!",
            "message": "Halfway done! Keep up the great work!"
        },
        75: {
            "name": "Almost Done",
            "description": "You've completed 75% of the course!",
            "message": "The finish line is in sight!"
        },
        100: {
            "name": "Course Complete",
            "description": "Congratulations! You've completed the entire course!",
            "message": "Amazing! You've completed the course!"
        }
    }
    
    # Create progress-based milestones
    for threshold in thresholds:
        # Check if milestone already exists
        existing_query = select(Milestone).where(
            Milestone.course_id == request.course_id,
            Milestone.type == MilestoneType.progress,
            Milestone.threshold_value == threshold,
            Milestone.site_id == current_site.id
        )
        existing = await session.exec(existing_query)
        if existing.first():
            continue  # Skip if already exists
        
        config = milestone_config.get(threshold, {
            "name": f"{threshold}% Complete",
            "description": f"You've completed {threshold}% of the course!",
            "message": f"Great job! You've reached {threshold}%!"
        })
        
        # Calculate token reward (higher threshold = more tokens)
        token_reward = base_reward * (threshold // 10)
        
        milestone = Milestone(
            course_id=request.course_id,
            name=config["name"],
            description=config["description"],
            type=MilestoneType.progress,
            threshold_value=threshold,
            threshold_type="percentage",
            is_auto_created=True,
            reward_type=RewardType.tokens,
            reward_value=float(token_reward),
            celebration_message=config["message"],
            badge_color=_get_badge_color(threshold),
            site_id=current_site.id,
            sort_order=threshold
        )
        session.add(milestone)
        created_milestones.append(milestone)
    
    # Create section-based milestones if requested
    if request.generate_section_milestones:
        sections_query = select(Section).where(
            Section.course_id == request.course_id,
            Section.site_id == current_site.id
        ).order_by(Section.sort_order)
        sections_result = await session.exec(sections_query)
        sections = sections_result.all()
        
        for idx, section in enumerate(sections, 1):
            # Check if milestone already exists
            existing_query = select(Milestone).where(
                Milestone.section_id == section.id,
                Milestone.type == MilestoneType.section,
                Milestone.site_id == current_site.id
            )
            existing = await session.exec(existing_query)
            if existing.first():
                continue
            
            milestone = Milestone(
                course_id=request.course_id,
                section_id=section.id,
                name=f"Module {idx}: {section.title}",
                description=f"Complete all lessons in {section.title}",
                type=MilestoneType.section,
                threshold_value=100,  # 100% of section
                threshold_type="section_percentage",
                is_auto_created=True,
                reward_type=RewardType.tokens,
                reward_value=float(base_reward * 3),  # 3x base for section
                celebration_message=f"Module {idx} complete! Well done!",
                badge_color="#10b981",  # Green for sections
                site_id=current_site.id,
                sort_order=100 + idx  # After progress milestones
            )
            session.add(milestone)
            created_milestones.append(milestone)
    
    await session.commit()
    
    # Refresh all created milestones
    for milestone in created_milestones:
        await session.refresh(milestone)
    
    return AutoGenerateMilestonesResponse(
        created_count=len(created_milestones),
        milestones=[MilestoneResponse.from_orm(m) for m in created_milestones]
    )


def _get_badge_color(threshold: int) -> str:
    """Get badge color based on progress threshold."""
    colors = {
        10: "#6366f1",   # Indigo
        25: "#8b5cf6",   # Purple
        50: "#ec4899",   # Pink
        75: "#f59e0b",   # Amber
        100: "#10b981"   # Green
    }
    return colors.get(threshold, "#6366f1")


@router.get("/course/{course_id}", response_model=MilestoneListResponse)
async def get_course_milestones(
    course_id: uuid.UUID,
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    """Get all milestones for a course."""
    # Validate course
    course = await session.get(Course, course_id)
    if not course or course.site_id != current_site.id:
        raise HTTPException(status_code=404, detail="Course not found")
    
    query = select(Milestone).where(
        Milestone.course_id == course_id,
        Milestone.site_id == current_site.id
    )
    
    if is_active is not None:
        query = query.where(Milestone.is_active == is_active)
    
    query = query.order_by(Milestone.sort_order)
    
    result = await session.exec(query)
    milestones = result.all()
    
    return MilestoneListResponse(
        items=[MilestoneResponse.from_orm(m) for m in milestones],
        total=len(milestones)
    )


@router.get("/{milestone_id}", response_model=MilestoneResponse)
async def get_milestone(
    milestone_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    """Get a specific milestone."""
    milestone = await session.get(Milestone, milestone_id)
    if not milestone or milestone.site_id != current_site.id:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    return MilestoneResponse.from_orm(milestone)


@router.put("/{milestone_id}", response_model=MilestoneResponse)
async def update_milestone(
    milestone_id: uuid.UUID,
    milestone_update: MilestoneUpdate,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    """Update a milestone (admin only)."""
    milestone = await session.get(Milestone, milestone_id)
    if not milestone or milestone.site_id != current_site.id:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    update_data = milestone_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(milestone, field, value)
    
    milestone.updated_at = datetime.utcnow()
    session.add(milestone)
    await session.commit()
    await session.refresh(milestone)
    
    return MilestoneResponse.from_orm(milestone)


@router.delete("/{milestone_id}")
async def delete_milestone(
    milestone_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    """Delete a milestone (admin only)."""
    milestone = await session.get(Milestone, milestone_id)
    if not milestone or milestone.site_id != current_site.id:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    await session.delete(milestone)
    await session.commit()
    
    return {"message": "Milestone deleted successfully"}


@router.post("/upload-badge-image", response_model=FileUploadResponse)
async def upload_badge_image(
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin)
):
    """Upload badge image for milestones (admin only)."""
    try:
        result = await upload_image(file, "milestones/badges")
        return FileUploadResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ User Milestone Endpoints ============

@router.get("/user/my-milestones", response_model=UserMilestoneListResponse)
async def get_my_milestones(
    course_id: Optional[uuid.UUID] = Query(None),
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    """Get all milestones achieved by the current user."""
    query = select(UserMilestone).where(
        UserMilestone.user_id == current_user.id,
        UserMilestone.site_id == current_site.id
    )
    
    if course_id:
        query = query.where(UserMilestone.course_id == course_id)
    
    # Count total
    count_query = select(func.count(UserMilestone.id)).where(
        UserMilestone.user_id == current_user.id,
        UserMilestone.site_id == current_site.id
    )
    if course_id:
        count_query = count_query.where(UserMilestone.course_id == course_id)
    
    total_result = await session.exec(count_query)
    total = total_result.one()
    
    # Order and paginate
    query = query.order_by(UserMilestone.achieved_at.desc())
    query = query.offset((pagination.page - 1) * pagination.size).limit(pagination.size)
    
    result = await session.exec(query)
    user_milestones = result.all()
    
    # Fetch milestone details
    items = []
    for um in user_milestones:
        milestone = await session.get(Milestone, um.milestone_id)
        items.append(UserMilestoneResponse(
            **um.dict(),
            milestone=MilestoneResponse.from_orm(milestone) if milestone else None
        ))
    
    return UserMilestoneListResponse(items=items, total=total)


@router.get("/user/course-progress/{course_id}", response_model=CourseMilestonesProgressResponse)
async def get_course_milestones_progress(
    course_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    """Get user's progress towards all milestones in a course."""
    # Validate course
    course = await session.get(Course, course_id)
    if not course or course.site_id != current_site.id:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Get user's enrollment
    enrollment_query = select(Enrollment).where(
        Enrollment.user_id == current_user.id,
        Enrollment.course_id == course_id,
        Enrollment.site_id == current_site.id
    )
    enrollment_result = await session.exec(enrollment_query)
    enrollment = enrollment_result.first()
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Not enrolled in this course")
    
    # Get all active milestones for the course
    milestones_query = select(Milestone).where(
        Milestone.course_id == course_id,
        Milestone.is_active == True,
        Milestone.site_id == current_site.id
    ).order_by(Milestone.sort_order)
    
    milestones_result = await session.exec(milestones_query)
    milestones = milestones_result.all()
    
    # Get user's achieved milestones
    user_milestones_query = select(UserMilestone).where(
        UserMilestone.user_id == current_user.id,
        UserMilestone.course_id == course_id,
        UserMilestone.site_id == current_site.id
    )
    user_milestones_result = await session.exec(user_milestones_query)
    user_milestones = {um.milestone_id: um for um in user_milestones_result.all()}
    
    # Build response with progress
    items = []
    achieved_count = 0
    
    for milestone in milestones:
        is_achieved = milestone.id in user_milestones
        user_milestone = user_milestones.get(milestone.id)
        
        # Calculate progress towards milestone
        progress_towards = _calculate_progress_towards(
            milestone, enrollment, current_user.id, session
        )
        
        if is_achieved:
            achieved_count += 1
        
        items.append(MilestoneWithProgressResponse(
            **MilestoneResponse.from_orm(milestone).dict(),
            is_achieved=is_achieved,
            progress_towards=progress_towards,
            user_milestone=UserMilestoneResponse.from_orm(user_milestone) if user_milestone else None
        ))
    
    return CourseMilestonesProgressResponse(
        course_id=course_id,
        enrollment_id=enrollment.id,
        total_milestones=len(milestones),
        achieved_milestones=achieved_count,
        milestones=items
    )


async def _calculate_progress_towards(
    milestone: Milestone,
    enrollment: Enrollment,
    user_id: uuid.UUID,
    session: AsyncSession
) -> int:
    """Calculate user's progress towards a specific milestone."""
    if milestone.type == MilestoneType.progress:
        # For progress milestones, use enrollment progress
        return min(100, int((enrollment.progress_percentage / milestone.threshold_value) * 100))
    
    elif milestone.type == MilestoneType.section and milestone.section_id:
        # For section milestones, calculate section completion
        lessons_query = select(func.count(Lesson.id)).where(
            Lesson.section_id == milestone.section_id,
            Lesson.is_published == True
        )
        total_lessons = (await session.exec(lessons_query)).one() or 0
        
        if total_lessons == 0:
            return 0
        
        completed_query = select(func.count(LessonProgress.id)).join(Lesson).where(
            LessonProgress.user_id == user_id,
            Lesson.section_id == milestone.section_id,
            LessonProgress.status == 'completed'
        )
        completed_lessons = (await session.exec(completed_query)).one() or 0
        
        return int((completed_lessons / total_lessons) * 100)
    
    elif milestone.type == MilestoneType.lesson and milestone.lesson_ids:
        # For lesson-specific milestones
        total_lessons = len(milestone.lesson_ids)
        completed_query = select(func.count(LessonProgress.id)).where(
            LessonProgress.user_id == user_id,
            LessonProgress.lesson_id.in_(milestone.lesson_ids),
            LessonProgress.status == 'completed'
        )
        completed_lessons = (await session.exec(completed_query)).one() or 0
        
        return int((completed_lessons / total_lessons) * 100)
    
    return 0


@router.post("/{milestone_id}/claim", response_model=RewardClaimResponse)
async def claim_milestone_reward(
    milestone_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    """Claim the reward for an achieved milestone."""
    # Get user milestone
    query = select(UserMilestone).where(
        UserMilestone.milestone_id == milestone_id,
        UserMilestone.user_id == current_user.id,
        UserMilestone.site_id == current_site.id
    )
    result = await session.exec(query)
    user_milestone = result.first()
    
    if not user_milestone:
        raise HTTPException(status_code=404, detail="Milestone not achieved yet")
    
    if user_milestone.reward_claimed:
        raise HTTPException(status_code=400, detail="Reward already claimed")
    
    # Get milestone details
    milestone = await session.get(Milestone, milestone_id)
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    # Process reward based on type
    reward_description = ""
    try:
        if milestone.reward_type == RewardType.tokens:
            await award_tokens(
                user_id=current_user.id,
                amount=milestone.reward_value,
                description=f"Milestone reward: {milestone.name}",
                session=session,
                site_id=current_site.id,
                reference_type="milestone_reward",
                reference_id=milestone.id
            )
            reward_description = f"{int(milestone.reward_value)} tokens added to your balance!"
        elif milestone.reward_type == RewardType.gift_card:
            # Store gift card claim in metadata
            reward_description = f"Gift card worth ${milestone.reward_value} will be sent to your email!"
            # TODO: Integrate with gift card provider
        elif milestone.reward_type == RewardType.airtime_voucher:
            reward_description = f"Airtime voucher worth ${milestone.reward_value} will be sent to your phone!"
            # TODO: Integrate with airtime provider
        else:
            reward_description = f"Custom reward: {milestone.reward_metadata}"
    except Exception as e:
        logger.error(f"Failed to process milestone reward: {e}")
        raise HTTPException(status_code=500, detail="Failed to process reward")
    
    # Mark as claimed
    user_milestone.reward_claimed = True
    user_milestone.reward_claimed_at = datetime.utcnow()
    user_milestone.updated_at = datetime.utcnow()
    session.add(user_milestone)
    await session.commit()
    
    return RewardClaimResponse(
        success=True,
        user_milestone_id=user_milestone.id,
        reward_type=milestone.reward_type,
        reward_value=milestone.reward_value,
        claimed_at=user_milestone.reward_claimed_at,
        message=reward_description
    )


# ============ Internal Helper Functions ============

async def check_and_award_milestones(
    user_id: uuid.UUID,
    course_id: uuid.UUID,
    enrollment_id: uuid.UUID,
    session: AsyncSession,
    site_id: uuid.UUID
) -> List[MilestoneCelebrationResponse]:
    """
    Check if user has achieved any new milestones and award them.
    Called internally when progress is updated.
    """
    celebrations = []
    
    # Get enrollment
    enrollment = await session.get(Enrollment, enrollment_id)
    if not enrollment:
        return celebrations
    
    # Get all active milestones for the course
    milestones_query = select(Milestone).where(
        or_(Milestone.course_id == course_id, Milestone.course_id == None),  # Course-specific or global
        Milestone.is_active == True,
        Milestone.site_id == site_id
    ).order_by(Milestone.sort_order)
    
    milestones_result = await session.exec(milestones_query)
    milestones = milestones_result.all()
    
    # Get already achieved milestones
    achieved_query = select(UserMilestone.milestone_id).where(
        UserMilestone.user_id == user_id,
        UserMilestone.course_id == course_id,
        UserMilestone.site_id == site_id
    )
    achieved_result = await session.exec(achieved_query)
    achieved_ids = set(achieved_result.all())
    
    for milestone in milestones:
        if milestone.id in achieved_ids:
            continue  # Already achieved
        
        is_achieved = await _check_milestone_achievement(
            milestone, enrollment, user_id, session
        )
        
        if is_achieved:
            # Create user milestone
            user_milestone = UserMilestone(
                user_id=user_id,
                milestone_id=milestone.id,
                enrollment_id=enrollment_id,
                course_id=course_id,
                progress_at_achievement=enrollment.progress_percentage,
                site_id=site_id
            )
            session.add(user_milestone)
            
            # Send notification
            try:
                await create_notification(
                    user_id=user_id,
                    notification_type="milestone",
                    title=f"Milestone Achieved: {milestone.name}",
                    message=milestone.celebration_message or f"Congratulations! You've achieved the {milestone.name} milestone!",
                    session=session,
                    site_id=site_id
                )
            except Exception as e:
                logger.error(f"Failed to send milestone notification: {e}")
            
            # Get next milestone
            next_milestone = None
            for m in milestones:
                if m.id not in achieved_ids and m.id != milestone.id:
                    if m.sort_order > milestone.sort_order:
                        next_milestone = m
                        break
            
            # Build celebration response
            celebrations.append(MilestoneCelebrationResponse(
                milestone=MilestoneResponse.from_orm(milestone),
                user_milestone=UserMilestoneResponse.from_orm(user_milestone),
                celebration_title=f"🎉 {milestone.name}!",
                celebration_message=milestone.celebration_message or "Congratulations on your achievement!",
                reward_description=f"You've earned {int(milestone.reward_value)} {milestone.reward_type.value}!",
                next_milestone=MilestoneResponse.from_orm(next_milestone) if next_milestone else None
            ))
    
    if celebrations:
        await session.commit()
    
    return celebrations


async def _check_milestone_achievement(
    milestone: Milestone,
    enrollment: Enrollment,
    user_id: uuid.UUID,
    session: AsyncSession
) -> bool:
    """Check if a specific milestone has been achieved."""
    if milestone.type == MilestoneType.progress:
        return enrollment.progress_percentage >= milestone.threshold_value
    
    elif milestone.type == MilestoneType.section and milestone.section_id:
        # Check if all lessons in section are completed
        lessons_query = select(Lesson.id).where(
            Lesson.section_id == milestone.section_id,
            Lesson.is_published == True
        )
        lessons_result = await session.exec(lessons_query)
        lesson_ids = [l for l in lessons_result.all()]
        
        if not lesson_ids:
            return False
        
        completed_query = select(func.count(LessonProgress.id)).where(
            LessonProgress.user_id == user_id,
            LessonProgress.lesson_id.in_(lesson_ids),
            LessonProgress.status == 'completed'
        )
        completed_count = (await session.exec(completed_query)).one() or 0
        
        return completed_count >= len(lesson_ids)
    
    elif milestone.type == MilestoneType.lesson and milestone.lesson_ids:
        # Check if specified lessons are completed
        completed_query = select(func.count(LessonProgress.id)).where(
            LessonProgress.user_id == user_id,
            LessonProgress.lesson_id.in_(milestone.lesson_ids),
            LessonProgress.status == 'completed'
        )
        completed_count = (await session.exec(completed_query)).one() or 0
        
        return completed_count >= len(milestone.lesson_ids)
    
    elif milestone.type == MilestoneType.time:
        # Check total time spent
        time_query = select(func.sum(LessonProgress.time_spent)).where(
            LessonProgress.user_id == user_id,
            LessonProgress.course_id == enrollment.course_id
        )
        total_time = (await session.exec(time_query)).one() or 0
        # threshold_value is in minutes
        return (total_time / 60) >= milestone.threshold_value
    
    return False