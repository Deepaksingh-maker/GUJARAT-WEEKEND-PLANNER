from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.booking import Booking, BookingStatus, PaymentStatus
from backend.app.schemas.payment import (
    PaymentInitiateRequest, PaymentInitiateResponse,
    PaymentVerifyRequest, PaymentVerifyResponse
)
from backend.app.schemas.common import ApiResponse
from backend.app.auth.dependencies import get_current_user
from backend.app.services.payment_service import payment_service
from backend.app.services.booking_service import booking_service

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.get("/config")
def get_payment_config():
    return {
        "key_id": payment_service.key_id,
        "simulation_mode": payment_service.simulation_mode,
        "currency": "INR"
    }

@router.post("/initiate", response_model=ApiResponse[PaymentInitiateResponse])
def initiate_payment(
    req: PaymentInitiateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == req.booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized access to booking payment")

    if booking.status == BookingStatus.CONFIRMED and booking.payment_status == PaymentStatus.PAID:
        raise HTTPException(status_code=400, detail="Booking is already paid and confirmed")

    if booking.status in [BookingStatus.CANCELLED, BookingStatus.EXPIRED]:
        raise HTTPException(status_code=400, detail=f"Cannot initiate payment for {booking.status.value} booking")

    order_data = payment_service.create_order(
        booking_code=booking.booking_code,
        amount_in_rupees=booking.total
    )

    return ApiResponse(
        success=True,
        message="Payment order initiated",
        data=PaymentInitiateResponse(
            order_id=order_data["order_id"],
            amount=booking.total,
            currency="INR",
            key_id=order_data["key_id"],
            booking_code=booking.booking_code,
            customer_name=current_user.full_name,
            customer_email=current_user.email,
            customer_phone=current_user.phone,
            notes={
                "booking_id": booking.id,
                "property_id": booking.property_id
            }
        )
    )

@router.post("/verify", response_model=ApiResponse[PaymentVerifyResponse])
def verify_payment(
    req: PaymentVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == req.booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized access to booking payment")

    # Critical Server-Side Payment Verification:
    is_valid = payment_service.verify_signature(
        order_id=req.razorpay_order_id,
        payment_id=req.razorpay_payment_id,
        signature=req.razorpay_signature
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment verification failed: Invalid transaction signature or tampering detected"
        )

    # Server-side confirmation
    confirmed_booking = booking_service.confirm_payment_and_booking(
        db=db,
        booking=booking,
        order_id=req.razorpay_order_id,
        transaction_id=req.razorpay_payment_id,
        signature=req.razorpay_signature,
        payment_method=req.payment_method or "UPI"
    )

    return ApiResponse(
        success=True,
        message="Payment verified successfully. Booking confirmed!",
        data=PaymentVerifyResponse(
            verified=True,
            booking_id=confirmed_booking.id,
            booking_code=confirmed_booking.booking_code,
            status=confirmed_booking.status.value,
            payment_status=confirmed_booking.payment_status.value,
            transaction_id=req.razorpay_payment_id,
            message="Booking confirmed with verified payment."
        )
    )

@router.post("/generate-simulation-signature")
def get_simulation_signature(
    order_id: str,
    payment_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Simulation endpoint for dev/test verification flow.
    """
    if not payment_service.simulation_mode:
        raise HTTPException(status_code=403, detail="Simulation mode is disabled in production")
        
    sig = payment_service.generate_simulation_signature(order_id, payment_id)
    return {"signature": sig, "order_id": order_id, "payment_id": payment_id}
