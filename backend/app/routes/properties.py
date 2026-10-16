import re
import uuid
import shutil
from pathlib import Path
from urllib.parse import urlparse, parse_qs, unquote
from typing import List, Optional
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc, or_, and_

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.user import User, UserRole
from backend.app.models.host import Host, VerificationStatus
from backend.app.models.location import Location
from backend.app.models.property import (
    Property, PropertyImage, Amenity, PropertyAmenity, 
    Availability, PropertyType, ApprovalStatus, CancellationPolicyType
)
from backend.app.models.review import Review
from backend.app.models.wishlist import Wishlist
from backend.app.schemas.property import (
    PropertyCreate, PropertyUpdate, PropertyResponse, PropertyDetailResponse,
    AvailabilityCheckRequest, AvailabilityCheckResponse, AvailabilitySetRequest,
    AvailabilityResponse, AmenityResponse, PropertyImageResponse,
    PropertyImageCreate, PropertyImageUpdate, AvailabilityDetailResponse
)
from backend.app.schemas.common import ApiResponse
from backend.app.auth.dependencies import get_current_user, get_optional_user, require_host
from backend.app.services.availability_service import availability_service
from backend.app.routes.locations import OUTSIDE_GUJARAT_AREAS

router = APIRouter(prefix="/properties", tags=["Properties"])

def slugify(text: str) -> str:
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    return re.sub(r'[-\s]+', '-', text)

def validate_image_url(url: str) -> str:
    if not url or not isinstance(url, str):
        raise HTTPException(status_code=400, detail="Image URL cannot be empty")
    url = url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="Image URL cannot be empty")
    
    lower = url.lower()
    if lower.startswith(("javascript:", "data:", "file:", "vbscript:", "about:")):
        raise HTTPException(status_code=400, detail="Dangerous or unsupported URL protocol")
        
    if lower.startswith("/uploads/"):
        return url

    if not (lower.startswith("http://") or lower.startswith("https://")):
        raise HTTPException(status_code=400, detail="Image URL must start with http:// or https://")
        
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        raise HTTPException(status_code=400, detail="Malformed image URL")
        
    if "google.com/imgres" in lower:
        try:
            qs = parse_qs(parsed.query)
            if "imgurl" in qs and qs["imgurl"]:
                extracted = unquote(qs["imgurl"][0])
                if extracted.startswith(("http://", "https://")):
                    return extracted
        except Exception:
            pass
            
    return url

def sanitize_image_url(url: str) -> str:
    try:
        return validate_image_url(url)
    except HTTPException:
        return url

def verify_host_property_access(property_id: int, current_user: User, db: Session) -> Property:
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if current_user.role != UserRole.ADMIN:
        host = db.query(Host).filter(Host.user_id == current_user.id).first()
        if not host or prop.host_id != host.id:
            raise HTTPException(status_code=403, detail="Not authorized to modify images for this property")
            
    return prop

