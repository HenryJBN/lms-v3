from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import uuid
from datetime import datetime

from database.session import get_session, AsyncSession
from sqlmodel import select, func, and_, or_, desc, col
from models.communication import Notification, NotificationSettings
from schemas.communication import NotificationCreate, NotificationUpdate, NotificationResponse
from schemas.common import PaginationParams, PaginatedResponse
from models.enums import NotificationType
from middleware.auth import get_current_active_user, require_admin
from utils.notifications import send_push_notification, send_email_notification

router = APIRouter()

@router.get("/", response_model=PaginatedResponse[NotificationResponse])
async def get_notifications(
    pagination: PaginationParams = Depends(),
    is_read: Optional[bool] = Query(None),
    type: Optional[NotificationType] = Query(None),
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Get notifications for current user"""
    query = select(Notification).where(Notification.user_id == current_user.id)
    
    if is_read is not None:
        query = query.where(Notification.is_read == is_read)
    if type:
        query = query.where(Notification.type == type)
        
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await session.exec(count_query)).one()
    
    # Get results
    query = query.order_by(desc(Notification.created_at)).limit(pagination.size).offset((pagination.page - 1) * pagination.size)
    result = await session.exec(query)
    notifications = [NotificationResponse(**n.model_dump()) for n in result.all()]
    
    return PaginatedResponse(
        items=notifications,
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=(total + pagination.size - 1) // pagination.size
    )

@router.get("/unread-count")
async def get_unread_count(
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Get unread notifications count"""
    query = select(func.count(Notification.id)).where(
        Notification.user_id == current_user.id, 
        Notification.is_read == False
    )
    count = (await session.exec(query)).one()
    return {"unread_count": count}

@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: uuid.UUID,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Mark a notification as read"""
    query = select(Notification).where(
        Notification.id == notification_id, 
        Notification.user_id == current_user.id
    )
    result = await session.exec(query)
    notification = result.first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    notification.is_read = True
    notification.read_at = datetime.utcnow()
    notification.updated_at = datetime.utcnow()
    
    session.add(notification)
    await session.commit()
    await session.refresh(notification)
    return notification

@router.put("/mark-all-read")
async def mark_all_notifications_read(
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Mark all unread notifications as read"""
    query = select(Notification).where(
        Notification.user_id == current_user.id, 
        Notification.is_read == False
    )
    result = await session.exec(query)
    notifications = result.all()
    
    for notification in notifications:
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        notification.updated_at = datetime.utcnow()
        session.add(notification)
        
    await session.commit()
    return {"message": f"Marked {len(notifications)} notifications as read"}

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: uuid.UUID,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Delete a notification"""
    query = select(Notification).where(
        Notification.id == notification_id, 
        Notification.user_id == current_user.id
    )
    result = await session.exec(query)
    notification = result.first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    await session.delete(notification)
    await session.commit()
    return {"message": "Notification deleted successfully"}

@router.post("/", response_model=NotificationResponse)
async def create_notification(
    notification_in: NotificationCreate,
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """Admin endpoint to create notifications"""
    new_notification = Notification(
        **notification_in.model_dump(),
        id=uuid.uuid4()
    )
    
    session.add(new_notification)
    await session.commit()
    await session.refresh(new_notification)
    
    # Send push notification if enabled
    try:
        await send_push_notification(
            user_id=new_notification.user_id,
            title=new_notification.title,
            message=new_notification.message,
            data=new_notification.data
        )
    except Exception:
        pass  # Push notification failed, but database notification was created
    
    return new_notification

@router.post("/broadcast")
async def broadcast_notification(
    notification_in: NotificationCreate,
    user_ids: Optional[List[uuid.UUID]] = None,
    role: Optional[str] = Query(None),
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """Admin endpoint to broadcast notifications to multiple users"""
    from models.user import User
    
    # Determine target users
    if user_ids:
        target_users = user_ids
    elif role:
        # Get users by role
        users_query = select(User.id).where(User.role == role, User.status == 'active')
        result = await session.exec(users_query)
        target_users = result.all()
    else:
        # Get all active users
        users_query = select(User.id).where(User.status == 'active')
        result = await session.exec(users_query)
        target_users = result.all()
    
    if not target_users:
        return {"message": "No target users found"}
    
    # Create notifications for all target users
    for user_id in target_users:
        new_notification = Notification(
            id=uuid.uuid4(),
            user_id=user_id,
            type=notification_in.type,
            title=notification_in.title,
            message=notification_in.message,
            data=notification_in.data,
            priority=notification_in.priority
        )
        session.add(new_notification)
    
    await session.commit()
    
    # Send push notifications (async, don't wait for completion)
    # Note: In a production app, this should be a background task
    for user_id in target_users:
        try:
            await send_push_notification(
                user_id=user_id,
                title=notification_in.title,
                message=notification_in.message,
                data=notification_in.data
            )
        except Exception:
            continue
    
    return {"message": f"Broadcast sent to {len(target_users)} users"}

@router.get("/settings")
async def get_notification_settings(
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Get or create notification settings for current user"""
    query = select(NotificationSettings).where(NotificationSettings.user_id == current_user.id)
    result = await session.exec(query)
    settings = result.first()
    
    if not settings:
        # Create default settings
        settings = NotificationSettings(
            user_id=current_user.id,
            email_notifications=True,
            push_notifications=True,
            course_updates=True,
            assignment_reminders=True,
            certificate_notifications=True,
            marketing_emails=False
        )
        session.add(settings)
        await session.commit()
        await session.refresh(settings)
    
    return settings

@router.put("/settings")
async def update_notification_settings(
    settings_update: dict,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Update notification settings"""
    query = select(NotificationSettings).where(NotificationSettings.user_id == current_user.id)
    result = await session.exec(query)
    settings = result.first()
    
    if not settings:
        settings = NotificationSettings(user_id=current_user.id)
        
    valid_fields = [
        "email_notifications", "push_notifications", "course_updates", 
        "assignment_reminders", "certificate_notifications", "marketing_emails"
    ]
    
    for field, value in settings_update.items():
        if field in valid_fields:
            setattr(settings, field, value)
            
    settings.updated_at = datetime.utcnow()
    session.add(settings)
    await session.commit()
    await session.refresh(settings)
    
    return settings
