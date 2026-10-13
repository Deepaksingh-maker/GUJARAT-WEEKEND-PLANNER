from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class ReviewCreate(BaseModel):
    booking_id: int
    property_id: Optional[int] = None
    activity_id: Optional[int] = None
    rating: int = Field(..., ge=1, le=5)
    title: Optional[str] = None
    comment: str = Field(..., min_length=10)

class ReviewCustomerSummary(BaseModel):
    id: int
    full_name: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True

class ReviewResponse(BaseModel):
    id: int
    booking_id: int
    customer_id: int
    property_id: Optional[int]
    activity_id: Optional[int]
    rating: int
    title: Optional[str]
    comment: str
    is_approved: bool
    created_at: datetime
    customer: Optional[ReviewCustomerSummary] = None

    class Config:
        from_attributes = True
