from datetime import datetime, timezone, date
import enum
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, Date, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from backend.app.database import Base

class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    PAYMENT_PENDING = "payment_pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    REFUNDED = "refunded"
    EXPIRED = "expired"

class PaymentStatus(str, enum.Enum):
    UNPAID = "unpaid"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"

class BookingItemType(str, enum.Enum):
    PROPERTY_STAY = "property_stay"
    ACTIVITY_SLOT = "activity_slot"

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    booking_code = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="SET NULL"), nullable=True, index=True)
    
    check_in = Column(Date, nullable=True, index=True)
    check_out = Column(Date, nullable=True, index=True)
    guest_count = Column(Integer, default=1, nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    hold_expires_at = Column(DateTime, nullable=True, index=True)
    
    subtotal = Column(Float, default=0.0, nullable=False)
    cleaning_fee = Column(Float, default=0.0, nullable=False)
    tax = Column(Float, default=0.0, nullable=False)
    discount = Column(Float, default=0.0, nullable=False)
    total = Column(Float, default=0.0, nullable=False)
    
    status = Column(Enum(BookingStatus), default=BookingStatus.PENDING, nullable=False, index=True)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.UNPAID, nullable=False, index=True)
    cancellation_reason = Column(Text, nullable=True)
    
    qr_code_data = Column(Text, nullable=True)
    special_requests = Column(Text, nullable=True)
    coupon_code = Column(String(50), nullable=True)
    
    # QR Pass verification & check-in tracking
    verification_token = Column(String(100), unique=True, index=True, nullable=True)
    is_checked_in = Column(Boolean, default=False, nullable=False)
    checked_in_at = Column(DateTime, nullable=True)
    checked_in_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    customer = relationship("User", foreign_keys=[customer_id], back_populates="bookings")
    property = relationship("Property", back_populates="bookings")
    items = relationship("BookingItem", back_populates="booking", cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="booking", uselist=False, cascade="all, delete-orphan")
    review = relationship("Review", back_populates="booking", uselist=False, cascade="all, delete-orphan")
    checked_in_by = relationship("User", foreign_keys=[checked_in_by_user_id])

class BookingItem(Base):
    __tablename__ = "booking_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    item_type = Column(Enum(BookingItemType), default=BookingItemType.PROPERTY_STAY, nullable=False)
    
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="SET NULL"), nullable=True)
    activity_id = Column(Integer, ForeignKey("activities.id", ondelete="SET NULL"), nullable=True)
    activity_slot_id = Column(Integer, ForeignKey("activity_slots.id", ondelete="SET NULL"), nullable=True)
    
    date_start = Column(Date, nullable=False)
    date_end = Column(Date, nullable=True)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)

    booking = relationship("Booking", back_populates="items")
    activity_slot = relationship("ActivitySlot", back_populates="booking_items")
