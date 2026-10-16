from datetime import datetime, date, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from backend.app.database import get_db
from backend.app.models.user import User, UserRole
from backend.app.models.host import Host, VerificationStatus
from backend.app.models.property import Property, ApprovalStatus, Availability, InventoryBlock
from backend.app.models.activity import Activity
from backend.app.models.booking import Booking, BookingStatus, PaymentStatus
from backend.app.models.review import Review
from backend.app.schemas.common import ApiResponse
from backend.app.schemas.property import (
    PropertyResponse, HostCalendarResponse, HostCalendarProperty,
    HostCalendarDayStatus, InventoryBlockCreate, InventoryBlockResponse
)
from backend.app.schemas.activity import ActivityResponse
from backend.app.schemas.booking import BookingResponse
from backend.app.auth.dependencies import require_host
from backend.app.routes.properties import build_property_response
from backend.app.routes.activities import build_activity_response
from backend.app.routes.bookings import build_booking_response

router = APIRouter(prefix="/host", tags=["Host Dashboard"])

@router.get("/dashboard")
def get_host_dashboard_stats(
    current_user: User = Depends(require_host),
    db: Session = Depends(get_db)
):
    host = db.query(Host).filter(Host.user_id == current_user.id).first()
    if not host and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Host profile not found")

    host_id = host.id if host else 1

    properties = db.query(Property).filter(Property.host_id == host_id).all()
    property_ids = [p.id for p in properties]

    total_properties = len(properties)
    active_properties = len([p for p in properties if p.verification_status == ApprovalStatus.APPROVED and p.booking_enabled])
    
    activities = db.query(Activity).filter(Activity.host_id == host_id).all()
    total_activities = len(activities)

    # Bookings for host properties
    bookings = db.query(Booking).filter(
        Booking.property_id.in_(property_ids)
    ).all() if property_ids else []

    total_bookings = len(bookings)
    
    # Revenue: sum of totals for confirmed or completed bookings
    confirmed_bookings = [b for b in bookings if b.status in [BookingStatus.CONFIRMED, BookingStatus.COMPLETED]]
    revenue = sum([b.total for b in confirmed_bookings])
    
    today = date.today()
    upcoming_bookings = [
        b for b in confirmed_bookings if b.check_in and b.check_in >= today
    ]

    # Host rating from property reviews
    reviews = db.query(Review).filter(
        Review.property_id.in_(property_ids),
        Review.is_approved == True
    ).all() if property_ids else []

    avg_rating = round(sum([r.rating for r in reviews]) / len(reviews), 1) if reviews else 5.0

    return ApiResponse(
        success=True,
        data={
            "host_profile": {
                "id": host.id if host else 1,
                "business_name": host.business_name if host else "Administrator",
                "host_type": host.host_type.value if host else "villa_owner",
                "verification_status": host.verification_status.value if host else "verified",
                "verification_notes": host.verification_notes if host else None
            },
            "total_bookings": total_bookings,
            "upcoming_bookings": len(upcoming_bookings),
            "revenue": round(revenue, 2),
            "total_revenue": round(revenue, 2),
            "gross_revenue": round(revenue, 2),
            "total_properties": total_properties,
            "active_properties": active_properties,
            "total_activities": total_activities,
            "average_rating": avg_rating,
            "reviews_count": len(reviews)
        }
    )

@router.get("/properties", response_model=ApiResponse[List[PropertyResponse]])
def get_host_properties(
    current_user: User = Depends(require_host),
    db: Session = Depends(get_db)
):
    host = db.query(Host).filter(Host.user_id == current_user.id).first()
    host_id = host.id if host else 1

    properties = db.query(Property).filter(Property.host_id == host_id).order_by(desc(Property.created_at)).all()
    return ApiResponse(
        success=True,
        data=[build_property_response(p, current_user, db) for p in properties]
    )

