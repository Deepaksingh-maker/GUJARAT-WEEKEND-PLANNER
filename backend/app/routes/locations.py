from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, case

from backend.app.database import get_db
from backend.app.models.location import Location
from backend.app.models.property import Property, ApprovalStatus
from backend.app.models.activity import Activity
from backend.app.schemas.location import (
    LocationCreate, LocationUpdate, LocationResponse, LocationSearchResult
)
from backend.app.schemas.common import ApiResponse
from backend.app.auth.dependencies import require_admin

router = APIRouter(prefix="/locations", tags=["Locations"])

# Reject known non-Gujarat cities/states even if substring matches a Gujarat location (e.g. Udaipur vs Chhota Udaipur)
OUTSIDE_GUJARAT_AREAS = {
    "mumbai", "pune", "nashik", "nagpur", "thane", "jaipur", "udaipur", 
    "jodhpur", "delhi", "new delhi", "bangalore", "bengaluru", "indore", 
    "bhopal", "goa", "hyderabad", "kolkata", "chennai", "lucknow", 
    "kanpur", "agra", "varanasi", "chandigarh", "amritsar", "shimla",
    "gurgaon", "noida", "faridabad", "ghaziabad", "patna", "ranchi", 
    "kochi", "coimbatore", "mysore", "madurai", "visakhapatnam", 
    "vijayawada", "maharashtra", "rajasthan", "madhya pradesh", 
    "karnataka", "telangana", "west bengal", "tamil nadu", 
    "uttar pradesh", "punjab", "haryana", "kerala", "bihar"
}

