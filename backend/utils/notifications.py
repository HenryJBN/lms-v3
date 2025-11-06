import uuid
import json
from typing import Optional, Dict, Any, List
from datetime import datetime

from database.connection import database

async def create_notification(
    user_id: uuid.UUID,
    title: str,
    message: str,
    notification_type: str = "system",
    priority: str = "medium",
    data: Optional[Dict[str, Any]] = None,
    action_url: Optional[str] = None
) -> dict:
    """Create a new notification for a user"""
    
    try:
        notification_id = uuid.uuid4()
        
        query = """
            INSERT INTO notifications (
                id, user_id, type, title, message, priority, data, action_url
            )
            VALUES (
                :id, :user_id, :type, :title, :message, :priority, :data, :action_url
            )
            RETURNING *
        """
        
        notification = await database.fetch_one(query, values={
            "id": notification_id,
            "user_id": user_id,
            "type": notification_type,
            "title": title,
            "message": message,
            "priority": priority,
            "data": data,
            "action_url": action_url
        })
        
        # Send push notification if user has it enabled
        await send_push_notification(user_id, title, message, data)
        
        return {
            "success": True,
            "notification_id": notification_id,
            "notification": dict(notification)
        }
        
    except Exception as e:
        print(f"Failed to create notification: {e}")
        return {
            "success": False,
            "error": str(e)
        }

async def send_enrollment_notification(user_id: uuid.UUID, course_title: str, course_id: uuid.UUID):
    """Send notification when user enrolls in a course"""
    
    await create_notification(
        user_id=user_id,
        title="Course Enrollment Confirmed",
        message=f"You have successfully enrolled in '{course_title}'. Start learning now!",
        notification_type="course",
        priority="medium",
        data={"course_id": str(course_id), "course_title": course_title},
        action_url=f"/learn/{course_id}"
    )

async def send_lesson_completion_notification(user_id: uuid.UUID, lesson_title: str, course_id: uuid.UUID):
    """Send notification when user completes a lesson"""
    
    await create_notification(
        user_id=user_id,
        title="Lesson Completed! 🎉",
        message=f"Great job completing '{lesson_title}'! You earned 10 L-Tokens.",
        notification_type="course",
        priority="low",
        data={"lesson_title": lesson_title, "course_id": str(course_id), "tokens_earned": 10},
        action_url=f"/learn/{course_id}"
    )

async def send_certificate_notification(user_id: uuid.UUID, course_title: str, status: str):
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

async def send_push_notification(user_id: uuid.UUID, title: str, message: str, data: Optional[Dict[str, Any]] = None):
    """Send push notification to user's devices"""
    
    try:
        # Check if user has push notifications enabled
        settings_query = """
            SELECT push_notifications FROM notification_settings 
            WHERE user_id = :user_id
        """
        settings = await database.fetch_one(settings_query, values={"user_id": user_id})
        
        if not settings or not settings.push_notifications:
            return
        
        # Get user's push tokens
        tokens_query = """
            SELECT device_token FROM user_devices 
            WHERE user_id = :user_id AND device_token IS NOT NULL
        """
        device_tokens = await database.fetch_all(tokens_query, values={"user_id": user_id})
        
        if not device_tokens:
            return
        
        # Here you would integrate with your push notification service
        # For example, Firebase Cloud Messaging (FCM) or OneSignal
        
        # Example FCM integration (commented out):
        """
        import firebase_admin
        from firebase_admin import messaging
        
        for token_record in device_tokens:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=message,
                ),
                data=data or {},
                token=token_record.device_token,
            )
            
            try:
                response = messaging.send(message)
                print(f'Successfully sent message: {response}')
            except Exception as e:
                print(f'Error sending push notification: {e}')
        """
        
        print(f"Push notification sent to {len(device_tokens)} devices for user {user_id}")
        
    except Exception as e:
        print(f"Failed to send push notification: {e}")

async def send_email_notification(user_id: uuid.UUID, subject: str, template: str, context: Dict[str, Any]):
    """Send email notification to user"""
    
    try:
        # Check if user has email notifications enabled
        settings_query = """
            SELECT email_notifications FROM notification_settings 
            WHERE user_id = :user_id
        """
        settings = await database.fetch_one(settings_query, values={"user_id": user_id})
        
        if not settings or not settings.email_notifications:
            return
        
        # Get user email
        user_query = "SELECT email, first_name FROM users WHERE id = :user_id"
        user = await database.fetch_one(user_query, values={"user_id": user_id})
        
        if not user:
            return
        
        # Here you would integrate with your email service
        # For example, SendGrid, AWS SES, or Mailgun
        
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
