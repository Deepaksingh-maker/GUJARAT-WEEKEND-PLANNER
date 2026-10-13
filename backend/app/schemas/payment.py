from typing import Optional, Dict, Any
from pydantic import BaseModel

class PaymentInitiateRequest(BaseModel):
    booking_id: int

class PaymentInitiateResponse(BaseModel):
    order_id: str
    amount: float
    currency: str = "INR"
    key_id: str
    booking_code: str
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None
    notes: Optional[Dict[str, Any]] = None

class PaymentVerifyRequest(BaseModel):
    booking_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    payment_method: Optional[str] = "upi"

class PaymentVerifyResponse(BaseModel):
    verified: bool
    booking_id: int
    booking_code: str
    status: str
    payment_status: str
    transaction_id: str
    message: str
