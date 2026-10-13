from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.notification import Notification
from backend.app.schemas.common import ApiResponse
from backend.app.auth.dependencies import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    is_read: bool
    link: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    unread_count: int

@router.get("", response_model=ApiResponse[NotificationListResponse])
def get_user_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.title != "New Chat Message")
        .order_by(Notification.created_at.desc())
        .limit(30)
        .all()
    )
    unread_count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.title != "New Chat Message", Notification.is_read == False)
        .count()
    )

    # If new user has zero notifications, seed a warm welcome notification
    if len(notifications) == 0:
        welcome_note = Notification(
            user_id=current_user.id,
            title="Welcome to Gujarat Weekend!",
            message="Discover verified villas, resorts, and outdoor adventures across Gujarat. Start planning your getaway!",
            link="/explore",
            is_read=False
        )
        db.add(welcome_note)
        db.commit()
        db.refresh(welcome_note)
        notifications = [welcome_note]
        unread_count = 1

    return ApiResponse(
        success=True,
        data=NotificationListResponse(
            notifications=[NotificationResponse.model_validate(n) for n in notifications],
            unread_count=unread_count
        )
    )

@router.put("/{notification_id}/read", response_model=ApiResponse[dict])
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    note = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    note.is_read = True
    db.commit()
    return ApiResponse(success=True, message="Notification marked as read")

@router.put("/read-all", response_model=ApiResponse[dict])
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return ApiResponse(success=True, message="All notifications marked as read")
