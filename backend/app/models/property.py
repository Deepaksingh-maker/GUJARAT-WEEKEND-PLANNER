from datetime import datetime, timezone, date
import enum
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, 
    DateTime, Date, ForeignKey, Enum, UniqueConstraint
)
from sqlalchemy.orm import relationship
from backend.app.database import Base

class PropertyType(str, enum.Enum):
    HOTEL = "hotel"
    VILLA = "villa"
    RESORT = "resort"
    FARMHOUSE = "farmhouse"
    CAMPING = "camping"
    HOMESTAY = "homestay"
    COTTAGE = "cottage"
    GUEST_HOUSE = "guest_house"
    BOUTIQUE = "boutique"
    HOLIDAY_HOME = "holiday_home"

class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class CancellationPolicyType(str, enum.Enum):
    FLEXIBLE = "flexible"    # Full refund 1 day prior
    MODERATE = "moderate"    # Full refund 5 days prior
    STRICT = "strict"        # 50% refund up to 7 days prior

class Amenity(Base):
    __tablename__ = "amenities"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    icon = Column(String(50), default="Sparkles")
    category = Column(String(50), default="General")

    properties = relationship("PropertyAmenity", back_populates="amenity", cascade="all, delete-orphan")

class PropertyAmenity(Base):
    __tablename__ = "property_amenities"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    amenity_id = Column(Integer, ForeignKey("amenities.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (UniqueConstraint("property_id", "amenity_id", name="uq_property_amenity"),)

    property = relationship("Property", back_populates="amenities")
    amenity = relationship("Amenity", back_populates="properties")

class PropertyImage(Base):
    __tablename__ = "property_images"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String(500), nullable=False)
    caption = Column(String(255), nullable=True)
    is_primary = Column(Boolean, default=False)
    is_cover = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=True)

    property = relationship("Property", back_populates="images")

class Availability(Base):
    __tablename__ = "availabilities"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    price = Column(Float, nullable=False)  # Custom price override or regular
    available = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (UniqueConstraint("property_id", "date", name="uq_property_date_avail"),)

    property = relationship("Property", back_populates="availabilities")

class InventoryBlock(Base):
    __tablename__ = "inventory_blocks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_id = Column(Integer, nullable=True)
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    blocked_units = Column(Integer, default=1, nullable=False)
    reason = Column(Text, nullable=False, default="maintenance")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    property = relationship("Property", back_populates="inventory_blocks")

class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    host_id = Column(Integer, ForeignKey("hosts.id", ondelete="CASCADE"), nullable=False, index=True)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=False)
    property_type = Column(Enum(PropertyType), default=PropertyType.VILLA, nullable=False, index=True)
    price_per_night = Column(Float, nullable=False)
    cleaning_fee = Column(Float, default=500.0, nullable=False)
    max_guests = Column(Integer, default=4, nullable=False)
    bedrooms = Column(Integer, default=2, nullable=False)
    bathrooms = Column(Integer, default=2, nullable=False)
    total_units = Column(Integer, default=1, nullable=False)
    address = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    check_in_time = Column(String(20), default="14:00", nullable=False)
    check_out_time = Column(String(20), default="11:00", nullable=False)
    house_rules = Column(Text, nullable=True)
    cancellation_policy = Column(Enum(CancellationPolicyType), default=CancellationPolicyType.MODERATE, nullable=False)
    verification_status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING, nullable=False, index=True)
    booking_enabled = Column(Boolean, default=True, nullable=False)
    is_featured = Column(Boolean, default=False, nullable=False)
    source_reference = Column(String(255), default="Host Listed", nullable=True)
    data_source = Column(String(255), default="Public Accommodation Directory", nullable=True)
    source_url = Column(String(500), nullable=True)
    verified_at = Column(String(50), default="2026-09-30", nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    host = relationship("Host", back_populates="properties")
    location = relationship("Location", back_populates="properties")
    images = relationship("PropertyImage", back_populates="property", cascade="all, delete-orphan", order_by="PropertyImage.sort_order")
    amenities = relationship("PropertyAmenity", back_populates="property", cascade="all, delete-orphan")
    availabilities = relationship("Availability", back_populates="property", cascade="all, delete-orphan")
    inventory_blocks = relationship("InventoryBlock", back_populates="property", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="property")
    bookings = relationship("Booking", back_populates="property")
    reviews = relationship("Review", back_populates="property", cascade="all, delete-orphan")
    wishlist_entries = relationship("Wishlist", back_populates="property", cascade="all, delete-orphan")
