import random
import string
from datetime import datetime, timezone, date, timedelta
from typing import Tuple, Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException, status

from backend.app.models.user import User
from backend.app.models.property import Property, Availability, ApprovalStatus
from backend.app.models.activity import Activity, ActivitySlot, SlotStatus
from backend.app.models.booking import (
    Booking, BookingItem, BookingStatus, PaymentStatus, BookingItemType
)
from backend.app.models.payment import Payment, PaymentGateway, PaymentRecordStatus
from backend.app.models.coupon import Coupon, DiscountType
from backend.app.schemas.booking import BookingCreateRequest, ActivityItemBooking, PriceItemDetail
from backend.app.services.availability_service import availability_service
from backend.app.services.qr_service import generate_booking_qr_code, generate_verification_token

def generate_booking_code() -> str:
    chars = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"GUJ-WKD-{chars}"

class BookingService:
    @staticmethod
    def calculate_price_breakdown(
        db: Session,
        property_id: Optional[int],
        check_in: Optional[date],
        check_out: Optional[date],
        guest_count: int,
        quantity: int = 1,
        coupon_code: Optional[str] = None,
        activities: List[ActivityItemBooking] = []
    ) -> Dict[str, Any]:
        stay_subtotal = 0.0
        cleaning_fee = 0.0
        nights = 0
        items_breakdown: List[PriceItemDetail] = []
        qty = max(quantity, 1)

        # 1. Stay cost
        if property_id and check_in and check_out:
            prop = db.query(Property).filter(Property.id == property_id).first()
            if not prop:
                raise HTTPException(status_code=404, detail="Property not found")
            
            sub, clean_fee, dates_detail = availability_service.calculate_stay_cost(
                db, property_id, check_in, check_out, quantity=qty
            )
            stay_subtotal = sub
            cleaning_fee = clean_fee
            nights = len(dates_detail)
            
            unit_title = f"{qty} Unit{'s' if qty > 1 else ''}"
            items_breakdown.append(PriceItemDetail(
                title=f"{prop.name} - {unit_title} ({nights} Night{'s' if nights > 1 else ''})",
                description=f"{check_in.strftime('%d %b %Y')} to {check_out.strftime('%d %b %Y')} for {guest_count} guest{'s' if guest_count > 1 else ''}",
                quantity=nights * qty,
                unit_price=round(stay_subtotal / max(nights * qty, 1), 2),
                total=stay_subtotal
            ))
            
            if cleaning_fee > 0:
                items_breakdown.append(PriceItemDetail(
                    title="Cleaning & Sanitization Fee",
                    description=f"Standard professional turnaround and hygiene service ({qty} unit{'s' if qty > 1 else ''})",
                    quantity=qty,
                    unit_price=round(cleaning_fee / qty, 2),
                    total=cleaning_fee
                ))

        # 2. Activities cost
        activities_subtotal = 0.0
        for act_req in activities:
            slot = db.query(ActivitySlot).filter(ActivitySlot.id == act_req.activity_slot_id).first()
            if not slot:
                continue
            act = db.query(Activity).filter(Activity.id == act_req.activity_id).first()
            act_name = act.name if act else "Activity Experience"
            
            line_total = round(slot.price * act_req.participants, 2)
            activities_subtotal += line_total
            
            items_breakdown.append(PriceItemDetail(
                title=f"{act_name} - {slot.start_time}",
                description=f"Date: {slot.date.strftime('%d %b %Y')} | {act_req.participants} participant{'s' if act_req.participants > 1 else ''}",
                quantity=act_req.participants,
                unit_price=slot.price,
                total=line_total
            ))

        subtotal = stay_subtotal + activities_subtotal
        
        # 3. Discount (Coupons)
        discount = 0.0
        if coupon_code:
            coupon = db.query(Coupon).filter(
                Coupon.code == coupon_code.upper().strip(),
                Coupon.is_active == True,
                Coupon.valid_from <= date.today(),
                Coupon.valid_to >= date.today()
            ).first()
            if coupon and (subtotal + cleaning_fee) >= coupon.min_booking_value:
                if coupon.discount_type == DiscountType.PERCENTAGE:
                    calc_disc = (subtotal + cleaning_fee) * (coupon.discount_value / 100.0)
                    if coupon.max_discount:
                        calc_disc = min(calc_disc, coupon.max_discount)
                    discount = round(calc_disc, 2)
                else:
                    discount = min(coupon.discount_value, subtotal + cleaning_fee)

        # 4. Tax (12% GST on hospitality)
        taxable_amount = max(0.0, subtotal + cleaning_fee - discount)
        tax = round(taxable_amount * 0.12, 2)
        total = round(taxable_amount + tax, 2)

        return {
            "nights": nights,
            "stay_subtotal": stay_subtotal,
            "activities_subtotal": activities_subtotal,
            "subtotal": subtotal,
            "cleaning_fee": cleaning_fee,
            "tax": tax,
            "discount": discount,
            "total": total,
            "items": items_breakdown
        }

    @staticmethod
    def create_booking(
        db: Session,
        customer: User,
        booking_in: BookingCreateRequest
    ) -> Booking:
        """
        Creates a pending booking with double booking protection inside an atomic transaction.
        Enforces:
        - Check-in not in past
        - Check-out > Check-in
        - Guests > 0 and <= capacity
        - Quantity > 0 and <= available inventory
        - Hold expires in 15 minutes
        """
        qty = getattr(booking_in, "quantity", 1) or 1
        today = date.today()

        if booking_in.property_id:
            if not booking_in.check_in or not booking_in.check_out:
                raise HTTPException(status_code=400, detail="Check-in and Check-out dates required for stay")

            if booking_in.check_in < today:
                raise HTTPException(status_code=400, detail="Check-in date cannot be in the past")

            if booking_in.check_out <= booking_in.check_in:
                raise HTTPException(status_code=400, detail="Check-out date must be strictly after check-in date")

            if booking_in.guest_count <= 0:
                raise HTTPException(status_code=400, detail="Guest count must be positive")

            if qty <= 0:
                raise HTTPException(status_code=400, detail="Requested quantity must be positive")

        # Acquire immediate transaction lock for serialized availability validation in SQLite
        try:
            db.connection().execute(text("BEGIN IMMEDIATE"))
        except Exception:
            pass

        # Re-check stay availability atomically within transaction
        if booking_in.property_id:
            avail_res = availability_service.calculate_property_availability(
                db=db,
                property_id=booking_in.property_id,
                check_in=booking_in.check_in,
                check_out=booking_in.check_out,
                guest_count=booking_in.guest_count,
                quantity=qty
            )
            if not avail_res["is_available"]:
                db.rollback()
                conflict_msg = (
                    "Sorry, this property is no longer available for your selected dates. "
                    "Please choose another date or property."
                )
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=conflict_msg)

        # Check and lock activity slots
        for act_item in booking_in.activities:
            is_slot_avail, reason, slot = availability_service.check_activity_slot_availability(
                db=db,
                slot_id=act_item.activity_slot_id,
                participants=act_item.participants
            )
            if not is_slot_avail:
                db.rollback()
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Activity Slot Conflict: {reason}")

        # Calculate pricing server-side
        pricing = BookingService.calculate_price_breakdown(
            db=db,
            property_id=booking_in.property_id,
            check_in=booking_in.check_in,
            check_out=booking_in.check_out,
            guest_count=booking_in.guest_count,
            quantity=qty,
            coupon_code=booking_in.coupon_code,
            activities=booking_in.activities
        )

        booking_code = generate_booking_code()
        while db.query(Booking).filter(Booking.booking_code == booking_code).first():
            booking_code = generate_booking_code()

        # Set 15-minute hold expiration for payment pending
        now_utc = datetime.now(timezone.utc)
        hold_expiry = now_utc + timedelta(minutes=15)

        booking = Booking(
            booking_code=booking_code,
            customer_id=customer.id,
            property_id=booking_in.property_id,
            check_in=booking_in.check_in,
            check_out=booking_in.check_out,
            guest_count=booking_in.guest_count,
            quantity=qty,
            hold_expires_at=hold_expiry,
            subtotal=pricing["subtotal"],
            cleaning_fee=pricing["cleaning_fee"],
            tax=pricing["tax"],
            discount=pricing["discount"],
            total=pricing["total"],
            status=BookingStatus.PAYMENT_PENDING,
            payment_status=PaymentStatus.UNPAID,
            special_requests=booking_in.special_requests,
            coupon_code=booking_in.coupon_code
        )
        db.add(booking)
        db.flush()  # get booking.id

        # Add Property Stay Item
        if booking_in.property_id and booking_in.check_in and booking_in.check_out:
            stay_item = BookingItem(
                booking_id=booking.id,
                item_type=BookingItemType.PROPERTY_STAY,
                property_id=booking_in.property_id,
                date_start=booking_in.check_in,
                date_end=booking_in.check_out,
                quantity=pricing["nights"] * qty,
                unit_price=round(pricing["stay_subtotal"] / max(pricing["nights"] * qty, 1), 2),
                total_price=pricing["stay_subtotal"],
                notes=f"Stay for {booking_in.guest_count} guests ({qty} unit{'s' if qty > 1 else ''})"
            )
            db.add(stay_item)

        # Add Activity Items and adjust remaining capacity
        for act_item in booking_in.activities:
            slot = db.query(ActivitySlot).filter(ActivitySlot.id == act_item.activity_slot_id).first()
            if slot:
                slot.remaining_capacity -= act_item.participants
                if slot.remaining_capacity <= 0:
                    slot.status = SlotStatus.FULL
                db.add(slot)

                act_booking_item = BookingItem(
                    booking_id=booking.id,
                    item_type=BookingItemType.ACTIVITY_SLOT,
                    activity_id=act_item.activity_id,
                    activity_slot_id=act_item.activity_slot_id,
                    date_start=slot.date,
                    quantity=act_item.participants,
                    unit_price=slot.price,
                    total_price=round(slot.price * act_item.participants, 2),
                    notes=f"Time: {slot.start_time} - {slot.end_time}"
                )
                db.add(act_booking_item)

        # Generate unique verification token & secure scannable QR code pass
        if not booking.verification_token:
            booking.verification_token = generate_verification_token()
        booking.qr_code_data = generate_booking_qr_code(booking.verification_token)

        # If coupon used, increment count
        if booking_in.coupon_code:
            coupon = db.query(Coupon).filter(Coupon.code == booking_in.coupon_code.upper()).first()
            if coupon:
                coupon.current_uses += 1
                db.add(coupon)

        db.commit()
        db.refresh(booking)
        return booking

    @staticmethod
    def confirm_payment_and_booking(
        db: Session,
        booking: Booking,
        order_id: str,
        transaction_id: str,
        signature: str,
        payment_method: str = "UPI"
    ) -> Booking:
        """
        Transition booking to CONFIRMED and record Payment in SQLite.
        Re-validates availability before confirming to guarantee no double bookings.
        """
        try:
            db.connection().execute(text("BEGIN IMMEDIATE"))
        except Exception:
            pass

        # Re-validate stay availability right before confirming
        if booking.property_id and booking.check_in and booking.check_out:
            avail_res = availability_service.calculate_property_availability(
                db=db,
                property_id=booking.property_id,
                check_in=booking.check_in,
                check_out=booking.check_out,
                guest_count=booking.guest_count,
                quantity=getattr(booking, "quantity", 1) or 1,
                exclude_booking_id=booking.id
            )
            if not avail_res["is_available"]:
                db.rollback()
                conflict_msg = (
                    "Sorry, this property is no longer available for your selected dates. "
                    "Please choose another date or property."
                )
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=conflict_msg)

        booking.status = BookingStatus.CONFIRMED
        booking.payment_status = PaymentStatus.PAID
        booking.hold_expires_at = None

        # Refresh QR code with secure verification URL
        if not booking.verification_token:
            booking.verification_token = generate_verification_token()
        booking.qr_code_data = generate_booking_qr_code(booking.verification_token)

        payment = Payment(
            booking_id=booking.id,
            amount=booking.total,
            currency="INR",
            payment_gateway=PaymentGateway.RAZORPAY,
            order_id=order_id,
            transaction_id=transaction_id,
            signature=signature,
            status=PaymentRecordStatus.SUCCESSFUL,
            payment_method=payment_method
        )
        db.add(payment)
        db.commit()
        db.refresh(booking)
        return booking

    @staticmethod
    def cancel_booking(
        db: Session,
        booking: Booking,
        reason: str
    ) -> Booking:
        """
        Cancels booking, releases activity slots and inventory.
        """
        booking.status = BookingStatus.CANCELLED
        booking.cancellation_reason = reason
        booking.hold_expires_at = None

        # Release activity slot capacity
        for item in booking.items:
            if item.item_type == BookingItemType.ACTIVITY_SLOT and item.activity_slot:
                slot = item.activity_slot
                slot.remaining_capacity += item.quantity
                if slot.remaining_capacity > 0:
                    slot.status = SlotStatus.ACTIVE
                db.add(slot)

        db.commit()
        db.refresh(booking)
        return booking

booking_service = BookingService()
