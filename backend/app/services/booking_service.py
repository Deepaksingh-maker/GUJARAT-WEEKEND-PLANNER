import random
import string
from datetime import datetime, timezone, date
from typing import Tuple, Optional, List, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.app.models.user import User
from backend.app.models.property import Property, Availability
from backend.app.models.activity import Activity, ActivitySlot, SlotStatus
from backend.app.models.booking import (
    Booking, BookingItem, BookingStatus, PaymentStatus, BookingItemType
)
from backend.app.models.payment import Payment, PaymentGateway, PaymentRecordStatus
from backend.app.models.coupon import Coupon, DiscountType
from backend.app.schemas.booking import BookingCreateRequest, ActivityItemBooking, PriceItemDetail
from backend.app.services.availability_service import availability_service
from backend.app.services.qr_service import generate_booking_qr_code

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
        coupon_code: Optional[str] = None,
        activities: List[ActivityItemBooking] = []
    ) -> Dict[str, Any]:
        stay_subtotal = 0.0
        cleaning_fee = 0.0
        nights = 0
        items_breakdown: List[PriceItemDetail] = []

        # 1. Stay cost
        if property_id and check_in and check_out:
            prop = db.query(Property).filter(Property.id == property_id).first()
            if not prop:
                raise HTTPException(status_code=404, detail="Property not found")
            
            sub, clean_fee, dates_detail = availability_service.calculate_stay_cost(
                db, property_id, check_in, check_out
            )
            stay_subtotal = sub
            cleaning_fee = clean_fee
            nights = len(dates_detail)
            
            items_breakdown.append(PriceItemDetail(
                title=f"{prop.name} ({nights} Night{'s' if nights > 1 else ''})",
                description=f"{check_in.strftime('%d %b %Y')} to {check_out.strftime('%d %b %Y')} for {guest_count} guest{'s' if guest_count > 1 else ''}",
                quantity=nights,
                unit_price=round(stay_subtotal / max(nights, 1), 2),
                total=stay_subtotal
            ))
            
            if cleaning_fee > 0:
                items_breakdown.append(PriceItemDetail(
                    title="Cleaning & Sanitization Fee",
                    description="Standard professional turnaround and hygiene service",
                    quantity=1,
                    unit_price=cleaning_fee,
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
        """
        # Re-check stay availability atomically
        if booking_in.property_id:
            if not booking_in.check_in or not booking_in.check_out:
                raise HTTPException(status_code=400, detail="Check-in and Check-out dates required for stay")
            
            is_avail, reason, nights = availability_service.check_property_availability(
                db=db,
                property_id=booking_in.property_id,
                check_in=booking_in.check_in,
                check_out=booking_in.check_out,
                guest_count=booking_in.guest_count
            )
            if not is_avail:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Booking Conflict: {reason}")

        # Check and lock activity slots
        for act_item in booking_in.activities:
            is_slot_avail, reason, slot = availability_service.check_activity_slot_availability(
                db=db,
                slot_id=act_item.activity_slot_id,
                participants=act_item.participants
            )
            if not is_slot_avail:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Activity Slot Conflict: {reason}")

        # Calculate pricing server-side
        pricing = BookingService.calculate_price_breakdown(
            db=db,
            property_id=booking_in.property_id,
            check_in=booking_in.check_in,
            check_out=booking_in.check_out,
            guest_count=booking_in.guest_count,
            coupon_code=booking_in.coupon_code,
            activities=booking_in.activities
        )

        booking_code = generate_booking_code()
        # Ensure booking code is unique
        while db.query(Booking).filter(Booking.booking_code == booking_code).first():
            booking_code = generate_booking_code()

        booking = Booking(
            booking_code=booking_code,
            customer_id=customer.id,
            property_id=booking_in.property_id,
            check_in=booking_in.check_in,
            check_out=booking_in.check_out,
            guest_count=booking_in.guest_count,
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
                quantity=pricing["nights"],
                unit_price=round(pricing["stay_subtotal"] / max(pricing["nights"], 1), 2),
                total_price=pricing["stay_subtotal"],
                notes=f"Stay for {booking_in.guest_count} guests"
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

        # Generate QR code pass
        prop_name = booking.property.name if booking.property else "Gujarat Weekend Experience"
        qr_code_str = generate_booking_qr_code({
            "booking_code": booking.booking_code,
            "property_id": booking.property_id,
            "customer_name": customer.full_name,
            "check_in": booking.check_in,
            "check_out": booking.check_out,
            "guest_count": booking.guest_count,
            "status": booking.status.value
        })
        booking.qr_code_data = qr_code_str

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
        """
        booking.status = BookingStatus.CONFIRMED
        booking.payment_status = PaymentStatus.PAID

        # Refresh QR code with confirmed status
        customer_name = booking.customer.full_name if booking.customer else "Valued Guest"
        booking.qr_code_data = generate_booking_qr_code({
            "booking_code": booking.booking_code,
            "property_id": booking.property_id,
            "customer_name": customer_name,
            "check_in": booking.check_in,
            "check_out": booking.check_out,
            "guest_count": booking.guest_count,
            "status": BookingStatus.CONFIRMED.value
        })

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
        Cancels booking, releases activity slots.
        """
        booking.status = BookingStatus.CANCELLED
        booking.cancellation_reason = reason

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
