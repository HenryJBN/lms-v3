from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import uuid
from datetime import datetime

from database.connection import database
from models.schemas import (
    NotificationResponse, NotificationCreate, NotificationUpdate,
    PaginationParams, PaginatedResponse, NotificationType
)
from middleware.auth import get_current_active_user, require_admin
from utils.notifications import send_push_notification, send_email_notification

router = APIRouter()

@router.get("/", response_model=PaginatedResponse)
async def get_notifications(
    pagination: PaginationParams = Depends(),
    is_read: Optional[bool] = Query(None),
    type: Optional[NotificationType] = Query(None),
    current_user = Depends(get_current_active_user)
):
    # Build query with filters
    where_conditions = ["n.user_id = :user_id"]
    values = {
        "user_id": current_user.id,
        "size": pagination.size,
        "offset": (pagination.page - 1) * pagination.size
    }
    
    if is_read is not None:
        where_conditions.append("n.is_read = :is_read")
        values["is_read"] = is_read
    
    if type:
        where_conditions.append("n.type = :type")
        values["type"] = type
    
    where_clause = "WHERE " + " AND ".join(where_conditions)
    
    # Get total count
    count_query = f"""
        SELECT COUNT(*) as total 
        FROM notifications n {where_clause}
    """
    total_result = await database.fetch_one(count_query, values=values)
    total = total_result.total
    
    # Get notifications
    query = f"""
        SELECT n.* FROM notifications n
        {where_clause}
        ORDER BY n.created_at DESC
        LIMIT :size OFFSET :offset
    """
    
    notifications = await database.fetch_all(query, values=values)
    
    return PaginatedResponse(
        items=[NotificationResponse(**notification) for notification in notifications],
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=(total + pagination.size - 1) // pagination.size
    )

@router.get("/unread-count")
async def get_unread_count(current_user = Depends(get_current_active_user)):
    query = """
        SELECT COUNT(*) as count 
        FROM notifications 
        WHERE user_id = :user_id AND is_read = false
    """
    
    result = await database.fetch_one(query, values={"user_id": current_user.id})
    return {"unread_count": result.count}

@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: uuid.UUID,
    current_user = Depends(get_current_active_user)
):
    # Check if notification belongs to user
    check_query = """
        SELECT id FROM notifications 
        WHERE id = :notification_id AND user_id = :user_id
    """
    notification = await database.fetch_one(check_query, values={
        "notification_id": notification_id,
        "user_id": current_user.id
    })
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    # Mark as read
    query = """
        UPDATE notifications 
        SET is_read = true, read_at = NOW(), updated_at = NOW()
        WHERE id = :notification_id
        RETURNING *
    """
    
    updated_notification = await database.fetch_one(query, values={"notification_id": notification_id})
    return NotificationResponse(**updated_notification)

@router.put("/mark-all-read")
async def mark_all_notifications_read(current_user = Depends(get_current_active_user)):
    query = """
        UPDATE notifications 
        SET is_read = true, read_at = NOW(), updated_at = NOW()
        WHERE user_id = :user_id AND is_read = false
    """
    
    result = await database.execute(query, values={"user_id": current_user.id})
    return {"message": f"Marked {result} notifications as read"}

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: uuid.UUID,
    current_user = Depends(get_current_active_user)
):
    # Check if notification belongs to user
    check_query = """
        SELECT id FROM notifications 
        WHERE id = :notification_id AND user_id = :user_id
    """
    notification = await database.fetch_one(check_query, values={
        "notification_id": notification_id,
        "user_id": current_user.id
    })
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    # Delete notification
    query = "DELETE FROM notifications WHERE id = :notification_id"
    await database.execute(query, values={"notification_id": notification_id})
    
    return {"message": "Notification deleted successfully"}

@router.post("/", response_model=NotificationResponse)
async def create_notification(
    notification: NotificationCreate,
    current_user = Depends(require_admin)
):
    """Admin endpoint to create notifications"""
    
    notification_id = uuid.uuid4()
    
    query = """
        INSERT INTO notifications (
            id, user_id, type, title, message, data, priority
        )
        VALUES (
            :id, :user_id, :type, :title, :message, :data, :priority
        )
        RETURNING *
    """
    
    values = {
        "id": notification_id,
        **notification.dict()
    }
    
    new_notification = await database.fetch_one(query, values=values)
    
    # Send push notification if enabled
    try:
        await send_push_notification(
            user_id=notification.user_id,
            title=notification.title,
            message=notification.message,
            data=notification.data
        )
    except Exception:
        pass  # Push notification failed, but database notification was created
    
    return NotificationResponse(**new_notification)

