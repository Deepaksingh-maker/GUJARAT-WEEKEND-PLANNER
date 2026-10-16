from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from backend.app.database import Base

class UserRole(str, enum.Enum):
    CUSTOMER = "CUSTOMER"
    HOST = "HOST"
    ADMIN = "ADMIN"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(30), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.CUSTOMER, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    host_profile = relationship("Host", back_populates="user", uselist=False, cascade="all, delete-orphan")
    bookings = relationship("Booking", foreign_keys="[Booking.customer_id]", back_populates="customer", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="customer", cascade="all, delete-orphan")
    wishlist_items = relationship("Wishlist", back_populates="customer", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
