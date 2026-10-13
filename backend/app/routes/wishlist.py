from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.property import Property
from backend.app.models.wishlist import Wishlist
from backend.app.schemas.wishlist import WishlistToggleRequest, WishlistResponse
from backend.app.schemas.property import PropertyResponse
from backend.app.schemas.common import ApiResponse
from backend.app.auth.dependencies import require_customer
from backend.app.routes.properties import build_property_response

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])

@router.get("", response_model=ApiResponse[List[WishlistResponse]])
def get_my_wishlist(
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db)
):
    items = db.query(Wishlist).filter(Wishlist.customer_id == current_user.id).all()
    results = []
    for item in items:
        resp = WishlistResponse(
            id=item.id,
            property_id=item.property_id,
            created_at=item.created_at,
            property=build_property_response(item.property, current_user, db) if item.property else None
        )
        results.append(resp)

    return ApiResponse(success=True, data=results)

@router.post("/toggle", response_model=ApiResponse[dict])
def toggle_wishlist(
    req: WishlistToggleRequest,
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db)
):
    prop = db.query(Property).filter(Property.id == req.property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    existing = db.query(Wishlist).filter(
        Wishlist.customer_id == current_user.id,
        Wishlist.property_id == req.property_id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return ApiResponse(
            success=True,
            message="Removed from wishlist",
            data={"is_wishlisted": False, "property_id": req.property_id}
        )
    else:
        new_entry = Wishlist(customer_id=current_user.id, property_id=req.property_id)
        db.add(new_entry)
        db.commit()
        return ApiResponse(
            success=True,
            message="Added to wishlist",
            data={"is_wishlisted": True, "property_id": req.property_id}
        )
