from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from backend.app.database import Base

class PaymentGateway(str, enum.Enum):
    RAZORPAY = "razorpay"
    SIMULATION = "simulation"

class PaymentRecordStatus(str, enum.Enum):
    INITIATED = "initiated"
    SUCCESSFUL = "successful"
    FAILED = "failed"
    REFUNDED = "refunded"

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    payment_gateway = Column(Enum(PaymentGateway), default=PaymentGateway.RAZORPAY, nullable=False)
    
    order_id = Column(String(100), index=True, nullable=True)       # e.g., order_xxxx
    transaction_id = Column(String(100), index=True, nullable=True) # e.g., pay_xxxx
    signature = Column(String(255), nullable=True)
    
    status = Column(Enum(PaymentRecordStatus), default=PaymentRecordStatus.INITIATED, nullable=False, index=True)
    payment_method = Column(String(50), nullable=True)  # UPI, Card, Netbanking
    payment_details = Column(Text, nullable=True)       # JSON string of gateway response
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    booking = relationship("Booking", back_populates="payment")
