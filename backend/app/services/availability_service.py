from datetime import date, timedelta
from typing import Tuple, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from backend.app.models.property import Property, Availability, ApprovalStatus
from backend.app.models.booking import Booking, BookingStatus, BookingItem, BookingItemType
from backend.app.models.activity import ActivitySlot, SlotStatus

class AvailabilityService:
    @staticmethod
    def get_nights_between(check_in: date, check_out: date) -> List[date]:
        """
        Returns list of nights (dates) for the stay: [check_in, check_out).
        """
        nights = []
        curr = check_in
        while curr < check_out:
            nights.append(curr)
            curr += timedelta(days=1)
        return nights

    @staticmethod
    def check_property_availability(
        db: Session,
        property_id: int,
        check_in: date,
        check_out: date,
        guest_count: int = 1,
        exclude_booking_id: Optional[int] = None
    ) -> Tuple[bool, str, List[date]]:
        """
        Validates real database availability for a property across given dates.
        Returns: (is_available, message, list_of_dates)
        """
        if check_in >= check_out:
            return False, "Check-out date must be strictly after check-in date", []

        prop = db.query(Property).filter(Property.id == property_id).first()
        if not prop:
            return False, "Property not found", []

        if prop.verification_status != ApprovalStatus.APPROVED:
            return False, "Property is not approved for public booking", []

        if not prop.booking_enabled:
            return False, "Property is temporarily disabled for booking", []

        if guest_count > prop.max_guests:
            return False, f"Guest count exceeds property capacity (max {prop.max_guests} guests)", []

        nights = AvailabilityService.get_nights_between(check_in, check_out)
        if not nights:
            return False, "At least one night stay required", []

        # 1. Check Availability records (manual blocks or blackout dates set by host)
        blocked_records = (
            db.query(Availability)
            .filter(
                Availability.property_id == property_id,
                Availability.date.in_(nights),
                Availability.available == False
            )
            .all()
        )
        if blocked_records:
            blocked_dates_str = ", ".join([str(r.date) for r in blocked_records])
            return False, f"Dates blocked by host: {blocked_dates_str}", nights

        # 2. Check Overlapping Active Bookings
        active_statuses = [
            BookingStatus.CONFIRMED,
            BookingStatus.PAYMENT_PENDING,
            BookingStatus.PENDING
        ]
        
        query = db.query(Booking).filter(
            Booking.property_id == property_id,
            Booking.status.in_(active_statuses),
            Booking.check_in < check_out,
            Booking.check_out > check_in
        )
        if exclude_booking_id:
            query = query.filter(Booking.id != exclude_booking_id)

        existing_conflicts = query.all()
        if existing_conflicts:
            conflict_codes = ", ".join([b.booking_code for b in existing_conflicts])
            return False, f"Property already booked for requested dates (Conflicting reservation: {conflict_codes})", nights

        return True, "Property is available", nights

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
        check_out: date
    ) -> Tuple[float, float, List[dict]]:
        """
        Calculates stay total by summing date prices from availability table or base price.
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
            subtotal += night_price
            breakdown.append({
                "date": str(n),
                "price": night_price
            })

        return subtotal, prop.cleaning_fee, breakdown

availability_service = AvailabilityService()