@router.get("/activities", response_model=ApiResponse[List[ActivityResponse]])
def get_host_activities(
    current_user: User = Depends(require_host),
    db: Session = Depends(get_db)
):
    host = db.query(Host).filter(Host.user_id == current_user.id).first()
    host_id = host.id if host else 1

    activities = db.query(Activity).filter(Activity.host_id == host_id).order_by(desc(Activity.created_at)).all()
    return ApiResponse(
        success=True,
        data=[build_activity_response(a) for a in activities]
    )

@router.get("/bookings", response_model=ApiResponse[List[BookingResponse]])
def get_host_bookings(
    current_user: User = Depends(require_host),
    db: Session = Depends(get_db)
):
    host = db.query(Host).filter(Host.user_id == current_user.id).first()
    host_id = host.id if host else 1

    properties = db.query(Property).filter(Property.host_id == host_id).all()
    prop_ids = [p.id for p in properties]

    if not prop_ids:
        return ApiResponse(success=True, data=[])

    bookings = db.query(Booking).filter(
        Booking.property_id.in_(prop_ids)
    ).order_by(desc(Booking.created_at)).all()

    return ApiResponse(
        success=True,
        data=[build_booking_response(b, db, current_user) for b in bookings]
    )

@router.get("/analytics")
def get_host_analytics(
    current_user: User = Depends(require_host),
    db: Session = Depends(get_db)
):
    from datetime import datetime, date, timedelta
    from collections import defaultdict

    host = db.query(Host).filter(Host.user_id == current_user.id).first()
    host_id = host.id if host else 1

    properties = db.query(Property).filter(Property.host_id == host_id).all()
    prop_ids = [p.id for p in properties]

    if not prop_ids:
        return ApiResponse(
            success=True,
            data={
                "summary": {
                    "total_earnings": 0.0,
                    "gross_revenue": 0.0,
                    "total_bookings": 0,
                    "confirmed_bookings": 0,
                    "avg_booking_value": 0.0,
                    "total_properties": 0,
                    "occupancy_rate": 0.0,
                    "avg_rating": 5.0,
                    "total_nights": 0
                },
                "revenue_trend": [],
                "property_breakdown": [],
                "status_breakdown": [],
                "weekend_vs_weekday": {"weekend_bookings": 0, "weekday_bookings": 0, "weekend_percentage": 0.0}
            }
        )

    bookings = db.query(Booking).filter(Booking.property_id.in_(prop_ids)).all()
    confirmed = [b for b in bookings if b.status in [BookingStatus.CONFIRMED, BookingStatus.COMPLETED]]
    gross_revenue = sum([b.total for b in confirmed])
    total_earnings = round(gross_revenue * 0.90, 2)  # Host net after 10% platform service fee

    # Total nights calculation
    total_nights = 0
    for b in confirmed:
        if b.check_in and b.check_out:
            nights = (b.check_out - b.check_in).days
            total_nights += max(nights, 1)

    avg_booking_val = round(gross_revenue / len(confirmed), 2) if confirmed else 0.0

    # Monthly Trend (continuous last 6 months)
    now = datetime.now()
    month_keys = []
    for i in range(5, -1, -1):
        m_date = now - timedelta(days=i * 30)
        month_keys.append((m_date.strftime("%b %Y"), m_date.strftime("%b")))

    monthly_dict = {k[0]: {"earnings": 0.0, "gross": 0.0, "bookings": 0} for k in month_keys}
    for b in bookings:
        if b.created_at:
            m_key = b.created_at.strftime("%b %Y")
            if m_key in monthly_dict:
                if b.status in [BookingStatus.CONFIRMED, BookingStatus.COMPLETED]:
                    monthly_dict[m_key]["gross"] += b.total
                    monthly_dict[m_key]["earnings"] += round(b.total * 0.90, 2)
                monthly_dict[m_key]["bookings"] += 1
            else:
                latest_key = month_keys[-1][0]
                if b.status in [BookingStatus.CONFIRMED, BookingStatus.COMPLETED]:
                    monthly_dict[latest_key]["gross"] += b.total
                    monthly_dict[latest_key]["earnings"] += round(b.total * 0.90, 2)
                monthly_dict[latest_key]["bookings"] += 1

    revenue_trend = []
    for full_m, short_m in month_keys:
        val = monthly_dict[full_m]
        revenue_trend.append({
            "month": short_m,
            "full_month": full_m,
            "earnings": round(val["earnings"], 2),
            "revenue": round(val["gross"], 2),
            "bookings": val["bookings"]
        })

    # Property-wise Breakdown
    prop_stats = defaultdict(lambda: {"revenue": 0.0, "earnings": 0.0, "bookings": 0, "name": ""})
    for p in properties:
        prop_stats[p.id]["name"] = p.name
    for b in confirmed:
        if b.property_id in prop_stats:
            prop_stats[b.property_id]["revenue"] += b.total
            prop_stats[b.property_id]["earnings"] += round(b.total * 0.90, 2)
            prop_stats[b.property_id]["bookings"] += 1

    property_breakdown = []
    for pid, pdata in sorted(prop_stats.items(), key=lambda x: x[1]["revenue"], reverse=True):
        property_breakdown.append({
            "property_id": pid,
            "property_name": pdata["name"],
            "revenue": round(pdata["revenue"], 2),
            "earnings": round(pdata["earnings"], 2),
            "bookings": pdata["bookings"]
        })

    # Booking status breakdown
    status_map = {
        "confirmed": {"label": "Confirmed", "color": "#10b981"},
        "completed": {"label": "Completed", "color": "#3b82f6"},
        "pending": {"label": "Pending", "color": "#f59e0b"},
        "cancelled": {"label": "Cancelled", "color": "#ef4444"},
    }
    status_counts = defaultdict(int)
    for b in bookings:
        status_name = (b.status.value if hasattr(b.status, "value") else str(b.status)).lower()
        status_counts[status_name] += 1

    status_breakdown = []
    total_b = len(bookings)
    for s_key, s_info in status_map.items():
        count = status_counts[s_key]
        pct = round((count / total_b * 100), 1) if total_b > 0 else 0
        status_breakdown.append({
            "status": s_info["label"],
            "count": count,
            "percentage": pct,
            "color": s_info["color"]
        })

    # Reviews & ratings
    reviews = db.query(Review).filter(Review.property_id.in_(prop_ids), Review.is_approved == True).all()
    avg_rating = round(sum([r.rating for r in reviews]) / len(reviews), 1) if reviews else 5.0

    # Weekend vs Weekday
    weekend_count = 0
    weekday_count = 0
    for b in confirmed:
        if b.check_in:
            if b.check_in.weekday() in [4, 5, 6]:
                weekend_count += 1
            else:
                weekday_count += 1
    total_valid = weekend_count + weekday_count
    weekend_pct = round((weekend_count / total_valid * 100), 1) if total_valid > 0 else 75.0

    return ApiResponse(
        success=True,
        data={
            "summary": {
                "total_earnings": total_earnings,
                "gross_revenue": round(gross_revenue, 2),
                "total_bookings": total_b,
                "confirmed_bookings": len(confirmed),
                "avg_booking_value": avg_booking_val,
                "total_properties": len(properties),
                "total_nights": total_nights,
                "avg_rating": avg_rating,
                "reviews_count": len(reviews),
                "weekend_share_percentage": weekend_pct
            },
            "revenue_trend": revenue_trend,
            "property_breakdown": property_breakdown,
            "status_breakdown": status_breakdown,
            "weekend_vs_weekday": {
                "weekend_bookings": weekend_count,
                "weekday_bookings": weekday_count,
                "weekend_percentage": weekend_pct
            }
        }
    )

