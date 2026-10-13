from datetime import datetime, timezone, date
import enum
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, Enum
from backend.app.database import Base

class DiscountType(str, enum.Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"

class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(String(255), nullable=True)
    discount_type = Column(Enum(DiscountType), default=DiscountType.PERCENTAGE, nullable=False)
    discount_value = Column(Float, nullable=False)  # e.g. 10 (%) or 500 (INR)
    min_booking_value = Column(Float, default=0.0, nullable=False)
    max_discount = Column(Float, nullable=True)
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date, nullable=False)
    max_uses = Column(Integer, default=100, nullable=False)
    current_uses = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