def build_property_response(
    prop: Property, 
    current_user: Optional[User] = None, 
    db: Optional[Session] = None,
    availability_info: Optional[dict] = None
) -> PropertyResponse:
    amenities = [pa.amenity for pa in prop.amenities if pa.amenity]
    amenities_data = [AmenityResponse.model_validate(a) for a in amenities]
    
    # Calculate average rating
    reviews = [r for r in prop.reviews if r.is_approved]
    avg_rating = round(sum([r.rating for r in reviews]) / len(reviews), 1) if reviews else 4.8
    reviews_count = len(reviews)

    # Check wishlist
    is_wishlisted = False
    if current_user and db:
        wl = db.query(Wishlist).filter(
            Wishlist.customer_id == current_user.id,
            Wishlist.property_id == prop.id
        ).first()
        is_wishlisted = wl is not None

    total_units_val = getattr(prop, "total_units", 1) or 1

    # Extract availability details
    if availability_info:
        avail_status = availability_info.get("availability_status", "select_dates")
        avail_units = availability_info.get("available_units")
        booked_units = availability_info.get("booked_units")
        blocked_units = availability_info.get("blocked_units")
        is_avail = availability_info.get("is_available")
        avail_msg = availability_info.get("message")
    else:
        if prop.verification_status != ApprovalStatus.APPROVED or not prop.booking_enabled:
            avail_status = "unavailable"
            is_avail = False
            avail_units = 0
            avail_msg = "Property is temporarily unavailable"
        else:
            avail_status = "select_dates"
            is_avail = None
            avail_units = total_units_val
            avail_msg = "Select dates to check availability"
        booked_units = 0
        blocked_units = 0

    prop_resp = PropertyResponse(
        id=prop.id,
        slug=prop.slug,
        host_id=prop.host_id,
        location_id=prop.location_id,
        name=prop.name,
        description=prop.description,
        property_type=prop.property_type,
        price_per_night=prop.price_per_night,
        cleaning_fee=prop.cleaning_fee,
        max_guests=prop.max_guests,
        bedrooms=prop.bedrooms,
        bathrooms=prop.bathrooms,
        total_units=total_units_val,
        address=prop.address,
        latitude=prop.latitude,
        longitude=prop.longitude,
        check_in_time=prop.check_in_time,
        check_out_time=prop.check_out_time,
        house_rules=prop.house_rules,
        cancellation_policy=prop.cancellation_policy,
        verification_status=prop.verification_status,
        booking_enabled=prop.booking_enabled,
        is_featured=prop.is_featured,
        source_reference=prop.source_reference,
        data_source=getattr(prop, "data_source", "Public Accommodation Directory"),
        source_url=getattr(prop, "source_url", None),
        verified_at=getattr(prop, "verified_at", "2026-09-30"),
        created_at=prop.created_at,
        updated_at=prop.updated_at,
        availability_status=avail_status,
        available_units=avail_units,
        booked_units=booked_units,
        blocked_units=blocked_units,
        is_available=is_avail,
        availability_message=avail_msg,
        location={
            "id": prop.location.id,
            "name": prop.location.name,
            "slug": prop.location.slug,
            "district": prop.location.district,
            "taluka": prop.location.taluka,
            "state": prop.location.state or "Gujarat",
            "country": prop.location.country or "India"
        } if prop.location else None,
        host={
            "id": prop.host.id,
            "user_id": prop.host.user_id,
            "business_name": prop.host.business_name,
            "host_type": prop.host.host_type.value,
            "phone": None, # Controlled Contact: Host phone is never exposed on public pages
            "verification_status": prop.host.verification_status.value
        } if prop.host else None,
        images=[PropertyImageResponse.model_validate(img) for img in prop.images],
        amenities_list=amenities_data,
        average_rating=avg_rating,
        reviews_count=reviews_count,
        is_wishlisted=is_wishlisted
    )
    return prop_resp

