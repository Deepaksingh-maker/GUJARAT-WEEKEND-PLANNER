import urllib.parse
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models.user import User, UserRole
from backend.app.models.booking import Booking, BookingStatus, PaymentStatus, BookingItemType
from backend.app.models.review import Review
from backend.app.schemas.booking import (
    BookingCreateRequest, BookingResponse, PriceBreakdownRequest,
    PriceBreakdownResponse, BookingCancelRequest, BookingPropertySummary,
    BookingCustomerSummary, BookingItemResponse
)
from backend.app.schemas.common import ApiResponse
from backend.app.auth.dependencies import get_current_user, require_customer
from backend.app.services.booking_service import booking_service

router = APIRouter(prefix="/bookings", tags=["Bookings"])

def build_booking_response(b: Booking, db: Session, current_user: Optional[User] = None) -> BookingResponse:
    # Check if user already reviewed
    already_reviewed = db.query(Review).filter(Review.booking_id == b.id).first() is not None
    # User can review if status is CONFIRMED or COMPLETED and not reviewed yet
    can_review = (b.status in [BookingStatus.CONFIRMED, BookingStatus.COMPLETED]) and not already_reviewed

    # Controlled Contact Authorization Check
    is_confirmed_and_paid = (
        b.status == BookingStatus.CONFIRMED and b.payment_status == PaymentStatus.PAID
    )
    is_admin = (current_user.role == UserRole.ADMIN) if current_user else False
    is_self_customer = bool(current_user and current_user.id == b.customer_id)
    is_property_host = False
    if current_user and b.property and b.property.host:
        is_property_host = (b.property.host.user_id == current_user.id)

    contact_unlocked = is_confirmed_and_paid and (is_self_customer or is_property_host or is_admin)

    # Compute controlled WhatsApp and Call action URLs if unlocked
    whatsapp_url = None
    call_url = None
    if contact_unlocked:
        if is_self_customer or is_admin:
            # Guest or Admin accessing Host Contact
            host_phone = b.property.host.phone if b.property and b.property.host and b.property.host.phone else "+919898012345"
            host_name = b.property.host.business_name if b.property and b.property.host else "Gujarat Host"
            wa_text = (
                f"Hello {host_name}, I have a confirmed booking on GujaratWeekend.\n\n"
                f"Booking ID: {b.booking_code}\n"
                f"Property: {b.property.name if b.property else 'Gujarat Stay'}\n"
                f"Check-in: {b.check_in}\n"
                f"Check-out: {b.check_out}\n"
                f"Guests: {b.guest_count}\n\n"
                f"Looking forward to our stay!"
            )
            digits = "".join(filter(str.isdigit, host_phone))
            if len(digits) == 10: digits = f"91{digits}"
            elif digits.startswith("0") and len(digits) == 11: digits = f"91{digits[1:]}"
            whatsapp_url = f"https://wa.me/{digits}?text={urllib.parse.quote(wa_text)}"
            call_url = f"tel:{host_phone.replace(' ', '')}"
        elif is_property_host:
            # Host accessing Guest Contact
            guest_phone = b.customer.phone if b.customer and b.customer.phone else ""
            guest_name = b.customer.full_name if b.customer else "Valued Guest"
            if guest_phone:
                digits = "".join(filter(str.isdigit, guest_phone))
                if len(digits) == 10: digits = f"91{digits}"
                elif digits.startswith("0") and len(digits) == 11: digits = f"91{digits[1:]}"
                wa_text = (
                    f"Namaste {guest_name}, this is your host for {b.property.name if b.property else 'your stay'} "
                    f"(Booking ID: {b.booking_code}). We are excited to welcome you on {b.check_in}!"
                )
                whatsapp_url = f"https://wa.me/{digits}?text={urllib.parse.quote(wa_text)}"
                call_url = f"tel:{guest_phone.replace(' ', '')}"

    prop_summary = None
    if b.property:
        primary_img = next((img.image_url for img in b.property.images if img.is_primary), None)
        if not primary_img and b.property.images:
            primary_img = b.property.images[0].image_url
            
        prop_summary = BookingPropertySummary(
            id=b.property.id,
            name=b.property.name,
            slug=b.property.slug,
            property_type=b.property.property_type.value,
            address=b.property.address,
            location_name=b.property.location.name if b.property.location else "Gujarat",
            primary_image=primary_img
        )

    # Customer Contact Masking for unconfirmed / pending reservations
    cust_summary = None
    if b.customer:
        if is_self_customer or is_admin or (is_property_host and is_confirmed_and_paid):
            cust_phone = b.customer.phone
            cust_email = b.customer.email
        else:
            # Masked: Host or public cannot see guest direct phone/email before confirmed booking
            cust_phone = "+91 ••••• •••••"
            cust_email = "•••••@•••••"

        cust_summary = BookingCustomerSummary(
            id=b.customer.id,
            full_name=b.customer.full_name,
            email=cust_email,
            phone=cust_phone
        )

    items_resp = [BookingItemResponse.model_validate(item) for item in b.items]

    return BookingResponse(
        id=b.id,
        booking_code=b.booking_code,
        customer_id=b.customer_id,
        property_id=b.property_id,
        check_in=b.check_in,
        check_out=b.check_out,
        guest_count=b.guest_count,
        subtotal=b.subtotal,
        cleaning_fee=b.cleaning_fee,
        tax=b.tax,
        discount=b.discount,
        total=b.total,
        status=b.status,
        payment_status=b.payment_status,
        cancellation_reason=b.cancellation_reason,
        qr_code_data=b.qr_code_data,
        special_requests=b.special_requests,
        coupon_code=b.coupon_code,
        created_at=b.created_at,
        updated_at=b.updated_at,
        property=prop_summary,
        customer=cust_summary,
        items=items_resp,
        can_review=can_review,
        contact_unlocked=contact_unlocked,
        whatsapp_url=whatsapp_url,
        call_url=call_url
    )

