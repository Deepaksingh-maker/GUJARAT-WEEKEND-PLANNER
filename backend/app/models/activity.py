from datetime import datetime, timezone, date
import enum
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, Date, ForeignKey, Enum
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.models.property import ApprovalStatus

class ActivityCategory(str, enum.Enum):
    ADVENTURE = "adventure"
    NATURE = "nature"
    WATER = "water"
    CULTURAL = "cultural"
    WELLNESS = "wellness"
    COUPLE = "couple"
    FAMILY = "family"

class SlotStatus(str, enum.Enum):
    ACTIVE = "active"
    FULL = "full"
    CANCELLED = "cancelled"

class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    host_id = Column(Integer, ForeignKey("hosts.id", ondelete="CASCADE"), nullable=False, index=True)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=False)
    category = Column(Enum(ActivityCategory), default=ActivityCategory.ADVENTURE, nullable=False, index=True)
    price = Column(Float, nullable=False)  # Price per person
    duration = Column(String(50), nullable=False)  # e.g., "2 Hours", "Half Day"
    capacity = Column(Integer, default=10, nullable=False)
    age_limit = Column(String(20), default="8+", nullable=False)
    difficulty = Column(String(50), default="Moderate", nullable=False)
    included_items = Column(Text, nullable=True)  # Comma or newline separated
    excluded_items = Column(Text, nullable=True)
    cancellation_policy = Column(Text, nullable=True)
    verification_status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING, nullable=False, index=True)
    is_featured = Column(Boolean, default=False, nullable=False)
    image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    host = relationship("Host", back_populates="activities")
    location = relationship("Location", back_populates="activities")
    property = relationship("Property", back_populates="activities")
    slots = relationship("ActivitySlot", back_populates="activity", cascade="all, delete-orphan", order_by="ActivitySlot.date")
    reviews = relationship("Review", back_populates="activity")

class ActivitySlot(Base):
    __tablename__ = "activity_slots"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    activity_id = Column(Integer, ForeignKey("activities.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    start_time = Column(String(20), nullable=False)
    end_time = Column(String(20), nullable=False)
    capacity = Column(Integer, nullable=False)
    remaining_capacity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    status = Column(Enum(SlotStatus), default=SlotStatus.ACTIVE, nullable=False)

    activity = relationship("Activity", back_populates="slots")
    booking_items = relationship("BookingItem", back_populates="activity_slot")