@router.get("", response_model=ApiResponse[List[PropertyResponse]])
def get_properties(
    location: Optional[str] = Query(None, description="Location slug or name in Gujarat"),
    destination: Optional[str] = Query(None, description="Alias for location"),
    check_in: Optional[date] = None,
    check_out: Optional[date] = None,
    guests: Optional[int] = None,
    quantity: Optional[int] = Query(1, ge=1),
    property_type: Optional[PropertyType] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    bedrooms: Optional[int] = None,
    pool: Optional[bool] = None,
    wifi: Optional[bool] = None,
    parking: Optional[bool] = None,
    pet_friendly: Optional[bool] = None,
    sort_by: Optional[str] = Query("recommended", description="recommended, price_asc, price_desc, rating, newest"),
    is_featured: Optional[bool] = None,
    include_unavailable: bool = Query(False, description="Include sold out or unavailable stays"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    # Validation if dates provided
    today = date.today()
    if check_in and check_in < today:
        raise HTTPException(status_code=400, detail="Check-in date cannot be in the past")
    if check_in and check_out and check_out <= check_in:
        raise HTTPException(status_code=400, detail="Check-out date must be strictly after check-in date")
    if guests is not None and guests <= 0:
        raise HTTPException(status_code=400, detail="Guest count must be positive")
    if quantity is not None and quantity <= 0:
        raise HTTPException(status_code=400, detail="Requested quantity must be positive")

    query = db.query(Property).filter(
        Property.verification_status == ApprovalStatus.APPROVED,
        Property.booking_enabled == True
    )

    loc_param = destination or location
    if loc_param and loc_param.lower() != "all":
        loc_term = loc_param.strip()
        clean_loc = loc_term.lower()

        # Strictly reject queries matching outside Gujarat cities or states
        if clean_loc in OUTSIDE_GUJARAT_AREAS:
            return ApiResponse(success=True, data=[], message="Only Gujarat locations are supported.")

        matching_loc_ids = [
            l.id for l in db.query(Location.id).filter(
                Location.country == "India",
                Location.state == "Gujarat",
                or_(
                    func.lower(Location.slug) == clean_loc,
                    func.lower(Location.name) == clean_loc,
                    func.lower(Location.name).like(f"%{clean_loc}%"),
                    func.lower(Location.district).like(f"%{clean_loc}%"),
                    func.lower(Location.taluka).like(f"%{clean_loc}%")
                )
            ).all()
        ]
        if matching_loc_ids:
            query = query.filter(
                Property.location.has(
                    and_(Location.country == "India", Location.state == "Gujarat")
                ),
                or_(
                    Property.location_id.in_(matching_loc_ids),
                    Property.address.ilike(f"%{loc_term}%"),
                    Property.name.ilike(f"%{loc_term}%")
                )
            )
        else:
            query = query.filter(
                Property.location.has(
                    and_(Location.country == "India", Location.state == "Gujarat")
                ),
                or_(
                    Property.address.ilike(f"%{loc_term}%"),
                    Property.name.ilike(f"%{loc_term}%")
                )
            )

    if property_type:
        query = query.filter(Property.property_type == property_type)

    if min_price is not None:
        query = query.filter(Property.price_per_night >= min_price)

    if max_price is not None:
        query = query.filter(Property.price_per_night <= max_price)

    if guests is not None:
        query = query.filter(Property.max_guests >= guests)

    if bedrooms is not None:
        query = query.filter(Property.bedrooms >= bedrooms)

    if is_featured is not None:
        query = query.filter(Property.is_featured == is_featured)

    # Amenity filters
    amenity_filters = []
    if pool:
        amenity_filters.append("pool")
    if wifi:
        amenity_filters.append("wi-fi")
    if parking:
        amenity_filters.append("parking")
    if pet_friendly:
        amenity_filters.append("pet")

    for am_keyword in amenity_filters:
        query = query.filter(
            Property.amenities.any(
                PropertyAmenity.amenity.has(
                    func.lower(Amenity.name).contains(am_keyword)
                )
            )
        )

    # Sorting
    if sort_by == "price_asc":
        query = query.order_by(asc(Property.price_per_night))
    elif sort_by == "price_desc":
        query = query.order_by(desc(Property.price_per_night))
    elif sort_by == "newest":
        query = query.order_by(desc(Property.created_at))
    else:
        query = query.order_by(desc(Property.is_featured), desc(Property.created_at))

    properties = query.all()
    
    results = []
    guest_val = guests if guests else 1
    qty_val = quantity if quantity else 1

    for p in properties:
        if check_in and check_out:
            avail_info = availability_service.calculate_property_availability(
                db=db,
                property_id=p.id,
                check_in=check_in,
                check_out=check_out,
                guest_count=guest_val,
                quantity=qty_val
            )
            if not include_unavailable and not avail_info["is_available"]:
                continue
            results.append(build_property_response(p, current_user, db, availability_info=avail_info))
        else:
            results.append(build_property_response(p, current_user, db))

    dest_str = f" in {loc_param}" if loc_param else ""
    dates_str = f" for {check_in.strftime('%d %b')} – {check_out.strftime('%d %b')}" if (check_in and check_out) else ""
    msg = f"{len(results)} stays available{dest_str}{dates_str}." if len(results) > 0 else "No stays are available for your selected dates."
    return ApiResponse(success=True, data=results, message=msg)

@router.get("/search", response_model=ApiResponse[List[PropertyResponse]])
def search_properties(
    destination: Optional[str] = Query(None, description="Gujarat destination, city, or district"),
    location: Optional[str] = Query(None, description="Alias for destination"),
    check_in: Optional[date] = None,
    check_out: Optional[date] = None,
    guests: int = Query(1, ge=1),
    quantity: int = Query(1, ge=1),
    property_type: Optional[PropertyType] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    pool: Optional[bool] = None,
    wifi: Optional[bool] = None,
    parking: Optional[bool] = None,
    pet_friendly: Optional[bool] = None,
    sort_by: Optional[str] = Query("recommended"),
    include_unavailable: bool = Query(False, description="Include sold out or blocked stays"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Search endpoint adhering to section 2 & 10 of Stay Availability specification.
    Returns matching properties and their computed availability for requested dates.
    """
    return get_properties(
        location=destination or location,
        destination=destination or location,
        check_in=check_in,
        check_out=check_out,
        guests=guests,
        quantity=quantity,
        property_type=property_type,
        min_price=min_price,
        max_price=max_price,
        bedrooms=None,
        pool=pool,
        wifi=wifi,
        parking=parking,
        pet_friendly=pet_friendly,
        sort_by=sort_by,
        is_featured=None,
        include_unavailable=include_unavailable,
        db=db,
        current_user=current_user
    )

@router.get("/amenities", response_model=ApiResponse[List[AmenityResponse]])
def get_amenities_list(db: Session = Depends(get_db)):
    amenities = db.query(Amenity).all()
    return ApiResponse(
        success=True,
        data=[AmenityResponse.model_validate(a) for a in amenities]
    )

@router.get("/{id_or_slug}/availability", response_model=ApiResponse[AvailabilityDetailResponse])
def get_property_availability(
    id_or_slug: str,
    check_in: Optional[date] = None,
    check_out: Optional[date] = None,
    guests: int = Query(1, ge=1),
    quantity: int = Query(1, ge=1),
    db: Session = Depends(get_db)
):
    """
    Endpoint GET /api/properties/{property_id}/availability
    Returns detailed availability, night-by-night breakdown, and pricing.
    """
    if id_or_slug.isdigit():
        prop = db.query(Property).filter(Property.id == int(id_or_slug)).first()
    else:
        prop = db.query(Property).filter(Property.slug == id_or_slug.lower()).first()

    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    res = availability_service.calculate_property_availability(
        db=db,
        property_id=prop.id,
        check_in=check_in,
        check_out=check_out,
        guest_count=guests,
        quantity=quantity
    )

    return ApiResponse(
        success=True,
        data=AvailabilityDetailResponse(
            is_available=res["is_available"],
            property_id=prop.id,
            property_name=prop.name,
            check_in=check_in,
            check_out=check_out,
            guests=guests,
            quantity=quantity,
            total_units=res["total_units"],
            available_units=res["available_units"],
            booked_units=res["booked_units"],
            blocked_units=res["blocked_units"],
            availability_status=res["availability_status"],
            requested_dates=res["requested_dates"],
            night_breakdown=res["night_breakdown"],
            stay_price=res["stay_price"],
            cleaning_fee=res["cleaning_fee"],
            tax=res["tax"],
            total_price=res["total_price"],
            message=res["message"],
            alternative_dates=res.get("alternative_dates", []),
            alternative_properties=res.get("alternative_properties", [])
        )
    )

@router.get("/{id_or_slug}", response_model=ApiResponse[PropertyDetailResponse])
def get_property_detail(
    id_or_slug: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    if id_or_slug.isdigit():
        prop = db.query(Property).filter(Property.id == int(id_or_slug)).first()
    else:
        prop = db.query(Property).filter(Property.slug == id_or_slug.lower()).first()

    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    base_resp = build_property_response(prop, current_user, db)

    # Recent reviews
    reviews = db.query(Review).filter(
        Review.property_id == prop.id,
        Review.is_approved == True
    ).order_by(desc(Review.created_at)).limit(10).all()

    reviews_data = []
    for r in reviews:
        reviews_data.append({
            "id": r.id,
            "rating": r.rating,
            "title": r.title,
            "comment": r.comment,
            "created_at": r.created_at.isoformat(),
            "customer_name": r.customer.full_name if r.customer else "Guest"
        })

    # Upcoming 30 days availability from SQLite
    today = date.today()
    availabilities = db.query(Availability).filter(
        Availability.property_id == prop.id,
        Availability.date >= today,
        Availability.date <= today + timedelta(days=60)
    ).order_by(asc(Availability.date)).all()

    avail_data = [AvailabilityResponse.model_validate(a) for a in availabilities]

    detail_resp = PropertyDetailResponse(
        **base_resp.model_dump(),
        recent_reviews=reviews_data,
        upcoming_availabilities=avail_data
    )

    return ApiResponse(success=True, data=detail_resp)

@router.post("/check-availability", response_model=ApiResponse[AvailabilityCheckResponse])
def check_availability(
    req: AvailabilityCheckRequest,
    db: Session = Depends(get_db)
):
    qty = getattr(req, "quantity", 1) or 1
    res = availability_service.calculate_property_availability(
        db=db,
        property_id=req.property_id,
        check_in=req.check_in,
        check_out=req.check_out,
        guest_count=req.guests,
        quantity=qty
    )

    prop = db.query(Property).filter(Property.id == req.property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    nights_count = len(res["requested_dates"]) if res["requested_dates"] else max(1, (req.check_out - req.check_in).days)

    return ApiResponse(
        success=True,
        data=AvailabilityCheckResponse(
            available=res["is_available"],
            property_id=req.property_id,
            check_in=req.check_in,
            check_out=req.check_out,
            nights=nights_count,
            price_per_night=prop.price_per_night,
            base_price=res["stay_price"],
            cleaning_fee=res["cleaning_fee"],
            tax=res["tax"],
            total_price=res["total_price"],
            message=res["message"],
            availability_status=res["availability_status"],
            available_units=res["available_units"],
            total_units=res["total_units"]
        )
    )

@router.post("", response_model=ApiResponse[PropertyResponse])
def create_property(
    prop_in: PropertyCreate,
    current_user: User = Depends(require_host),
    db: Session = Depends(get_db)
):
    host = db.query(Host).filter(Host.user_id == current_user.id).first()
    if not host and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Host profile not initialized")

    host_id = host.id if host else 1

    # Generate unique slug
    base_slug = slugify(prop_in.name)
    slug = base_slug
    idx = 1
    while db.query(Property).filter(Property.slug == slug).first():
        slug = f"{base_slug}-{idx}"
        idx += 1

    # Strict Gujarat location verification
    loc_id = prop_in.location_id
    if not loc_id and prop_in.city:
        matched_loc = db.query(Location).filter(
            Location.country == "India",
            Location.state == "Gujarat",
            or_(
                func.lower(Location.name) == prop_in.city.strip().lower(),
                func.lower(Location.slug) == prop_in.city.strip().lower()
            )
        ).first()
        if matched_loc:
            loc_id = matched_loc.id

    if not loc_id:
        raise HTTPException(
            status_code=400,
            detail="A valid Gujarat, India location is required"
        )

    loc = db.query(Location).filter(
        Location.id == loc_id,
        Location.country == "India",
        Location.state == "Gujarat"
    ).first()

    if not loc:
        raise HTTPException(
            status_code=400,
            detail="Selected location is not in Gujarat, India. Only Gujarat properties are allowed."
        )

    prop = Property(
        host_id=host_id,
        location_id=loc_id,
        name=prop_in.name.strip(),
        slug=slug,
        description=prop_in.description,
        property_type=prop_in.property_type,
        price_per_night=prop_in.price_per_night,
        cleaning_fee=prop_in.cleaning_fee,
        max_guests=prop_in.max_guests,
        bedrooms=prop_in.bedrooms,
        bathrooms=prop_in.bathrooms,
        address=prop_in.address,
        latitude=prop_in.latitude,
        longitude=prop_in.longitude,
        check_in_time=prop_in.check_in_time,
        check_out_time=prop_in.check_out_time,
        house_rules=prop_in.house_rules,
        cancellation_policy=prop_in.cancellation_policy,
        verification_status=ApprovalStatus.PENDING,  # Must be approved by Admin
        booking_enabled=True,
        is_featured=False,
        source_reference=f"Submitted by {host.business_name if host else 'Host'}"
    )
    db.add(prop)
    db.flush()

    # Add images
    has_cover = any(img.is_cover or img.is_primary for img in prop_in.images)
    for idx, img_in in enumerate(prop_in.images):
        clean_url = validate_image_url(img_in.image_url)
        is_cov = (img_in.is_cover or img_in.is_primary) if has_cover else (idx == 0)
        p_img = PropertyImage(
            property_id=prop.id,
            image_url=clean_url,
            caption=img_in.caption,
            is_cover=is_cov,
            is_primary=is_cov,
            sort_order=img_in.sort_order if img_in.sort_order else idx
        )
        db.add(p_img)

    # Add amenities
    for am_id in prop_in.amenity_ids:
        pa = PropertyAmenity(property_id=prop.id, amenity_id=am_id)
        db.add(pa)

    db.commit()
    db.refresh(prop)
    return ApiResponse(
        success=True,
        message="Property submitted successfully. It will be publicly bookable once approved by an administrator.",
        data=build_property_response(prop, current_user, db)
    )

@router.post("/{id}/availability", response_model=ApiResponse[str])
def set_property_availability(
    id: int,
    avail_req: AvailabilitySetRequest,
    current_user: User = Depends(require_host),
    db: Session = Depends(get_db)
):
    prop = db.query(Property).filter(Property.id == id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    host = db.query(Host).filter(Host.user_id == current_user.id).first()
    if current_user.role != UserRole.ADMIN and (not host or prop.host_id != host.id):
        raise HTTPException(status_code=403, detail="Not authorized to edit this property")

    curr = avail_req.start_date
    while curr <= avail_req.end_date:
        existing = db.query(Availability).filter(
            Availability.property_id == prop.id,
            Availability.date == curr
        ).first()

        effective_price = avail_req.price if avail_req.price is not None else prop.price_per_night

        if existing:
            existing.available = avail_req.available
            if avail_req.price is not None:
                existing.price = effective_price
        else:
            new_avail = Availability(
                property_id=prop.id,
                date=curr,
                price=effective_price,
                available=avail_req.available
            )
            db.add(new_avail)
        curr += timedelta(days=1)

    db.commit()
    return ApiResponse(success=True, message="Availability dates updated successfully")

@router.post("/upload-image", response_model=ApiResponse[dict])
async def upload_property_image(
    file: UploadFile = File(...),
    current_user: User = Depends(require_host),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files (JPEG, PNG, WebP) are allowed")
    
    ext = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else "jpg"
    if ext not in ["jpg", "jpeg", "png", "webp", "gif"]:
        ext = "jpg"
    filename = f"prop_{uuid.uuid4().hex[:12]}.{ext}"
    
    dest_path = Path(settings.UPLOAD_PATH) / filename
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    image_url = f"/uploads/{filename}"
    return ApiResponse(success=True, message="Image uploaded successfully", data={"image_url": image_url})

@router.post("/{property_id}/images", response_model=ApiResponse[PropertyImageResponse])
def add_property_image(
    property_id: int,
    image_in: PropertyImageCreate,
    current_user: User = Depends(require_host),
    db: Session = Depends(get_db)
):
    prop = verify_host_property_access(property_id, current_user, db)
    clean_url = validate_image_url(image_in.image_url)

    existing_images = db.query(PropertyImage).filter(PropertyImage.property_id == property_id).all()
    
    is_cover_requested = image_in.is_cover or image_in.is_primary
    if is_cover_requested:
        for img in existing_images:
            img.is_cover = False
            img.is_primary = False
        is_cover_val = True
    else:
        is_cover_val = len(existing_images) == 0

    sort_order_val = image_in.sort_order if image_in.sort_order > 0 else (max([img.sort_order for img in existing_images], default=-1) + 1)

    new_img = PropertyImage(
        property_id=prop.id,
        image_url=clean_url,
        caption=image_in.caption,
        is_cover=is_cover_val,
        is_primary=is_cover_val,
        sort_order=sort_order_val
    )
    db.add(new_img)
    db.commit()
    db.refresh(new_img)

    return ApiResponse(
        success=True,
        message="Property image added successfully",
        data=PropertyImageResponse.model_validate(new_img)
    )

@router.delete("/{property_id}/images/{image_id}", response_model=ApiResponse[str])
def delete_property_image(
    property_id: int,
    image_id: int,
    current_user: User = Depends(require_host),
    db: Session = Depends(get_db)
):
    verify_host_property_access(property_id, current_user, db)
    img = db.query(PropertyImage).filter(
        PropertyImage.id == image_id,
        PropertyImage.property_id == property_id
    ).first()
    
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
        
    was_cover = img.is_cover or img.is_primary
    db.delete(img)
    db.flush()
    
    if was_cover:
        remaining = db.query(PropertyImage).filter(
            PropertyImage.property_id == property_id
        ).order_by(PropertyImage.sort_order.asc(), PropertyImage.id.asc()).first()
        if remaining:
            remaining.is_cover = True
            remaining.is_primary = True
            
    db.commit()
    return ApiResponse(success=True, message="Property image deleted successfully")

@router.patch("/{property_id}/images/{image_id}", response_model=ApiResponse[PropertyImageResponse])
def update_property_image(
    property_id: int,
    image_id: int,
    image_update: PropertyImageUpdate,
    current_user: User = Depends(require_host),
    db: Session = Depends(get_db)
):
    verify_host_property_access(property_id, current_user, db)
    img = db.query(PropertyImage).filter(
        PropertyImage.id == image_id,
        PropertyImage.property_id == property_id
    ).first()
    
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
        
    if image_update.is_cover is True or image_update.is_primary is True:
        all_imgs = db.query(PropertyImage).filter(PropertyImage.property_id == property_id).all()
        for other in all_imgs:
            other.is_cover = False
            other.is_primary = False
        img.is_cover = True
        img.is_primary = True
    elif image_update.is_cover is False or image_update.is_primary is False:
        img.is_cover = False
        img.is_primary = False

    if image_update.sort_order is not None:
        img.sort_order = image_update.sort_order

    if image_update.caption is not None:
        img.caption = image_update.caption

    if image_update.image_url:
        img.image_url = validate_image_url(image_update.image_url)

    db.commit()
    db.refresh(img)
    return ApiResponse(
        success=True,
        message="Property image updated successfully",
        data=PropertyImageResponse.model_validate(img)
    )

@router.put("/{id}", response_model=ApiResponse[PropertyResponse])
def update_property(
    id: int,
    prop_in: PropertyUpdate,
    current_user: User = Depends(require_host),
    db: Session = Depends(get_db)
):
    prop = verify_host_property_access(id, current_user, db)
    
    update_data = prop_in.model_dump(exclude_unset=True)

    if "location_id" in update_data and update_data["location_id"] is not None:
        loc = db.query(Location).filter(
            Location.id == update_data["location_id"],
            Location.country == "India",
            Location.state == "Gujarat"
        ).first()
        if not loc:
            raise HTTPException(
                status_code=400,
                detail="Selected location is not in Gujarat, India. Only Gujarat properties are allowed."
            )
    
    if "amenity_ids" in update_data and update_data["amenity_ids"] is not None:
        db.query(PropertyAmenity).filter(PropertyAmenity.property_id == prop.id).delete()
        for am_id in update_data["amenity_ids"]:
            db.add(PropertyAmenity(property_id=prop.id, amenity_id=am_id))
        del update_data["amenity_ids"]

    if "images" in update_data and update_data["images"] is not None:
        if len(update_data["images"]) > 0:
            db.query(PropertyImage).filter(PropertyImage.property_id == prop.id).delete()
            has_cover = any(img.is_cover or img.is_primary for img in prop_in.images)
            for idx, img_in in enumerate(prop_in.images):
                is_cov = (img_in.is_cover or img_in.is_primary) if has_cover else (idx == 0)
                clean_url = validate_image_url(img_in.image_url)
                p_img = PropertyImage(
                    property_id=prop.id,
                    image_url=clean_url,
                    caption=img_in.caption,
                    is_cover=is_cov,
                    is_primary=is_cov,
                    sort_order=img_in.sort_order if img_in.sort_order else idx
                )
                db.add(p_img)
        del update_data["images"]

    for field, val in update_data.items():
        if hasattr(prop, field) and val is not None:
            setattr(prop, field, val)
            
    db.commit()
    db.refresh(prop)
    return ApiResponse(
        success=True,
        message="Property updated successfully",
        data=build_property_response(prop, current_user, db)
    )