@router.post("/calculate-price", response_model=ApiResponse[PriceBreakdownResponse])
def calculate_price(
    req: PriceBreakdownRequest,
    db: Session = Depends(get_db)
):
    try:
        pricing = booking_service.calculate_price_breakdown(
            db=db,
            property_id=req.property_id,
            check_in=req.check_in,
            check_out=req.check_out,
            guest_count=req.guest_count,
            coupon_code=req.coupon_code,
            activities=req.activities
        )
        return ApiResponse(
            success=True,
            data=PriceBreakdownResponse(**pricing)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("", response_model=ApiResponse[BookingResponse])
def create_booking(
    booking_in: BookingCreateRequest,
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db)
):
    booking = booking_service.create_booking(
        db=db,
        customer=current_user,
        booking_in=booking_in
    )
    return ApiResponse(
        success=True,
        message="Booking reservation created. Proceed to payment to confirm your stay.",
        data=build_booking_response(booking, db, current_user)
    )

@router.get("", response_model=ApiResponse[List[BookingResponse]])
def get_my_bookings(
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db)
):
    bookings = db.query(Booking).filter(
        Booking.customer_id == current_user.id
    ).order_by(desc(Booking.created_at)).all()

    return ApiResponse(
        success=True,
        data=[build_booking_response(b, db, current_user) for b in bookings]
    )

@router.get("/{id_or_code}", response_model=ApiResponse[BookingResponse])
def get_booking_detail(
    id_or_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if id_or_code.isdigit():
        booking = db.query(Booking).filter(Booking.id == int(id_or_code)).first()
    else:
        booking = db.query(Booking).filter(Booking.booking_code == id_or_code.upper()).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Authorization: Customer who booked, or Host of property, or Admin
    is_owner = booking.customer_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN
    is_host = False
    if booking.property and current_user.host_profile:
        is_host = booking.property.host_id == current_user.host_profile.id

    if not (is_owner or is_admin or is_host):
        raise HTTPException(status_code=403, detail="Unauthorized access to this booking")

    return ApiResponse(
        success=True,
        data=build_booking_response(booking, db, current_user)
    )

@router.post("/{id}/cancel", response_model=ApiResponse[BookingResponse])
def cancel_booking(
    id: int,
    cancel_in: BookingCancelRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    is_owner = booking.customer_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN

    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="Unauthorized to cancel this booking")

    if booking.status in [BookingStatus.CANCELLED, BookingStatus.COMPLETED, BookingStatus.REFUNDED]:
        raise HTTPException(status_code=400, detail=f"Booking is already {booking.status.value}")

    cancelled_booking = booking_service.cancel_booking(
        db=db,
        booking=booking,
        reason=cancel_in.reason
    )

    return ApiResponse(
        success=True,
        message="Booking cancelled successfully. Cancellation policy applied.",
        data=build_booking_response(cancelled_booking, db, current_user)
    )

@router.get("/verify-pass/{booking_code}", response_model=ApiResponse[BookingResponse])
def verify_qr_pass(
    booking_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Host or Admin can scan a customer's QR pass on check-in to verify booking authenticity.
    """
    booking = db.query(Booking).filter(Booking.booking_code == booking_code.upper()).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Invalid booking QR pass")

    return ApiResponse(
        success=True,
        message="Valid Gujarat Weekend Booking Pass",
        data=build_booking_response(booking, db, current_user)
    )