@router.get("/availability-calendar", response_model=ApiResponse[HostCalendarResponse])
def get_host_availability_calendar(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    property_id: Optional[int] = None,
    current_user: User = Depends(require_host),
    db: Session = Depends(get_db)
):
    """
    Host availability calendar endpoint.
    Returns daily inventory status (green/red/yellow/gray), confirmed reservations, and blocks.
    Protected so hosts can manage only their own properties.
    """
    host = db.query(Host).filter(Host.user_id == current_user.id).first()
    if not host and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Host profile not found")

    host_id = host.id if host else 1

    query = db.query(Property).filter(Property.host_id == host_id)
    if property_id:
        query = query.filter(Property.id == property_id)

    properties = query.all()
    if property_id and not properties and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Unauthorized to view calendar for this property")

    today = date.today()
    s_date = start_date if start_date else today
    e_date = end_date if end_date else (s_date + timedelta(days=30))

    if e_date < s_date:
        raise HTTPException(status_code=400, detail="End date must be at or after start date")

    now_utc = datetime.now(timezone.utc)
    calendar_props = []

    for prop in properties:
        total_units = getattr(prop, "total_units", 1) or 1

        # Fetch bookings in date range
        bookings = db.query(Booking).filter(
            Booking.property_id == prop.id,
            Booking.check_in <= e_date,
            Booking.check_out > s_date,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PAYMENT_PENDING])
        ).all()

        # Fetch blocks in date range
        blocks = db.query(InventoryBlock).filter(
            InventoryBlock.property_id == prop.id,
            InventoryBlock.start_date <= e_date,
            InventoryBlock.end_date >= s_date
        ).all()

        # Fetch custom availabilities
        avails = {
            a.date: a for a in db.query(Availability).filter(
                Availability.property_id == prop.id,
                Availability.date >= s_date,
                Availability.date <= e_date
            ).all()
        }

        days_status = []
        curr = s_date
        while curr <= e_date:
            # Confirmed bookings on this night
            confirmed_on_day = [
                b for b in bookings
                if b.status == BookingStatus.CONFIRMED and b.check_in <= curr < b.check_out
            ]
            confirmed_units = sum(getattr(b, "quantity", 1) or 1 for b in confirmed_on_day)

            # Active holds on this night
            held_on_day = [
                b for b in bookings
                if b.status == BookingStatus.PAYMENT_PENDING
                and b.check_in <= curr < b.check_out
                and (b.hold_expires_at is None or b.hold_expires_at > now_utc)
            ]
            held_units = sum(getattr(b, "quantity", 1) or 1 for b in held_on_day)

            # Inventory blocks on this night
            blocks_on_day = [
                ib for ib in blocks
                if ib.start_date <= curr <= ib.end_date
            ]
            blocked_units = sum(ib.blocked_units for ib in blocks_on_day)

            # Manual availability record
            avail_rec = avails.get(curr)
            day_price = avail_rec.price if (avail_rec and avail_rec.price) else prop.price_per_night
            if avail_rec and not avail_rec.available:
                blocked_units = max(blocked_units, total_units)

            avail_units = max(0, total_units - confirmed_units - held_units - blocked_units)

            # Visual State:
            # Green = Available
            # Red = Booked
            # Yellow = Temporarily Held
            # Gray = Blocked
            if blocked_units >= total_units or (blocked_units > 0 and avail_units == 0 and confirmed_units == 0 and held_units == 0):
                day_state = "blocked"
            elif avail_units == 0 or confirmed_units >= total_units:
                day_state = "booked"
            elif held_units > 0 and avail_units == 0:
                day_state = "held"
            else:
                day_state = "available"

            bookings_summary = [
                {
                    "id": b.id,
                    "booking_code": b.booking_code,
                    "guest_name": b.customer.full_name if b.customer else "Guest",
                    "quantity": getattr(b, "quantity", 1) or 1,
                    "status": b.status.value,
                    "total": b.total
                }
                for b in confirmed_on_day + held_on_day
            ]

            blocks_summary = [
                {
                    "id": ib.id,
                    "blocked_units": ib.blocked_units,
                    "reason": ib.reason
                }
                for ib in blocks_on_day
            ]

            days_status.append(HostCalendarDayStatus(
                date=curr.isoformat(),
                status=day_state,
                total_units=total_units,
                available_units=avail_units,
                booked_units=confirmed_units,
                held_units=held_units,
                blocked_units=blocked_units,
                price=day_price,
                bookings=bookings_summary,
                blocks=blocks_summary
            ))
            curr += timedelta(days=1)

        calendar_props.append(HostCalendarProperty(
            property_id=prop.id,
            property_name=prop.name,
            property_type=prop.property_type.value if hasattr(prop.property_type, "value") else str(prop.property_type),
            total_units=total_units,
            days=days_status
        ))

    return ApiResponse(
        success=True,
        data=HostCalendarResponse(
            start_date=s_date.isoformat(),
            end_date=e_date.isoformat(),
            properties=calendar_props
        )
    )

