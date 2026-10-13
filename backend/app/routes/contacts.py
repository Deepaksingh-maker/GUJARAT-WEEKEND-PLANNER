from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.database import get_db
from backend.app.models.user import User, UserRole
from backend.app.models.host import Host
from backend.app.models.property import Property
from backend.app.models.booking import Booking, BookingStatus, PaymentStatus
from backend.app.models.contact_access import ContactAccessLog, SystemSetting
from backend.app.models.message import ChatMessage
from backend.app.schemas.common import ApiResponse
from backend.app.auth.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/contacts", tags=["Controlled Contacts"])

class ContactAccessRequest(BaseModel):
    booking_id: int
    channel: str # "whatsapp" | "call"

class ContactSettingsUpdate(BaseModel):
    mode: str # "strict" | "standard"

def format_whatsapp_url(phone_raw: str, message: str) -> str:
    """Sanitizes and formats an Indian or international phone number for wa.me URL"""
    digits = "".join(filter(str.isdigit, phone_raw or ""))
    if len(digits) == 10:
        digits = f"91{digits}"
    elif digits.startswith("0") and len(digits) == 11:
        digits = f"91{digits[1:]}"
    encoded = urllib.parse.quote(message)
    return f"https://wa.me/{digits}?text={encoded}"

@router.get("/booking/{booking_id_or_code}")
def get_booking_contact_access(
    booking_id_or_code: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Secure Contact Unlock Endpoint:
    Returns host contact information and WhatsApp/Phone action links ONLY IF:
    1. User is the guest who booked OR the host who owns the property OR admin.
    2. Booking status == CONFIRMED and payment_status == PAID.
    Never exposes host personal contact if booking is unconfirmed, unpaid, or cancelled.
    """
    # 1. Lookup booking by id or booking_code
    if booking_id_or_code.isdigit():
        booking = db.query(Booking).filter(Booking.id == int(booking_id_or_code)).first()
    else:
        booking = db.query(Booking).filter(Booking.booking_code == booking_id_or_code).first()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking record not found"
        )

    # 2. Authorization check
    is_guest = booking.customer_id == current_user.id
    is_host = False
    if booking.property and booking.property.host:
        is_host = booking.property.host.user_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN

    if not (is_guest or is_host or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have authorization to view contact details for this reservation."
        )

    # 3. Status Check: Must be CONFIRMED and PAID
    b_status = booking.status.value if hasattr(booking.status, "value") else str(booking.status).lower()
    p_status = booking.payment_status.value if hasattr(booking.payment_status, "value") else str(booking.payment_status).lower()

    if b_status != "confirmed" or p_status != "paid":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Direct contact is locked. Contact details are available only for confirmed and paid bookings. Current status: {b_status.upper()} ({p_status.upper()})."
        )

    # 4. Resolve Host & Guest Contacts
    prop = booking.property
    host = prop.host if prop else None
    guest = booking.customer

    host_phone = (host.phone if host and host.phone else (host.user.phone if host and host.user and host.user.phone else "+919898012345")) if host else "+919898012345"
    host_name = host.business_name if host else "Property Host"
    guest_phone = guest.phone if guest and guest.phone else "Not specified"
    guest_name = guest.full_name if guest else "Guest"

    # Pre-filled WhatsApp message as required
    wa_message = (
        f"Hello {host_name}, I have a confirmed booking on GujaratWeekend.\n\n"
        f"Booking ID: {booking.booking_code}\n"
        f"Property: {prop.name if prop else 'Gujarat Stay'}\n"
        f"Check-in: {booking.check_in}\n"
        f"Check-out: {booking.check_out}\n"
        f"Guests: {booking.guest_count}\n\n"
        f"Looking forward to our stay!"
    )

    wa_url = format_whatsapp_url(host_phone, wa_message)
    call_url = f"tel:{host_phone.replace(' ', '')}"

    # Guest WhatsApp message for Host
    guest_wa_message = (
        f"Namaste {guest_name}, this is {host_name} regarding your confirmed stay at "
        f"{prop.name if prop else 'Gujarat Stay'} (Booking ID: {booking.booking_code}). "
        f"We are preparing for your arrival on {booking.check_in}!"
    )
    guest_wa_url = format_whatsapp_url(guest_phone, guest_wa_message) if guest_phone != "Not specified" else None
    guest_call_url = f"tel:{guest_phone.replace(' ', '')}" if guest_phone != "Not specified" else None

    # 5. Record contact view access log
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    log_entry = ContactAccessLog(
        booking_id=booking.id,
        guest_id=booking.customer_id,
        host_id=host.id if host else None,
        channel="view",
        whatsapp_unlocked=True,
        phone_unlocked=True,
        accessed_by_user_id=current_user.id,
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(log_entry)
    db.commit()

    return ApiResponse(
        success=True,
        message="Contact details unlocked for confirmed booking",
        data={
            "booking_id": booking.id,
            "booking_code": booking.booking_code,
            "status": b_status,
            "payment_status": p_status,
            "unlocked": True,
            "unlocked_at": datetime.now(timezone.utc).isoformat(),
            "host_name": host_name,
            "host_phone": host_phone,
            "whatsapp_url": wa_url,
            "call_url": call_url,
            "prefilled_message": wa_message,
            "host": {
                "name": host_name,
                "phone": host_phone,
                "whatsapp_url": wa_url,
                "call_url": call_url,
                "host_type": host.host_type.value if host and hasattr(host.host_type, "value") else "Host",
            },
            "guest": {
                "name": guest_name,
                "phone": guest_phone,
                "email": guest.email if guest else None,
                "whatsapp_url": guest_wa_url,
                "call_url": guest_call_url
            }
        }
    )

@router.post("/log-access")
def log_contact_action(
    req: ContactAccessRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Logs when user clicks WhatsApp Host or Call Host buttons"""
    booking = db.query(Booking).filter(Booking.id == req.booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    host_id = booking.property.host_id if booking.property else None
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    log = ContactAccessLog(
        booking_id=booking.id,
        guest_id=booking.customer_id,
        host_id=host_id,
        channel=req.channel,
        whatsapp_unlocked=True,
        phone_unlocked=True,
        accessed_by_user_id=current_user.id,
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(log)
    db.commit()
    return ApiResponse(success=True, message=f"Logged {req.channel} access")

@router.get("/property/{property_id}/status")
def get_property_contact_status(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    Checks if current authenticated user has an active confirmed & paid booking for this property.
    Used by Property Detail page to conditionally show 'Message Host' or 'WhatsApp Host'.
    """
    if not current_user:
        return ApiResponse(success=True, data={"has_confirmed_booking": False})

    # Check confirmed booking for this user and property
    confirmed_booking = db.query(Booking).filter(
        Booking.property_id == property_id,
        Booking.customer_id == current_user.id,
        Booking.status == BookingStatus.CONFIRMED,
        Booking.payment_status == PaymentStatus.PAID
    ).order_by(Booking.created_at.desc()).first()

    if confirmed_booking:
        return ApiResponse(
            success=True,
            data={
                "has_confirmed_booking": True,
                "booking_id": confirmed_booking.id,
                "booking_code": confirmed_booking.booking_code
            }
        )

    return ApiResponse(success=True, data={"has_confirmed_booking": False})

# --- ADMIN CONTACT AUDIT & SETTINGS ---
@router.get("/admin/logs")
def get_admin_contact_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Admin view: List of all contact unlock events and flagged bypass attempts"""
    logs = db.query(ContactAccessLog).order_by(ContactAccessLog.unlocked_at.desc()).limit(limit).all()
    
    results = []
    for l in logs:
        booking = db.query(Booking).filter(Booking.id == l.booking_id).first()
        guest = db.query(User).filter(User.id == l.guest_id).first()
        host = db.query(Host).filter(Host.id == l.host_id).first() if l.host_id else None
        
        results.append({
            "id": l.id,
            "booking_id": l.booking_id,
            "booking_code": booking.booking_code if booking else "N/A",
            "property_name": booking.property.name if booking and booking.property else "Stay",
            "guest_name": guest.full_name if guest else "Guest",
            "guest_email": guest.email if guest else "N/A",
            "host_name": host.business_name if host else "Host",
            "channel": l.channel,
            "whatsapp_unlocked": l.whatsapp_unlocked,
            "phone_unlocked": l.phone_unlocked,
            "unlocked_at": l.unlocked_at,
            "ip_address": l.ip_address
        })

    # Also fetch flagged anti-bypass messages
    flagged_msgs = (
        db.query(ChatMessage)
        .filter(ChatMessage.is_flagged == True)
        .order_by(ChatMessage.created_at.desc())
        .limit(30)
        .all()
    )
    
    flagged_data = []
    for fm in flagged_msgs:
        sender = db.query(User).filter(User.id == fm.sender_id).first()
        receiver = db.query(User).filter(User.id == fm.receiver_id).first()
        prop = db.query(Property).filter(Property.id == fm.property_id).first() if fm.property_id else None
        flagged_data.append({
            "id": fm.id,
            "sender_name": sender.full_name if sender else "User",
            "sender_role": sender.role.value if sender else "CUSTOMER",
            "receiver_name": receiver.full_name if receiver else "User",
            "property_name": prop.name if prop else "General",
            "message": fm.message,
            "original_message": fm.original_message or fm.message,
            "flag_reason": fm.flag_reason,
            "created_at": fm.created_at
        })

    # Fetch current contact protection mode
    setting = db.query(SystemSetting).filter(SystemSetting.key == "contact_protection_mode").first()
    mode = setting.value if setting else "strict"

    return ApiResponse(
        success=True,
        data={
            "mode": mode,
            "unlock_events": results,
            "flagged_attempts": flagged_data,
            "total_unlocks": len(results),
            "total_flagged": len(flagged_data)
        }
    )

@router.post("/admin/settings")
def update_contact_settings(
    req: ContactSettingsUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Admin endpoint to toggle Contact Protection: Strict Mode vs Standard Mode"""
    valid_modes = ["strict", "standard"]
    if req.mode.lower() not in valid_modes:
        raise HTTPException(status_code=400, detail="Invalid mode. Must be 'strict' or 'standard'")

    clean_mode = req.mode.lower()
    setting = db.query(SystemSetting).filter(SystemSetting.key == "contact_protection_mode").first()
    if setting:
        setting.value = clean_mode
        setting.updated_at = datetime.now(timezone.utc)
    else:
        setting = SystemSetting(
            key="contact_protection_mode",
            value=clean_mode,
            description="Contact protection mode: strict or standard",
            updated_at=datetime.now(timezone.utc)
        )
        db.add(setting)

    db.commit()
    return ApiResponse(
        success=True,
        message=f"Contact Protection mode set to {clean_mode.capitalize()} Mode",
        data={"mode": clean_mode}
    )
