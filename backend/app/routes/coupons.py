from datetime import date
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.coupon import Coupon, DiscountType
from backend.app.schemas.coupon import (
    CouponValidateRequest, CouponValidationResult, CouponCreate, CouponResponse
)
from backend.app.schemas.common import ApiResponse
from backend.app.auth.dependencies import require_admin

router = APIRouter(prefix="/coupons", tags=["Coupons"])

@router.post("/validate", response_model=ApiResponse[CouponValidationResult])
def validate_coupon(
    req: CouponValidateRequest,
    db: Session = Depends(get_db)
):
    code_cleaned = req.code.upper().strip()
    coupon = db.query(Coupon).filter(Coupon.code == code_cleaned).first()
    
    if not coupon:
        return ApiResponse(
            success=False,
            message="Invalid coupon code",
            data=CouponValidationResult(valid=False, code=code_cleaned, discount_amount=0.0, message="Coupon does not exist")
        )

    if not coupon.is_active:
        return ApiResponse(
            success=False,
            message="Coupon is inactive",
            data=CouponValidationResult(valid=False, code=code_cleaned, discount_amount=0.0, message="Coupon has expired or is inactive")
        )

    today = date.today()
    if coupon.valid_from > today or coupon.valid_to < today:
        return ApiResponse(
            success=False,
            message="Coupon is not valid for today's date",
            data=CouponValidationResult(valid=False, code=code_cleaned, discount_amount=0.0, message="Coupon has expired")
        )

    if coupon.current_uses >= coupon.max_uses:
        return ApiResponse(
            success=False,
            message="Coupon usage limit reached",
            data=CouponValidationResult(valid=False, code=code_cleaned, discount_amount=0.0, message="Coupon limit exceeded")
        )

    if req.booking_amount < coupon.min_booking_value:
        return ApiResponse(
            success=False,
            message=f"Minimum booking value of ₹{coupon.min_booking_value} required for this coupon",
            data=CouponValidationResult(valid=False, code=code_cleaned, discount_amount=0.0, message=f"Minimum amount ₹{coupon.min_booking_value} required")
        )

    if coupon.discount_type == DiscountType.PERCENTAGE:
        disc = req.booking_amount * (coupon.discount_value / 100.0)
        if coupon.max_discount:
            disc = min(disc, coupon.max_discount)
    else:
        disc = min(coupon.discount_value, req.booking_amount)

    disc = round(disc, 2)
    return ApiResponse(
        success=True,
        message=f"Coupon applied! You saved ₹{disc}",
        data=CouponValidationResult(
            valid=True,
            code=code_cleaned,
            discount_amount=disc,
            message=f"₹{disc} discount applied"
        )
    )

@router.get("", response_model=ApiResponse[List[CouponResponse]])
def get_coupons(
    db: Session = Depends(get_db),
    admin = Depends(require_admin)
):
    coupons = db.query(Coupon).all()
    return ApiResponse(
        success=True,
        data=[CouponResponse.model_validate(c) for c in coupons]
    )

@router.post("", response_model=ApiResponse[CouponResponse])
def create_coupon(
    coupon_in: CouponCreate,
    db: Session = Depends(get_db),
    admin = Depends(require_admin)
):
    existing = db.query(Coupon).filter(Coupon.code == coupon_in.code.upper().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")

    c = Coupon(
        code=coupon_in.code.upper().strip(),
        description=coupon_in.description,
        discount_type=coupon_in.discount_type,
        discount_value=coupon_in.discount_value,
        min_booking_value=coupon_in.min_booking_value,
        max_discount=coupon_in.max_discount,
        valid_from=coupon_in.valid_from,
        valid_to=coupon_in.valid_to,
        max_uses=coupon_in.max_uses,
        is_active=coupon_in.is_active
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return ApiResponse(
        success=True,
        message="Coupon created successfully",
        data=CouponResponse.model_validate(c)
    )
