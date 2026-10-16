from datetime import date, datetime, timedelta, timezone
from typing import Tuple, List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from backend.app.models.property import Property, Availability, ApprovalStatus, PropertyType, InventoryBlock
from backend.app.models.booking import Booking, BookingStatus, BookingItem, BookingItemType
from backend.app.models.activity import ActivitySlot, SlotStatus

def is_hold_active(hold_expires_at: Optional[datetime]) -> bool:
    if hold_expires_at is None:
        return False
    now = datetime.now(timezone.utc)
    if hold_expires_at.tzinfo is None:
        hold_dt = hold_expires_at.replace(tzinfo=timezone.utc)
    else:
        hold_dt = hold_expires_at
    return hold_dt > now

class AvailabilityService:
    @staticmethod
    def get_nights_between(check_in: date, check_out: date) -> List[date]:
        """
        Returns list of nights (dates) for the stay: [check_in, check_out).
        Check-out date itself is free for the next check-in.
        """
        nights = []
        curr = check_in
        while curr < check_out:
            nights.append(curr)
            curr += timedelta(days=1)
        return nights

    @staticmethod
    def expire_stale_payment_holds(db: Session) -> int:
        """
        Automatically expires pending payment holds that have exceeded their hold_expires_at window.
        Expired holds no longer occupy inventory.
        """
        stale_bookings = db.query(Booking).filter(
            Booking.status == BookingStatus.PAYMENT_PENDING,
            Booking.hold_expires_at.isnot(None)
        ).all()
        
        count = 0
        for b in stale_bookings:
            if not is_hold_active(b.hold_expires_at):
                b.status = BookingStatus.EXPIRED
                count += 1
        if count > 0:
            db.commit()
        return count

    @staticmethod
    def calculate_property_availability(
        db: Session,
        property_id: int,
        check_in: Optional[date] = None,
        check_out: Optional[date] = None,
        guest_count: int = 1,
        quantity: int = 1,
        exclude_booking_id: Optional[int] = None,
        include_alternatives: bool = True
    ) -> Dict[str, Any]:
        """
        Full database-driven availability calculation across requested nights.
        Calculates:
        - Occupied units per night (Confirmed reservations + Active unexpired payment holds + Inventory blocks)
        - Minimum available capacity across all nights
        - Status (available, sold_out, limited_availability, select_dates, unavailable)
        - Pricing breakdown and verified alternatives if sold out.
        """
        prop = db.query(Property).filter(Property.id == property_id).first()
        if not prop:
            return {
                "is_available": False,
                "availability_status": "unavailable",
                "total_units": 0,
                "available_units": 0,
                "booked_units": 0,
                "blocked_units": 0,
                "requested_dates": [],
                "night_breakdown": [],
                "stay_price": 0.0,
                "cleaning_fee": 0.0,
                "tax": 0.0,
                "total_price": 0.0,
                "message": "Property not found",
                "alternative_dates": [],
                "alternative_properties": []
            }

        total_units = getattr(prop, "total_units", 1) or 1

        # Check if disabled by admin or host
        if prop.verification_status != ApprovalStatus.APPROVED or not prop.booking_enabled:
            return {
                "is_available": False,
                "availability_status": "unavailable",
                "total_units": total_units,
                "available_units": 0,
                "booked_units": 0,
                "blocked_units": total_units,
                "requested_dates": [],
                "night_breakdown": [],
                "stay_price": 0.0,
                "cleaning_fee": 0.0,
                "tax": 0.0,
                "total_price": 0.0,
                "message": "Property is currently not bookable or pending approval",
                "alternative_dates": [],
                "alternative_properties": []
            }

        # If dates not provided
        if not check_in or not check_out:
            return {
                "is_available": False,
                "availability_status": "select_dates",
                "total_units": total_units,
                "available_units": total_units,
                "booked_units": 0,
                "blocked_units": 0,
                "requested_dates": [],
                "night_breakdown": [],
                "stay_price": round(prop.price_per_night * max(quantity, 1), 2),
                "cleaning_fee": round(prop.cleaning_fee * max(quantity, 1), 2),
                "tax": round((prop.price_per_night + prop.cleaning_fee) * max(quantity, 1) * 0.12, 2),
                "total_price": round((prop.price_per_night + prop.cleaning_fee) * max(quantity, 1) * 1.12, 2),
                "message": "Please select check-in and check-out dates",
                "alternative_dates": [],
                "alternative_properties": []
            }

        # Date validations
        today = date.today()
        if check_in < today:
            return {
                "is_available": False,
                "availability_status": "unavailable",
                "total_units": total_units,
                "available_units": 0,
                "booked_units": 0,
                "blocked_units": 0,
                "requested_dates": [],
                "night_breakdown": [],
                "stay_price": 0.0,
                "cleaning_fee": 0.0,
                "tax": 0.0,
                "total_price": 0.0,
                "message": "Check-in date cannot be in the past",
                "alternative_dates": [],
                "alternative_properties": []
            }

        if check_out <= check_in:
            return {
                "is_available": False,
                "availability_status": "unavailable",
                "total_units": total_units,
                "available_units": 0,
                "booked_units": 0,
                "blocked_units": 0,
                "requested_dates": [],
                "night_breakdown": [],
                "stay_price": 0.0,
                "cleaning_fee": 0.0,
                "tax": 0.0,
                "total_price": 0.0,
                "message": "Check-out date must be strictly after check-in date",
                "alternative_dates": [],
                "alternative_properties": []
            }

        if guest_count <= 0:
            return {
                "is_available": False,
                "availability_status": "unavailable",
                "total_units": total_units,
                "available_units": 0,
                "booked_units": 0,
                "blocked_units": 0,
                "requested_dates": [],
                "night_breakdown": [],
                "stay_price": 0.0,
                "cleaning_fee": 0.0,
                "tax": 0.0,
                "total_price": 0.0,
                "message": "Guest count must be positive",
                "alternative_dates": [],
                "alternative_properties": []
            }

        if quantity <= 0:
            return {
                "is_available": False,
                "availability_status": "unavailable",
                "total_units": total_units,
                "available_units": 0,
                "booked_units": 0,
                "blocked_units": 0,
                "requested_dates": [],
                "night_breakdown": [],
                "stay_price": 0.0,
                "cleaning_fee": 0.0,
                "tax": 0.0,
                "total_price": 0.0,
                "message": "Requested quantity must be at least 1 unit",
                "alternative_dates": [],
                "alternative_properties": []
            }

        # Check total capacity
        max_possible_guests = prop.max_guests * quantity
        if guest_count > max_possible_guests:
            return {
                "is_available": False,
                "availability_status": "sold_out",
                "total_units": total_units,
                "available_units": 0,
                "booked_units": 0,
                "blocked_units": 0,
                "requested_dates": [],
                "night_breakdown": [],
                "stay_price": 0.0,
                "cleaning_fee": 0.0,
                "tax": 0.0,
                "total_price": 0.0,
                "message": f"Guest count ({guest_count}) exceeds capacity for {quantity} unit(s) (maximum {max_possible_guests} guests)",
                "alternative_dates": [],
                "alternative_properties": []
            }

        # First expire stale holds
        AvailabilityService.expire_stale_payment_holds(db)

        nights = AvailabilityService.get_nights_between(check_in, check_out)
        now_utc = datetime.now(timezone.utc)

        # Query all potentially overlapping bookings
        b_query = db.query(Booking).filter(
            Booking.property_id == property_id,
            Booking.check_in < check_out,
            Booking.check_out > check_in,
            or_(
                Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PAYMENT_PENDING]),
                Booking.status.in_(["CONFIRMED", "PAYMENT_PENDING", "confirmed", "payment_pending"])
            )
        )
        if exclude_booking_id:
            b_query = b_query.filter(Booking.id != exclude_booking_id)
        overlapping_bookings = b_query.all()

        # Query host inventory blocks
        blocks = db.query(InventoryBlock).filter(
            InventoryBlock.property_id == property_id,
            InventoryBlock.start_date <= (check_out - timedelta(days=1)),
            InventoryBlock.end_date >= check_in
        ).all()

        # Query legacy availability table for custom prices or manual blocks
        avail_records = {
            r.date: r
            for r in db.query(Availability).filter(
                Availability.property_id == property_id,
                Availability.date.in_(nights)
            ).all()
        }

        night_breakdown = []
        night_avail_units = []
        night_booked_units = []
        night_held_units = []
        night_blocked_units = []
        total_stay_price = 0.0

        unit_label = "room" if prop.property_type in [PropertyType.HOTEL, PropertyType.RESORT, PropertyType.GUEST_HOUSE] else "unit"

        for n in nights:
            # Helper to check status
            def b_status_str(b):
                return (b.status.value if hasattr(b.status, "value") else str(b.status)).lower()

            # 1. Confirmed bookings occupying this night
            confirmed_units = sum(
                getattr(b, "quantity", 1) or 1
                for b in overlapping_bookings
                if b_status_str(b) == "confirmed" and b.check_in <= n < b.check_out
            )

            # 2. Active payment holds occupying this night
            held_units = sum(
                getattr(b, "quantity", 1) or 1
                for b in overlapping_bookings
                if b_status_str(b) == "payment_pending"
                and b.check_in <= n < b.check_out
                and is_hold_active(b.hold_expires_at)
            )

            # 3. Inventory blocks from host
            blocked_units = sum(
                ib.blocked_units
                for ib in blocks
                if ib.start_date <= n <= ib.end_date
            )

            # 4. Check legacy availability record for manual shutoff
            avail_rec = avail_records.get(n)
            night_base_price = avail_rec.price if (avail_rec and avail_rec.price) else prop.price_per_night
            if avail_rec and not avail_rec.available:
                # If marked unavailable in date table, treat entire inventory as blocked
                blocked_units = max(blocked_units, total_units)

            night_total_occupied = confirmed_units + held_units + blocked_units
            available_this_night = max(0, total_units - night_total_occupied)

            night_avail_units.append(available_this_night)
            night_booked_units.append(confirmed_units)
            night_held_units.append(held_units)
            night_blocked_units.append(blocked_units)

            total_stay_price += night_base_price * quantity

            night_breakdown.append({
                "date": n.isoformat(),
                "price": night_base_price,
                "total_units": total_units,
                "available_units": available_this_night,
                "confirmed_units": confirmed_units,
                "held_units": held_units,
                "blocked_units": blocked_units
            })

        min_available = min(night_avail_units) if night_avail_units else 0
        max_booked = max(night_booked_units) if night_booked_units else 0
        max_held = max(night_held_units) if night_held_units else 0
        max_blocked = max(night_blocked_units) if night_blocked_units else 0

        # Calculate taxes and total
        cleaning_fee = round(prop.cleaning_fee * quantity, 2)
        subtotal = round(total_stay_price, 2)
        tax = round((subtotal + cleaning_fee) * 0.12, 2)
        total_price = round(subtotal + cleaning_fee + tax, 2)

        # Status determination:
        # Case 1: Host blocked all units for any requested night -> Unavailable (🔵)
        # Case 2: Available units < quantity (or 0) -> Sold Out (🔴)
        # Case 3: 0 < Available units <= 3 and total_units > 1 -> Limited Availability (🟡)
        # Case 4: Available units >= quantity -> Available (🟢)
        if max_blocked >= total_units and min_available == 0 and max_booked == 0 and max_held == 0:
            status_code = "unavailable"
            is_avail = False
            message = "This property is temporarily closed / blocked by the host for your selected dates."
        elif min_available < quantity:
            status_code = "sold_out"
            is_avail = False
            if total_units == 1:
                message = "Sold Out: This villa is already booked for your selected dates."
            else:
                if min_available == 0:
                    message = "Sold Out: No bookable rooms remain for your selected dates."
                else:
                    message = f"Sold Out: Only {min_available} {unit_label}{'s' if min_available > 1 else ''} available, but {quantity} requested."
        elif min_available <= 3 and total_units > 1:
            status_code = "limited_availability"
            is_avail = True
            message = f"Limited Availability: Only {min_available} {unit_label}{'s' if min_available > 1 else ''} left for your selected dates."
        else:
            status_code = "available"
            is_avail = True
            if total_units == 1:
                message = "Available: Entire villa can be booked for your selected dates."
            else:
                message = f"Available: {min_available} {unit_label}{'s' if min_available > 1 else ''} available for your selected dates."

        # If sold out or unavailable, fetch real verified database alternatives
        alt_dates = []
        alt_props = []
        if not is_avail and include_alternatives:
            alt_dates = AvailabilityService._find_alternative_dates(
                db=db,
                prop=prop,
                check_in=check_in,
                nights_count=len(nights),
                guest_count=guest_count,
                quantity=quantity
            )
            alt_props = AvailabilityService._find_alternative_properties(
                db=db,
                current_prop=prop,
                check_in=check_in,
                check_out=check_out,
                guest_count=guest_count,
                quantity=quantity
            )

        return {
            "is_available": is_avail,
            "availability_status": status_code,
            "total_units": total_units,
            "available_units": min_available,
            "booked_units": max_booked + max_held,
            "confirmed_units": max_booked,
            "held_units": max_held,
            "blocked_units": max_blocked,
            "requested_dates": [n.isoformat() for n in nights],
            "night_breakdown": night_breakdown,
            "stay_price": subtotal,
            "cleaning_fee": cleaning_fee,
            "tax": tax,
            "total_price": total_price,
            "message": message,
            "alternative_dates": alt_dates,
            "alternative_properties": alt_props
        }

    @staticmethod
    def _find_alternative_dates(
        db: Session,
        prop: Property,
        check_in: date,
        nights_count: int,
        guest_count: int,
        quantity: int
    ) -> List[Dict[str, Any]]:
        """
        Finds up to 2 alternative date windows where this specific property IS available in the DB.
        Checks +7 days (next weekend) and +14 days.
        """
        alternatives = []
        for offset_days in [7, 14, 21]:
            candidate_check_in = check_in + timedelta(days=offset_days)
            candidate_check_out = candidate_check_in + timedelta(days=nights_count)

            # Quick check availability
            res = AvailabilityService.calculate_property_availability(
                db=db,
                property_id=prop.id,
                check_in=candidate_check_in,
                check_out=candidate_check_out,
                guest_count=guest_count,
                quantity=quantity,
                include_alternatives=False
            )
            if res["is_available"]:
                alternatives.append({
                    "check_in": candidate_check_in.isoformat(),
                    "check_out": candidate_check_out.isoformat(),
                    "nights": nights_count,
                    "total_price": res["total_price"],
                    "available_units": res["available_units"]
                })
            if len(alternatives) >= 2:
                break
        return alternatives

    @staticmethod
    def _find_alternative_properties(
        db: Session,
        current_prop: Property,
        check_in: date,
        check_out: date,
        guest_count: int,
        quantity: int
    ) -> List[Dict[str, Any]]:
        """
        Finds nearby verified Gujarat properties in the same location/district that ARE available for requested dates.
        """
        # Find approved properties in same location or district
        candidates = db.query(Property).filter(
            Property.id != current_prop.id,
            Property.verification_status == ApprovalStatus.APPROVED,
            Property.booking_enabled == True,
            Property.max_guests >= (guest_count // max(quantity, 1))
        ).limit(10).all()

        alt_props = []
        for p in candidates:
            # Check availability
            check = AvailabilityService.calculate_property_availability(
                db=db,
                property_id=p.id,
                check_in=check_in,
                check_out=check_out,
                guest_count=guest_count,
                quantity=quantity,
                include_alternatives=False
            )
            if check["is_available"]:
                primary_img = (
                    next((img.image_url for img in p.images if img.is_primary or img.is_cover), None)
                    or (p.images[0].image_url if p.images else None)
                )
                alt_props.append({
                    "id": p.id,
                    "name": p.name,
                    "slug": p.slug,
                    "property_type": p.property_type.value if hasattr(p.property_type, "value") else str(p.property_type),
                    "location_name": p.location.name if p.location else "Gujarat",
                    "price_per_night": p.price_per_night,
                    "total_price": check["total_price"],
                    "available_units": check["available_units"],
                    "primary_image": primary_img
                })
            if len(alt_props) >= 3:
                break
        return alt_props

    @staticmethod
    def check_property_availability(
        db: Session,
        property_id: int,
        check_in: date,
        check_out: date,
        guest_count: int = 1,
        quantity: int = 1,
        exclude_booking_id: Optional[int] = None
    ) -> Tuple[bool, str, List[date]]:
        """
        Backwards-compatible wrapper returning (is_available, message, list_of_dates).
        """
        result = AvailabilityService.calculate_property_availability(
            db=db,
            property_id=property_id,
            check_in=check_in,
            check_out=check_out,
            guest_count=guest_count,
            quantity=quantity,
            exclude_booking_id=exclude_booking_id
        )
        nights = [date.fromisoformat(d) for d in result["requested_dates"]]
        return result["is_available"], result["message"], nights

    @staticmethod
    def check_activity_slot_availability(
        db: Session,
        slot_id: int,
        participants: int
    ) -> Tuple[bool, str, Optional[ActivitySlot]]:
        """
        Validates activity slot capacity in database.
        """
        slot = db.query(ActivitySlot).filter(ActivitySlot.id == slot_id).first()
        if not slot:
            return False, "Activity slot not found", None

        if slot.status != SlotStatus.ACTIVE:
            return False, f"Activity slot is {slot.status.value}", slot

        if slot.remaining_capacity < participants:
            return False, f"Only {slot.remaining_capacity} spots remaining (requested: {participants})", slot

        return True, "Slot is available", slot

    @staticmethod
    def calculate_stay_cost(
        db: Session,
        property_id: int,
        check_in: date,
        check_out: date,
        quantity: int = 1
    ) -> Tuple[float, float, List[dict]]:
        """
        Calculates stay subtotal, cleaning fee, and breakdown for a given quantity of units.
        Returns: (subtotal, cleaning_fee, night_breakdown)
        """
        prop = db.query(Property).filter(Property.id == property_id).first()
        if not prop:
            return 0.0, 0.0, []

        nights = AvailabilityService.get_nights_between(check_in, check_out)
        
        # Load any custom date prices
        avail_records = {
            r.date: r.price
            for r in db.query(Availability).filter(
                Availability.property_id == property_id,
                Availability.date.in_(nights)
            ).all()
        }

        subtotal = 0.0
        breakdown = []
        for n in nights:
            night_price = avail_records.get(n, prop.price_per_night)
            line_night = night_price * max(quantity, 1)
            subtotal += line_night
            breakdown.append({
                "date": str(n),
                "price": night_price,
                "quantity": quantity,
                "total": line_night
            })

        cleaning_fee = prop.cleaning_fee * max(quantity, 1)
        return subtotal, cleaning_fee, breakdown

availability_service = AvailabilityService()