@router.post("/inventory-blocks", response_model=ApiResponse[InventoryBlockResponse])
def create_inventory_block(
    block_in: InventoryBlockCreate,
    current_user: User = Depends(require_host),
    db: Session = Depends(get_db)
):
    """
    Creates an inventory block for maintenance or personal use.
    Guarantees hosts cannot manually mark dates or block inventory if confirmed bookings occupy it.
    """
    prop = db.query(Property).filter(Property.id == block_in.property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    host = db.query(Host).filter(Host.user_id == current_user.id).first()
    if current_user.role != UserRole.ADMIN and (not host or prop.host_id != host.id):
        raise HTTPException(status_code=403, detail="Not authorized to manage inventory for this property")

    if block_in.end_date < block_in.start_date:
        raise HTTPException(status_code=400, detail="End date must be at or after start date")

    today = date.today()
    if block_in.start_date < today:
        raise HTTPException(status_code=400, detail="Cannot block dates in the past")

    total_units = getattr(prop, "total_units", 1) or 1
    if block_in.blocked_units > total_units:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot block {block_in.blocked_units} units. Property has only {total_units} total unit(s)."
        )

    # Check that confirmed bookings do not conflict with the requested block
    overlapping_confirmed = db.query(Booking).filter(
        Booking.property_id == prop.id,
        Booking.status == BookingStatus.CONFIRMED,
        Booking.check_in <= block_in.end_date,
        Booking.check_out > block_in.start_date
    ).all()

    curr = block_in.start_date
    while curr <= block_in.end_date:
        confirmed_units = sum(
            getattr(b, "quantity", 1) or 1
            for b in overlapping_confirmed
            if b.check_in <= curr < b.check_out
        )
        if confirmed_units + block_in.blocked_units > total_units:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot block {block_in.blocked_units} unit(s) on {curr}: {confirmed_units} unit(s) already occupied by confirmed reservations."
            )
        curr += timedelta(days=1)

    block = InventoryBlock(
        property_id=prop.id,
        start_date=block_in.start_date,
        end_date=block_in.end_date,
        blocked_units=block_in.blocked_units,
        reason=block_in.reason.strip()
    )
    db.add(block)
    db.commit()
    db.refresh(block)

    return ApiResponse(
        success=True,
        message="Dates blocked successfully for maintenance/personal use.",
        data=InventoryBlockResponse.model_validate(block)
    )

@router.delete("/inventory-blocks/{block_id}", response_model=ApiResponse[str])
def delete_inventory_block(
    block_id: int,
    current_user: User = Depends(require_host),
    db: Session = Depends(get_db)
):
    """
    Reopens previously blocked dates by removing the inventory block.
    """
    block = db.query(InventoryBlock).filter(InventoryBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Inventory block not found")

    prop = db.query(Property).filter(Property.id == block.property_id).first()
    host = db.query(Host).filter(Host.user_id == current_user.id).first()
    if current_user.role != UserRole.ADMIN and (not host or not prop or prop.host_id != host.id):
        raise HTTPException(status_code=403, detail="Not authorized to modify this property's blocks")

    db.delete(block)
    db.commit()

    return ApiResponse(success=True, message="Block removed and dates reopened for booking successfully.")