@router.get("/search", response_model=ApiResponse[List[LocationSearchResult]])
def search_locations(
    q: Optional[str] = Query(None, description="Search term for Gujarat locations"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    query_str = (q or "").strip()
    if not query_str:
        return ApiResponse(success=True, message="No Gujarat locations found", data=[])

    clean_q = query_str.lower()

    if clean_q in OUTSIDE_GUJARAT_AREAS:
        return ApiResponse(success=True, message="No Gujarat locations found", data=[])

    exact_pattern = clean_q
    starts_pattern = f"{clean_q}%"
    contains_pattern = f"%{clean_q}%"

    # Search relevance order:
    # 1. Exact match on name
    # 2. Starts with query on name
    # 3. Exact match on district or taluka
    # 4. Starts with query on district or taluka
    # 5. Contains query on name
    # 6. Contains query on district, taluka, or slug
    relevance_order = case(
        (func.lower(Location.name) == exact_pattern, 1),
        (func.lower(Location.name).like(starts_pattern), 2),
        (func.lower(Location.district) == exact_pattern, 3),
        (func.lower(Location.taluka) == exact_pattern, 4),
        (func.lower(Location.district).like(starts_pattern), 5),
        (func.lower(Location.taluka).like(starts_pattern), 6),
        (func.lower(Location.name).like(contains_pattern), 7),
        (func.lower(Location.district).like(contains_pattern), 8),
        (func.lower(Location.taluka).like(contains_pattern), 9),
        else_=10
    )

    # SQLite query strictly filtered to country = 'India' AND state = 'Gujarat'
    locations = (
        db.query(Location)
        .filter(
            Location.country == "India",
            Location.state == "Gujarat",
            or_(
                func.lower(Location.name).like(contains_pattern),
                func.lower(Location.district).like(contains_pattern),
                func.lower(Location.taluka).like(contains_pattern),
                func.lower(Location.slug).like(contains_pattern),
            )
        )
        .order_by(
            relevance_order.asc(),
            Location.is_popular.desc(),
            func.length(Location.name).asc(),
            Location.name.asc()
        )
        .limit(limit)
        .all()
    )

    results = []
    for loc in locations:
        subtitle_parts = []
        if loc.taluka and loc.taluka.lower() != loc.name.lower() and loc.taluka.lower() != (loc.district or "").lower():
            subtitle_parts.append(loc.taluka)
        if loc.district and loc.district.lower() != loc.name.lower():
            subtitle_parts.append(loc.district)
        subtitle_parts.append("Gujarat")
        subtitle = ", ".join(subtitle_parts)

        prop_count = db.query(Property).filter(
            Property.location_id == loc.id,
            Property.verification_status == ApprovalStatus.APPROVED,
            Property.booking_enabled == True
        ).count()

        results.append(
            LocationSearchResult(
                id=loc.id,
                name=loc.name,
                slug=loc.slug,
                type=loc.type or "city",
                taluka=loc.taluka,
                district=loc.district,
                state=loc.state or "Gujarat",
                country=loc.country or "India",
                image_url=loc.image_url,
                landmark_name=getattr(loc, "landmark_name", None),
                latitude=loc.latitude,
                longitude=loc.longitude,
                display_name=f"{loc.name}, {subtitle}",
                subtitle=subtitle,
                properties_count=prop_count
            )
        )

    msg = f"Found {len(results)} Gujarat locations" if results else "No Gujarat locations found"
    return ApiResponse(success=True, message=msg, data=results)

@router.get("", response_model=ApiResponse[List[LocationResponse]])
def get_locations(db: Session = Depends(get_db)):
    locations = (
        db.query(Location)
        .filter(
            Location.country == "India",
            Location.state == "Gujarat"
        )
        .order_by(Location.is_popular.desc(), Location.name.asc())
        .all()
    )
    results = []
    for loc in locations:
        prop_count = db.query(Property).filter(
            Property.location_id == loc.id,
            Property.verification_status == ApprovalStatus.APPROVED,
            Property.booking_enabled == True
        ).count()
        act_count = db.query(Activity).filter(
            Activity.location_id == loc.id,
            Activity.verification_status == ApprovalStatus.APPROVED
        ).count()
        
        subtitle_parts = []
        if loc.taluka and loc.taluka.lower() != loc.name.lower() and loc.taluka.lower() != (loc.district or "").lower():
            subtitle_parts.append(loc.taluka)
        if loc.district and loc.district.lower() != loc.name.lower():
            subtitle_parts.append(loc.district)
        subtitle_parts.append("Gujarat")

        loc_resp = LocationResponse.model_validate(loc)
        loc_resp.display_name = f"{loc.name}, {', '.join(subtitle_parts)}"
        loc_resp.properties_count = prop_count
        loc_resp.activities_count = act_count
        results.append(loc_resp)
        
    return ApiResponse(success=True, data=results)

@router.get("/{slug_or_id}", response_model=ApiResponse[LocationResponse])
def get_location(slug_or_id: str, db: Session = Depends(get_db)):
    base_query = db.query(Location).filter(
        Location.country == "India",
        Location.state == "Gujarat"
    )
    if slug_or_id.isdigit():
        loc = base_query.filter(Location.id == int(slug_or_id)).first()
    else:
        loc = base_query.filter(Location.slug == slug_or_id.lower()).first()

    if not loc:
        raise HTTPException(status_code=404, detail="Gujarat location not found")

    prop_count = db.query(Property).filter(
        Property.location_id == loc.id,
        Property.verification_status == ApprovalStatus.APPROVED,
        Property.booking_enabled == True
    ).count()
    act_count = db.query(Activity).filter(
        Activity.location_id == loc.id,
        Activity.verification_status == ApprovalStatus.APPROVED
    ).count()

    subtitle_parts = []
    if loc.taluka and loc.taluka.lower() != loc.name.lower() and loc.taluka.lower() != (loc.district or "").lower():
        subtitle_parts.append(loc.taluka)
    if loc.district and loc.district.lower() != loc.name.lower():
        subtitle_parts.append(loc.district)
    subtitle_parts.append("Gujarat")

    loc_resp = LocationResponse.model_validate(loc)
    loc_resp.display_name = f"{loc.name}, {', '.join(subtitle_parts)}"
    loc_resp.properties_count = prop_count
    loc_resp.activities_count = act_count
    return ApiResponse(success=True, data=loc_resp)

@router.post("", response_model=ApiResponse[LocationResponse])
def create_location(
    loc_in: LocationCreate,
    db: Session = Depends(get_db),
    admin_user = Depends(require_admin)
):
    # Enforce Gujarat, India only
    if loc_in.state and loc_in.state.strip().lower() != "gujarat":
        raise HTTPException(status_code=400, detail="Only locations in Gujarat, India are permitted.")
    if loc_in.country and loc_in.country.strip().lower() not in ["india", "in"]:
        raise HTTPException(status_code=400, detail="Only locations in Gujarat, India are permitted.")

    existing = db.query(Location).filter(
        (Location.name == loc_in.name) | (Location.slug == loc_in.slug)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Location with this name or slug already exists")

    loc_data = loc_in.model_dump()
    loc_data["state"] = "Gujarat"
    loc_data["country"] = "India"
    loc = Location(**loc_data)
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return ApiResponse(
        success=True,
        message="Location created successfully",
        data=LocationResponse.model_validate(loc)
    )

@router.put("/{id}", response_model=ApiResponse[LocationResponse])
def update_location(
    id: int,
    loc_update: LocationUpdate,
    db: Session = Depends(get_db),
    admin_user = Depends(require_admin)
):
    loc = db.query(Location).filter(
        Location.id == id,
        Location.country == "India",
        Location.state == "Gujarat"
    ).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    update_dict = loc_update.model_dump(exclude_unset=True)
    if "state" in update_dict and update_dict["state"] and update_dict["state"].strip().lower() != "gujarat":
        raise HTTPException(status_code=400, detail="Only locations in Gujarat, India are permitted.")
    if "country" in update_dict and update_dict["country"] and update_dict["country"].strip().lower() not in ["india", "in"]:
        raise HTTPException(status_code=400, detail="Only locations in Gujarat, India are permitted.")

    for field, val in update_dict.items():
        setattr(loc, field, val)

    loc.state = "Gujarat"
    loc.country = "India"
    db.commit()
    db.refresh(loc)
    return ApiResponse(
        success=True,
        message="Location updated successfully",
        data=LocationResponse.model_validate(loc)
    )
