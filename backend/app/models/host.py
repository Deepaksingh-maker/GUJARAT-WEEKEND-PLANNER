from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base

class HostType(str, enum.Enum):
    VILLA_OWNER = "villa_owner"
    RESORT_OWNER = "resort_owner"
    FARMHOUSE_OWNER = "farmhouse_owner"
    CAMPING_OPERATOR = "camping_operator"
    ACTIVITY_PROVIDER = "activity_provider"
    OTHER = "other"

class VerificationStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"

class Host(Base):
    __tablename__ = "hosts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    host_type = Column(Enum(HostType), default=HostType.VILLA_OWNER, nullable=False)
    business_name = Column(String(255), nullable=False)
    bio = Column(Text, nullable=True)
    phone = Column(String(30), nullable=True)
    verification_status = Column(Enum(VerificationStatus), default=VerificationStatus.PENDING, nullable=False, index=True)
    verification_notes = Column(Text, nullable=True)
    payout_details = Column(Text, nullable=True)  # Bank/UPI details for earnings
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="host_profile")
    properties = relationship("Property", back_populates="host", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="host", cascade="all, delete-orphan")
