from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base

class LocationImage(Base):
    __tablename__ = "location_images"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)
    caption = Column(String(255), nullable=True)
    source_name = Column(String(255), default="Wikimedia Commons", nullable=True)
    source_url = Column(String(500), nullable=True)
    license = Column(String(100), default="CC BY-SA 4.0", nullable=True)
    attribution = Column(String(255), nullable=True)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    location = relationship("Location", back_populates="images")

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    type = Column(String(50), default="city", nullable=True) # district, city, town, taluka, village, locality, tourist
    taluka = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    state = Column(String(100), default="Gujarat", nullable=False, index=True)
    country = Column(String(100), default="India", nullable=False, index=True)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    landmark_name = Column(String(255), nullable=True)
    image_source = Column(String(255), nullable=True)
    source_url = Column(String(500), nullable=True)
    image_license = Column(String(100), nullable=True)
    image_attribution = Column(String(255), nullable=True)
    tagline = Column(String(255), nullable=True)
    is_popular = Column(Boolean, default=True)
    latitude = Column(String(50), nullable=True)
    longitude = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    properties = relationship("Property", back_populates="location", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="location", cascade="all, delete-orphan")
    images = relationship("LocationImage", back_populates="location", cascade="all, delete-orphan", order_by="LocationImage.is_primary.desc()")
