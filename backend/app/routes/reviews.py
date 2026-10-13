from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.booking import Booking, BookingStatus
from backend.app.models.review import Review
from backend.app.schemas.review import ReviewCreate, ReviewResponse
from backend.app.schemas.common import ApiResponse
from backend.app.auth.dependencies import get_current_user

router = APIRouter(prefix="/reviews", tags=["Reviews"])

@router.post("", response_model=ApiResponse[ReviewResponse])
def create_review(
    review_in: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Verify booking exists and belongs to customer
    booking = db.query(Booking).filter(
        Booking.id == review_in.booking_id,
        Booking.customer_id == current_user.id
    ).first()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only submit reviews for bookings you have made"
        )

    # 2. Verify booking is confirmed or completed (eligible for review)
    if booking.status not in [BookingStatus.CONFIRMED, BookingStatus.COMPLETED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reviews can only be submitted for confirmed or completed bookings"
        )

    # 3. Prevent duplicate reviews for same booking
    existing = db.query(Review).filter(Review.booking_id == review_in.booking_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already submitted a review for this booking"
        )

    review = Review(
        booking_id=booking.id,
        customer_id=current_user.id,
        property_id=booking.property_id or review_in.property_id,
        activity_id=review_in.activity_id,
        rating=review_in.rating,
        title=review_in.title,
        comment=review_in.comment.strip(),
        is_approved=True  # Default approved, subject to admin moderation
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    return ApiResponse(
        success=True,
        message="Review published successfully! Thank you for your feedback.",
        data=ReviewResponse.model_validate(review)
    )

@router.get("/property/{property_id}", response_model=ApiResponse[List[ReviewResponse]])
def get_property_reviews(property_id: int, db: Session = Depends(get_db)):
    reviews = db.query(Review).filter(
        Review.property_id == property_id,
        Review.is_approved == True
    ).order_by(desc(Review.created_at)).all()

    return ApiResponse(
        success=True,
        data=[ReviewResponse.model_validate(r) for r in reviews]
    )
