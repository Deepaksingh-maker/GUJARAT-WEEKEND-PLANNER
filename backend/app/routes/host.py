from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from backend.app.database import get_db
from backend.app.models.user import User, UserRole
from backend.app.models.host import Host, VerificationStatus
from backend.app.models.property import Property, ApprovalStatus
from backend.app.models.activity import Activity
from backend.app.models.booking import Booking, BookingStatus, PaymentStatus
from backend.app.models.review import Review
from backend.app.schemas.common import ApiResponse
from backend.app.schemas.property import PropertyResponse
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

