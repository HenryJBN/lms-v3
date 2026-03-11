import uuid
from typing import List, Optional
from datetime import datetime
from sqlmodel import select, func, or_
from sqlmodel.ext.asyncio.session import AsyncSession
import logging

from models.course import Section
from models.enrollment import Enrollment, LessonProgress
from models.lesson import Lesson
from models.milestone import Milestone, UserMilestone
from models.enums import MilestoneType, RewardType
from schemas.milestone import MilestoneResponse, UserMilestoneResponse, MilestoneCelebrationResponse
from utils.tokens import award_tokens
from utils.notifications import create_notification

logger = logging.getLogger(__name__)

def get_badge_color(threshold: int) -> str:
    """Get badge color based on progress threshold."""
    colors = {
        10: "#6366f1",   # Indigo
        25: "#8b5cf6",   # Purple
        50: "#ec4899",   # Pink
        75: "#f59e0b",   # Amber
        100: "#10b981"   # Green
    }
    return colors.get(threshold, "#6366f1")

async def calculate_progress_towards(
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

async def check_milestone_achievement(
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
    
    # Get enrollment and detach it from session immediately
    enrollment_obj = await session.get(Enrollment, enrollment_id)
    if not enrollment_obj:
        return celebrations
    
    # Create a detached copy of enrollment to avoid lazy-loading issues
    enrollment = Enrollment.model_validate(enrollment_obj.model_dump())
    
    # Get all active milestones for the course
    milestones_query = select(Milestone).where(
        or_(Milestone.course_id == course_id, Milestone.course_id == None),  # Course-specific or global
        Milestone.is_active == True,
        Milestone.site_id == site_id
    ).order_by(Milestone.sort_order)
    
    milestones_result = await session.exec(milestones_query)
    milestones_objs = milestones_result.all()
    
    # Create detached copies of milestones
    milestones = [Milestone.model_validate(m.model_dump()) for m in milestones_objs]
    
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
        
        is_achieved = await check_milestone_achievement(
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
        await session.flush()
    
    return celebrations
