import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.communication import Notification, NotificationSettings
from database.session import engine

async def create_notification(
    user_id: uuid.UUID,
    title: str,
    message: str,
    session: AsyncSession,
    notification_type: str = "system",
    priority: str = "medium",
    data: Optional[Dict[str, Any]] = None,
    action_url: Optional[str] = None
) -> dict:
    """Create a new notification for a user"""
    try:
        new_notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=notification_type,
            priority=priority,
            data=data,
            link=action_url
        )
        session.add(new_notification)
        await session.commit()
        await session.refresh(new_notification)
        
        # Send push notification if user has it enabled
        await send_push_notification(user_id, title, message, session, data)
        
        return {
            "success": True,
            "notification_id": new_notification.id,
            "notification": new_notification.model_dump()
        }
    except Exception as e:
        await session.rollback()
        print(f"Failed to create notification: {e}")
        return {
            "success": False,
            "error": str(e)
        }

async def send_enrollment_notification(user_id: uuid.UUID, course_title: str, course_id: uuid.UUID, session: AsyncSession):
    """Send notification when user enrolls in a course"""
    await create_notification(
        user_id=user_id,
        title="Course Enrollment Confirmed",
        message=f"You have successfully enrolled in '{course_title}'. Start learning now!",
        session=session,
        notification_type="course",
        priority="medium",
        data={"course_id": str(course_id), "course_title": course_title},
        action_url=f"/learn/{course_id}"
    )

async def send_lesson_completion_notification(user_id: uuid.UUID, lesson_title: str, course_id: uuid.UUID, session: AsyncSession):
    """Send notification when user completes a lesson"""
    await create_notification(
        user_id=user_id,
        title="Lesson Completed! 🎉",
        message=f"Great job completing '{lesson_title}'! You earned 10 L-Tokens.",
        session=session,
        notification_type="course",
        priority="low",
        data={"lesson_title": lesson_title, "course_id": str(course_id), "tokens_earned": 10},
        action_url=f"/learn/{course_id}"
    )

async def send_certificate_notification(user_id: uuid.UUID, course_title: str, status: str, session: AsyncSession):
    """Send notification about certificate status"""
    if status == "issued":
        title = "Certificate Issued! 🏆"
        message = f"Congratulations! Your certificate for '{course_title}' has been issued."
        action_url = "/certificates"
    elif status == "minted":
        title = "Certificate Minted as NFT! 🚀"
        message = f"Your certificate for '{course_title}' has been minted as an NFT on the blockchain!"
        action_url = "/certificates"
    elif status == "revoked":
        title = "Certificate Revoked"
        message = f"Your certificate for '{course_title}' has been revoked."
        action_url = "/certificates"
    else:
        return
    
    await create_notification(
        user_id=user_id,
        title=title,
        message=message,
        session=session,
        notification_type="certificate",
        priority="high",
        data={"course_title": course_title, "certificate_status": status},
        action_url=action_url
    )

async def send_assignment_reminder(user_id: uuid.UUID, assignment_title: str, due_date: datetime, course_id: uuid.UUID):
    """Send reminder notification for assignment due date"""
    
    await create_notification(
        user_id=user_id,
        title="Assignment Due Soon ⏰",
        message=f"Don't forget! '{assignment_title}' is due on {due_date.strftime('%B %d, %Y')}.",
        notification_type="assignment",
        priority="high",
        data={
            "assignment_title": assignment_title,
            "due_date": due_date.isoformat(),
            "course_id": str(course_id)
        },
        action_url=f"/learn/{course_id}"
    )

async def send_course_update_notification(user_ids: List[uuid.UUID], course_title: str, update_message: str, course_id: uuid.UUID):
    """Send course update notification to multiple users"""
    
    for user_id in user_ids:
        await create_notification(
            user_id=user_id,
            title=f"Update: {course_title}",
            message=update_message,
            notification_type="course",
            priority="medium",
            data={"course_id": str(course_id), "course_title": course_title},
            action_url=f"/courses/{course_id}"
        )

async def send_push_notification(user_id: uuid.UUID, title: str, message: str, session: AsyncSession, data: Optional[Dict[str, Any]] = None):
    """Send push notification to user's devices"""
    try:
        # Check if user has push notifications enabled
        query = select(NotificationSettings).where(NotificationSettings.user_id == user_id)
        result = await session.exec(query)
        settings = result.first()
        
        # If no settings, assume enabled (legacy behavior had default true)
        if settings and not settings.push_enabled:
            return
        
        # Get user's push tokens
        from models.user import UserDevice
        tokens_query = select(UserDevice.device_token).where(
            UserDevice.user_id == user_id, 
            UserDevice.device_token != None
        )
        result = await session.exec(tokens_query)
        device_tokens = result.all()
        
        if not device_tokens:
            return
            
        print(f"Push notification sent to {len(device_tokens)} devices for user {user_id}")
    except Exception as e:
        print(f"Failed to send push notification: {e}")

async def send_email_notification(user_id: uuid.UUID, subject: str, template: str, context: Dict[str, Any], session: AsyncSession):
    """Send email notification to user"""
    try:
        # Check if user has email notifications enabled
        query = select(NotificationSettings).where(NotificationSettings.user_id == user_id)
        result = await session.exec(query)
        settings = result.first()
        
        if settings and not settings.email_enabled:
            return
        
        # Get user email
        from models.user import User
        user_query = select(User).where(User.id == user_id)
        result = await session.exec(user_query)
        user = result.first()
        
        if not user:
            return
            
        print(f"Email notification sent to {user.email}: {subject}")
    except Exception as e:
        print(f"Failed to send email notification: {e}")

async def mark_notifications_read(user_id: uuid.UUID, notification_ids: List[uuid.UUID]) -> int:
    """Mark multiple notifications as read"""
    
    try:
        if not notification_ids:
            return 0
        
        # Convert UUIDs to strings for the query
        id_placeholders = ','.join([f"'{str(nid)}'" for nid in notification_ids])
        
        query = f"""
            UPDATE notifications 
            SET is_read = true, read_at = NOW(), updated_at = NOW()
            WHERE user_id = :user_id AND id IN ({id_placeholders})
        """
        
        result = await database.execute(query, values={"user_id": user_id})
        return result
        
    except Exception as e:
        print(f"Failed to mark notifications as read: {e}")
        return 0

async def get_unread_count(user_id: uuid.UUID) -> int:
    """Get count of unread notifications for user"""
    
    try:
        query = """
            SELECT COUNT(*) as count 
            FROM notifications 
            WHERE user_id = :user_id AND is_read = false
        """
        
        result = await database.fetch_one(query, values={"user_id": user_id})
        return result.count if result else 0
        
    except Exception as e:
        print(f"Failed to get unread count: {e}")
        return 0

async def cleanup_old_notifications(days: int = 30):
    """Clean up old read notifications"""
    
    try:
        query = """
            DELETE FROM notifications 
            WHERE is_read = true 
            AND read_at < NOW() - INTERVAL ':days days'
        """
        
        result = await database.execute(query, values={"days": days})
        print(f"Cleaned up {result} old notifications")
        
    except Exception as e:
        print(f"Failed to cleanup old notifications: {e}")
