from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, Field
from backend.app.models.coupon import DiscountType

class CouponBase(BaseModel):
    code: str
    description: Optional[str] = None
    discount_type: DiscountType = DiscountType.PERCENTAGE
    discount_value: float = Field(..., gt=0)
    min_booking_value: float = 0.0
    max_discount: Optional[float] = None
    valid_from: date
    valid_to: date
    max_uses: int = 100
    is_active: bool = True

class CouponCreate(CouponBase):
    pass

class CouponValidateRequest(BaseModel):
    code: str
    booking_amount: float

class CouponResponse(CouponBase):
    id: int
    current_uses: int
    created_at: datetime

    class Config:
        from_attributes = True

class CouponValidationResult(BaseModel):
    valid: bool
    code: str
    discount_amount: float
    message: str
