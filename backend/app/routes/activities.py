import re
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from backend.app.database import get_db
from backend.app.models.user import User, UserRole
from backend.app.models.host import Host
from backend.app.models.location import Location
from backend.app.models.activity import (
    Activity, ActivitySlot, ActivityCategory, SlotStatus
)
from backend.app.models.property import ApprovalStatus
from backend.app.schemas.activity import (
    ActivityCreate, ActivityUpdate, ActivityResponse, ActivityDetailResponse,
    ActivitySlotCreate, ActivitySlotResponse
)
from backend.app.schemas.common import ApiResponse
from backend.app.auth.dependencies import require_host, get_optional_user

router = APIRouter(prefix="/activities", tags=["Activities"])

def slugify(text: str) -> str:
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    return re.sub(r'[-\s]+', '-', text)

def build_activity_response(act: Activity) -> ActivityResponse:
    reviews = [r for r in act.reviews if r.is_approved]
    avg_rating = round(sum([r.rating for r in reviews]) / len(reviews), 1) if reviews else 4.9
    
    return ActivityResponse(
        id=act.id,
        name=act.name,
        slug=act.slug,
        description=act.description,
        category=act.category,
        price=act.price,
        duration=act.duration,
        capacity=act.capacity,
        age_limit=act.age_limit,
        difficulty=act.difficulty,
        included_items=act.included_items,
        excluded_items=act.excluded_items,
        cancellation_policy=act.cancellation_policy,
        image_url=act.image_url,
        host_id=act.host_id,
        location_id=act.location_id,
        property_id=act.property_id,
        verification_status=act.verification_status,
        is_featured=act.is_featured,
        created_at=act.created_at,
        updated_at=act.updated_at,
        location={"id": act.location.id, "name": act.location.name, "slug": act.location.slug} if act.location else None,
        slots_count=len([s for s in act.slots if s.status == SlotStatus.ACTIVE and s.remaining_capacity > 0]),
        average_rating=avg_rating,
        reviews_count=len(reviews)
    )

@router.get("", response_model=ApiResponse[List[ActivityResponse]])
def get_activities(
    location: Optional[str] = None,
    category: Optional[ActivityCategory] = None,
    property_id: Optional[int] = None,
    is_featured: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Activity).filter(
        Activity.verification_status == ApprovalStatus.APPROVED
    )

    if location and location.lower() != "all":
        loc = db.query(Location).filter(
            or_(Location.slug == location.lower(), Location.name.ilike(f"%{location}%"))
        ).first()
        if loc:
            query = query.filter(Activity.location_id == loc.id)

    if category:
        query = query.filter(Activity.category == category)

    if property_id:
        query = query.filter(Activity.property_id == property_id)

    if is_featured is not None:
        query = query.filter(Activity.is_featured == is_featured)

    activities = query.order_by(desc(Activity.is_featured), desc(Activity.created_at)).all()
    return ApiResponse(
        success=True,
        data=[build_activity_response(a) for a in activities]
    )

@router.get("/{id_or_slug}", response_model=ApiResponse[ActivityDetailResponse])
def get_activity_detail(id_or_slug: str, db: Session = Depends(get_db)):
    if id_or_slug.isdigit():
        act = db.query(Activity).filter(Activity.id == int(id_or_slug)).first()
    else:
        act = db.query(Activity).filter(Activity.slug == id_or_slug.lower()).first()

    if not act:
        raise HTTPException(status_code=404, detail="Activity not found")

    base = build_activity_response(act)
    
    # Upcoming slots (active, future or today)
    today = date.today()
    slots = db.query(ActivitySlot).filter(
        ActivitySlot.activity_id == act.id,
        ActivitySlot.date >= today,
        ActivitySlot.remaining_capacity > 0,
        ActivitySlot.status == SlotStatus.ACTIVE
    ).order_by(asc(ActivitySlot.date), asc(ActivitySlot.start_time)).all()

    slots_data = [ActivitySlotResponse.model_validate(s) for s in slots]

    reviews_data = []
    for r in [r for r in act.reviews if r.is_approved][:10]:
        reviews_data.append({
            "id": r.id,
            "rating": r.rating,
            "title": r.title,
            "comment": r.comment,
            "created_at": r.created_at.isoformat(),
            "customer_name": r.customer.full_name if r.customer else "Guest"
        })

    detail_resp = ActivityDetailResponse(
        **base.model_dump(),
        slots=slots_data,
        recent_reviews=reviews_data
    )
    return ApiResponse(success=True, data=detail_resp)

@router.post("", response_model=ApiResponse[ActivityResponse])
def create_activity(
    act_in: ActivityCreate,
    current_user: User = Depends(require_host),
    db: Session = Depends(get_db)
):
    host = db.query(Host).filter(Host.user_id == current_user.id).first()
    if not host and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Host profile not initialized")

    host_id = host.id if host else 1

    base_slug = slugify(act_in.name)
    slug = base_slug
    idx = 1
    while db.query(Activity).filter(Activity.slug == slug).first():
        slug = f"{base_slug}-{idx}"
        idx += 1

    act = Activity(
        host_id=host_id,
        location_id=act_in.location_id,
        property_id=act_in.property_id,
        name=act_in.name.strip(),
        slug=slug,
        description=act_in.description,
        category=act_in.category,
        price=act_in.price,
        duration=act_in.duration,
        capacity=act_in.capacity,
        age_limit=act_in.age_limit,
        difficulty=act_in.difficulty,
        included_items=act_in.included_items,
        excluded_items=act_in.excluded_items,
        cancellation_policy=act_in.cancellation_policy,
        image_url=act_in.image_url,
        verification_status=ApprovalStatus.PENDING,
        is_featured=False
    )
    db.add(act)
    db.flush()

    # Add slots
    for slot_in in act_in.slots:
        slot = ActivitySlot(
            activity_id=act.id,
            date=slot_in.date,
            start_time=slot_in.start_time,
            end_time=slot_in.end_time,
            capacity=slot_in.capacity,
            remaining_capacity=slot_in.capacity,
            price=slot_in.price,
            status=SlotStatus.ACTIVE
        )
        db.add(slot)

    db.commit()
    db.refresh(act)
    return ApiResponse(
        success=True,
        message="Activity submitted successfully. Awaiting admin approval.",
        data=build_activity_response(act)
    )

@router.post("/{id}/slots", response_model=ApiResponse[ActivitySlotResponse])
def add_activity_slot(
    id: int,
    slot_in: ActivitySlotCreate,
    current_user: User = Depends(require_host),
    db: Session = Depends(get_db)
):
    act = db.query(Activity).filter(Activity.id == id).first()
    if not act:
        raise HTTPException(status_code=404, detail="Activity not found")

    host = db.query(Host).filter(Host.user_id == current_user.id).first()
    if current_user.role != UserRole.ADMIN and (not host or act.host_id != host.id):
        raise HTTPException(status_code=403, detail="Not authorized to edit this activity")

    slot = ActivitySlot(
        activity_id=act.id,
        date=slot_in.date,
        start_time=slot_in.start_time,
        end_time=slot_in.end_time,
        capacity=slot_in.capacity,
        remaining_capacity=slot_in.capacity,
        price=slot_in.price,
        status=SlotStatus.ACTIVE
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return ApiResponse(
        success=True,
        message="Activity slot created",
        data=ActivitySlotResponse.model_validate(slot)
    )
