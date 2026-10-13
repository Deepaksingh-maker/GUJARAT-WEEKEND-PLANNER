from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel, Field
from backend.app.models.booking import BookingStatus, PaymentStatus, BookingItemType

class ActivityItemBooking(BaseModel):
    activity_id: int
    activity_slot_id: int
    participants: int = Field(default=1, gt=0)

class BookingCreateRequest(BaseModel):
    property_id: Optional[int] = None
    check_in: Optional[date] = None
    check_out: Optional[date] = None
    guest_count: int = Field(default=1, gt=0)
    special_requests: Optional[str] = None
    coupon_code: Optional[str] = None
    activities: List[ActivityItemBooking] = []

class PriceBreakdownRequest(BaseModel):
    property_id: Optional[int] = None
    check_in: Optional[date] = None
    check_out: Optional[date] = None
    guest_count: int = 1
    coupon_code: Optional[str] = None
    activities: List[ActivityItemBooking] = []

class PriceItemDetail(BaseModel):
    title: str
    description: str
    quantity: int
    unit_price: float
    total: float

class PriceBreakdownResponse(BaseModel):
    nights: int
    stay_subtotal: float
    activities_subtotal: float
    subtotal: float
    cleaning_fee: float
    tax: float
    discount: float
    total: float
    items: List[PriceItemDetail]

class BookingItemResponse(BaseModel):
    id: int
    item_type: BookingItemType
    property_id: Optional[int]
    activity_id: Optional[int]
    activity_slot_id: Optional[int]
    date_start: date
    date_end: Optional[date]
    quantity: int
    unit_price: float
    total_price: float
    notes: Optional[str]

    class Config:
        from_attributes = True

class BookingPropertySummary(BaseModel):
    id: int
    name: str
    slug: str
    property_type: str
    address: str
    location_name: Optional[str] = None
    primary_image: Optional[str] = None

class BookingCustomerSummary(BaseModel):
    id: int
    full_name: str
    email: str
    phone: Optional[str]

    class Config:
        from_attributes = True

class BookingResponse(BaseModel):
    id: int
    booking_code: str
    customer_id: int
    property_id: Optional[int]
    check_in: Optional[date]
    check_out: Optional[date]
    guest_count: int
    subtotal: float
    cleaning_fee: float
    tax: float
    discount: float
    total: float
    status: BookingStatus
    payment_status: PaymentStatus
    cancellation_reason: Optional[str]
    qr_code_data: Optional[str]
    special_requests: Optional[str]
    coupon_code: Optional[str]
    created_at: datetime
    updated_at: datetime
    property: Optional[BookingPropertySummary] = None
    customer: Optional[BookingCustomerSummary] = None
    items: List[BookingItemResponse] = []
    can_review: bool = False
    contact_unlocked: bool = False
    whatsapp_url: Optional[str] = None
    call_url: Optional[str] = None

    class Config:
        from_attributes = True

class BookingCancelRequest(BaseModel):
    reason: str = Field(..., min_length=5)

class BookingStatusUpdateRequest(BaseModel):
    status: BookingStatus
