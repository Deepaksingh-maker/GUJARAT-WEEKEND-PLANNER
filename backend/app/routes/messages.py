from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from pydantic import BaseModel

from backend.app.database import get_db
from backend.app.models.user import User, UserRole
from backend.app.models.property import Property
from backend.app.models.message import ChatMessage
from backend.app.models.notification import Notification
from backend.app.models.booking import Booking, BookingStatus, PaymentStatus
from backend.app.models.contact_access import SystemSetting
from backend.app.services.contact_shield import ContactShield
from backend.app.schemas.common import ApiResponse
from backend.app.auth.dependencies import get_current_user

router = APIRouter(prefix="/messages", tags=["Messages"])

class SendMessageRequest(BaseModel):
    receiver_id: int
    property_id: Optional[int] = None
    booking_id: Optional[int] = None
    message: str

class UserMini(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    business_name: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True

class MessageResponse(BaseModel):
    id: int
    property_id: Optional[int] = None
    booking_id: Optional[int] = None
    conversation_id: Optional[str] = None
    sender_id: int
    receiver_id: int
    message: str
    is_read: bool
    is_flagged: bool = False
    flag_reason: Optional[str] = None
    created_at: datetime
    sender_name: Optional[str] = None
    receiver_name: Optional[str] = None
    property_name: Optional[str] = None

class ConversationSummary(BaseModel):
    conversation_id: Optional[str] = None
    other_user: UserMini
    property_id: Optional[int] = None
    property_name: Optional[str] = None
    property_image: Optional[str] = None
    booking_id: Optional[int] = None
    last_message: str
    last_message_time: datetime
    unread_count: int
    is_flagged: bool = False

@router.get("/unread-count", response_model=ApiResponse[dict])
def get_unread_message_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    unread = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.receiver_id == current_user.id,
            ChatMessage.is_read == False
        )
        .count()
    )
    return ApiResponse(success=True, data={"unread_count": unread})

@router.get("/thread", response_model=ApiResponse[List[MessageResponse]])
def get_message_thread(
    other_user_id: int = Query(...),
    property_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ChatMessage).filter(
        or_(
            and_(ChatMessage.sender_id == current_user.id, ChatMessage.receiver_id == other_user_id),
            and_(ChatMessage.sender_id == other_user_id, ChatMessage.receiver_id == current_user.id)
        )
    )
    if property_id:
        query = query.filter(ChatMessage.property_id == property_id)

    messages = query.order_by(ChatMessage.created_at.asc()).all()

    # Mark unread messages sent to current_user as read
    db.query(ChatMessage).filter(
        ChatMessage.sender_id == other_user_id,
        ChatMessage.receiver_id == current_user.id,
        ChatMessage.is_read == False
    ).update({"is_read": True})
    db.commit()

    # Build response with names
    result: List[MessageResponse] = []
    for msg in messages:
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        receiver = db.query(User).filter(User.id == msg.receiver_id).first()
        prop = db.query(Property).filter(Property.id == msg.property_id).first() if msg.property_id else None
        result.append(MessageResponse(
            id=msg.id,
            property_id=msg.property_id,
            booking_id=msg.booking_id,
            conversation_id=msg.conversation_id,
            sender_id=msg.sender_id,
            receiver_id=msg.receiver_id,
            message=msg.message,
            is_read=msg.is_read,
            is_flagged=msg.is_flagged,
            flag_reason=msg.flag_reason,
            created_at=msg.created_at,
            sender_name=sender.full_name if sender else "User",
            receiver_name=receiver.full_name if receiver else "User",
            property_name=prop.name if prop else None
        ))

    return ApiResponse(success=True, data=result)

@router.get("/conversations", response_model=ApiResponse[List[ConversationSummary]])
def get_user_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find all users current_user has exchanged messages with
    all_msgs = (
        db.query(ChatMessage)
        .filter(or_(ChatMessage.sender_id == current_user.id, ChatMessage.receiver_id == current_user.id))
        .order_by(ChatMessage.created_at.desc())
        .all()
    )

    conv_map = {}
    for m in all_msgs:
        other_id = m.receiver_id if m.sender_id == current_user.id else m.sender_id
        key = (other_id, m.property_id)
        if key not in conv_map:
            other_user = db.query(User).filter(User.id == other_id).first()
            if not other_user:
                continue
            prop = db.query(Property).filter(Property.id == m.property_id).first() if m.property_id else None
            prop_img = None
            if prop and prop.images and len(prop.images) > 0:
                # Find cover or first image
                cover = next((img.image_url for img in prop.images if getattr(img, "is_cover", False)), prop.images[0].image_url)
                prop_img = cover

            unread = (
                db.query(ChatMessage)
                .filter(
                    ChatMessage.sender_id == other_id,
                    ChatMessage.receiver_id == current_user.id,
                    ChatMessage.is_read == False
                )
                .count()
            )
            conv_id = m.conversation_id or f"conv_{min(current_user.id, other_id)}_{max(current_user.id, other_id)}_{m.property_id or 0}"
            
            b_name = None
            if hasattr(other_user, "host_profile") and other_user.host_profile:
                b_name = other_user.host_profile.business_name

            conv_map[key] = ConversationSummary(
                conversation_id=conv_id,
                other_user=UserMini(
                    id=other_user.id,
                    full_name=other_user.full_name,
                    email=other_user.email,
                    role=other_user.role.value if hasattr(other_user.role, "value") else str(other_user.role),
                    business_name=b_name,
                    avatar_url=other_user.avatar_url
                ),
                property_id=m.property_id,
                property_name=prop.name if prop else None,
                property_image=prop_img,
                booking_id=m.booking_id,
                last_message=m.message,
                last_message_time=m.created_at,
                unread_count=unread,
                is_flagged=m.is_flagged
            )

    return ApiResponse(success=True, data=list(conv_map.values()))

