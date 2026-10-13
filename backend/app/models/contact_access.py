from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base

class ContactAccessLog(Base):
    __tablename__ = "contact_access_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    guest_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    host_id = Column(Integer, ForeignKey("hosts.id", ondelete="SET NULL"), nullable=True, index=True)
    
    channel = Column(String(30), default="whatsapp", nullable=False) # "whatsapp", "call", "view"
    whatsapp_unlocked = Column(Boolean, default=True, nullable=False)
    phone_unlocked = Column(Boolean, default=True, nullable=False)
    unlocked_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    accessed_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    ip_address = Column(String(100), nullable=True)
    user_agent = Column(String(255), nullable=True)

    # Relationships
    booking = relationship("Booking")
    guest = relationship("User", foreign_keys=[guest_id])
    host = relationship("Host", foreign_keys=[host_id])
    accessed_by = relationship("User", foreign_keys=[accessed_by_user_id])


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True, index=True)
    value = Column(String(255), nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