@router.post("/broadcast")
async def broadcast_notification(
    notification: NotificationCreate,
    user_ids: Optional[List[uuid.UUID]] = None,
    role: Optional[str] = Query(None),
    current_user = Depends(require_admin)
):
    """Admin endpoint to broadcast notifications to multiple users"""
    
    # Determine target users
    if user_ids:
        target_users = user_ids
    elif role:
        # Get users by role
        users_query = "SELECT id FROM users WHERE role = :role AND status = 'active'"
        users = await database.fetch_all(users_query, values={"role": role})
        target_users = [user.id for user in users]
    else:
        # Get all active users
        users_query = "SELECT id FROM users WHERE status = 'active'"
        users = await database.fetch_all(users_query)
        target_users = [user.id for user in users]
    
    if not target_users:
        return {"message": "No target users found"}
    
    # Create notifications for all target users
    notifications_data = []
    for user_id in target_users:
        notification_id = uuid.uuid4()
        notifications_data.append({
            "id": notification_id,
            "user_id": user_id,
            "type": notification.type,
            "title": notification.title,
            "message": notification.message,
            "data": notification.data,
            "priority": notification.priority
        })
    
    # Bulk insert notifications
    if notifications_data:
        query = """
            INSERT INTO notifications (id, user_id, type, title, message, data, priority)
            VALUES (:id, :user_id, :type, :title, :message, :data, :priority)
        """
        
        await database.execute_many(query, notifications_data)
        
        # Send push notifications (async, don't wait for completion)
        for user_id in target_users:
            try:
                await send_push_notification(
                    user_id=user_id,
                    title=notification.title,
                    message=notification.message,
                    data=notification.data
                )
            except Exception:
                continue  # Continue with other notifications if one fails
    
    return {"message": f"Broadcast sent to {len(target_users)} users"}

@router.get("/settings")
async def get_notification_settings(current_user = Depends(get_current_active_user)):
    query = """
        SELECT * FROM notification_settings 
        WHERE user_id = :user_id
    """
    
    settings = await database.fetch_one(query, values={"user_id": current_user.id})
    
    if not settings:
        # Create default settings
        default_settings = {
            "user_id": current_user.id,
            "email_notifications": True,
            "push_notifications": True,
            "course_updates": True,
            "assignment_reminders": True,
            "certificate_notifications": True,
            "marketing_emails": False
        }
        
        create_query = """
            INSERT INTO notification_settings (
                user_id, email_notifications, push_notifications,
                course_updates, assignment_reminders, certificate_notifications,
                marketing_emails
            )
            VALUES (
                :user_id, :email_notifications, :push_notifications,
                :course_updates, :assignment_reminders, :certificate_notifications,
                :marketing_emails
            )
            RETURNING *
        """
        
        settings = await database.fetch_one(create_query, values=default_settings)
    
    return settings

@router.put("/settings")
async def update_notification_settings(
    settings_update: dict,
    current_user = Depends(get_current_active_user)
):
    # Check if settings exist
    check_query = "SELECT id FROM notification_settings WHERE user_id = :user_id"
    existing = await database.fetch_one(check_query, values={"user_id": current_user.id})
    
    if existing:
        # Update existing settings
        update_fields = []
        values = {"user_id": current_user.id}
        
        for field, value in settings_update.items():
            if field in ["email_notifications", "push_notifications", "course_updates", 
                        "assignment_reminders", "certificate_notifications", "marketing_emails"]:
                update_fields.append(f"{field} = :{field}")
                values[field] = value
        
        if update_fields:
            query = f"""
                UPDATE notification_settings 
                SET {', '.join(update_fields)}, updated_at = NOW()
                WHERE user_id = :user_id
                RETURNING *
            """
            
            updated_settings = await database.fetch_one(query, values=values)
        else:
            query = "SELECT * FROM notification_settings WHERE user_id = :user_id"
            updated_settings = await database.fetch_one(query, values={"user_id": current_user.id})
    else:
        # Create new settings
        create_fields = ["user_id"] + list(settings_update.keys())
        create_values = [":user_id"] + [f":{field}" for field in settings_update.keys()]
        
        query = f"""
            INSERT INTO notification_settings ({', '.join(create_fields)})
            VALUES ({', '.join(create_values)})
            RETURNING *
        """
        
        values = {"user_id": current_user.id, **settings_update}
        updated_settings = await database.fetch_one(query, values=values)
    
    return updated_settings