@router.post("", response_model=ApiResponse[MessageResponse])
def send_message(
    req: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    raw_text = req.message.strip()
    if not raw_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty")

    receiver = db.query(User).filter(User.id == req.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receiver user not found")

    prop = db.query(Property).filter(Property.id == req.property_id).first() if req.property_id else None
    conv_id = f"conv_{min(current_user.id, req.receiver_id)}_{max(current_user.id, req.receiver_id)}_{req.property_id or 0}"

    # 1. Check if an active confirmed and paid booking exists between sender & receiver
    has_confirmed_booking = False
    active_booking_id = req.booking_id

    # Controlled contact sharing is permitted ONLY if attached to a specific CONFIRMED & PAID booking
    if active_booking_id:
        b = db.query(Booking).filter(Booking.id == active_booking_id).first()
        if b:
            b_status = b.status.value if hasattr(b.status, "value") else str(b.status).lower()
            p_status = b.payment_status.value if hasattr(b.payment_status, "value") else str(b.payment_status).lower()
            b_guest_id = b.customer_id
            b_host_user_id = b.property.host.user_id if b.property and b.property.host else None

            if b_status == "confirmed" and p_status == "paid":
                if (current_user.id == b_guest_id and req.receiver_id == b_host_user_id) or \
                   (current_user.id == b_host_user_id and req.receiver_id == b_guest_id):
                    has_confirmed_booking = True

    # 2. Anti-Bypass Message Protection Scan
    scan_result = ContactShield.scan_message(raw_text)
    is_flagged = False
    flag_reason = None
    final_message = raw_text

    if scan_result["has_contact"] and not has_confirmed_booking:
        # Check system setting for Strict Mode vs Standard Mode
        mode_setting = db.query(SystemSetting).filter(SystemSetting.key == "contact_protection_mode").first()
        mode = mode_setting.value.lower() if mode_setting else "strict"
        
        is_flagged = True
        flag_reason = ", ".join(scan_result["reasons"])

        if mode == "strict":
            # In Strict Mode: Log audit attempt and reject with standard warning
            flagged_audit = ChatMessage(
                sender_id=current_user.id,
                receiver_id=req.receiver_id,
                property_id=req.property_id,
                booking_id=active_booking_id,
                conversation_id=conv_id,
                message="[BLOCKED BY ANTI-BYPASS SHIELD] Direct contact sharing attempt.",
                original_message=raw_text,
                is_read=True,
                is_flagged=True,
                flag_reason=flag_reason
            )
            db.add(flagged_audit)
            db.commit()

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Direct contact information cannot be shared before the booking is confirmed. Please continue the conversation through the platform."
            )
        else:
            # In Standard Mode: Mask sensitive details automatically
            final_message = scan_result["masked_text"]

    # 3. Create and persist message
    prior_msg_count = db.query(ChatMessage).filter(
        ChatMessage.sender_id == current_user.id,
        ChatMessage.receiver_id == req.receiver_id
    ).count()

    new_msg = ChatMessage(
        sender_id=current_user.id,
        receiver_id=req.receiver_id,
        property_id=req.property_id,
        booking_id=active_booking_id,
        conversation_id=conv_id,
        message=final_message,
        original_message=raw_text if is_flagged else None,
        is_read=False,
        is_flagged=is_flagged,
        flag_reason=flag_reason
    )
    db.add(new_msg)

    # Chat notifications are handled directly by the messages system & unread counters
    db.commit()
    db.refresh(new_msg)

    # 4. Instant host auto-acknowledgement on first interaction
    if prior_msg_count == 0 and receiver.role in (UserRole.HOST, UserRole.ADMIN):
        host_reply = ChatMessage(
            sender_id=receiver.id,
            receiver_id=current_user.id,
            property_id=req.property_id,
            booking_id=active_booking_id,
            conversation_id=conv_id,
            message=f"Namaste {current_user.full_name}! Thank you for your inquiry about {prop.name if prop else 'our stay'}. We're excited to host you in Gujarat! Let us know your dates, group size, and any special food/check-in requests.",
            is_read=False
        )
        db.add(host_reply)
        db.commit()

    return ApiResponse(
        success=True,
        message="Message sent successfully",
        data=MessageResponse(
            id=new_msg.id,
            property_id=new_msg.property_id,
            booking_id=new_msg.booking_id,
            conversation_id=new_msg.conversation_id,
            sender_id=new_msg.sender_id,
            receiver_id=new_msg.receiver_id,
            message=new_msg.message,
            is_read=new_msg.is_read,
            is_flagged=new_msg.is_flagged,
            flag_reason=new_msg.flag_reason,
            created_at=new_msg.created_at,
            sender_name=current_user.full_name,
            receiver_name=receiver.full_name,
            property_name=prop.name if prop else None
        )
    )
