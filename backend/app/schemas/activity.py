from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel, Field
from backend.app.models.activity import ActivityCategory, SlotStatus
from backend.app.models.property import ApprovalStatus

class ActivitySlotBase(BaseModel):
    date: date
    start_time: str
    end_time: str
    capacity: int = Field(..., gt=0)
    price: float = Field(..., gt=0)

class ActivitySlotCreate(ActivitySlotBase):
    pass

class ActivitySlotResponse(ActivitySlotBase):
    id: int
    activity_id: int
    remaining_capacity: int
    status: SlotStatus

    class Config:
        from_attributes = True

class ActivityBase(BaseModel):
    name: str
    description: str
    category: ActivityCategory = ActivityCategory.ADVENTURE
    price: float = Field(..., gt=0)
    duration: str = "2 Hours"
    capacity: int = Field(default=10, gt=0)
    age_limit: str = "8+"
    difficulty: str = "Moderate"
    included_items: Optional[str] = None
    excluded_items: Optional[str] = None
    cancellation_policy: Optional[str] = None
    image_url: Optional[str] = None

class ActivityCreate(ActivityBase):
    location_id: int
    property_id: Optional[int] = None
    slots: List[ActivitySlotCreate] = []

class ActivityUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location_id: Optional[int] = None
    property_id: Optional[int] = None
    category: Optional[ActivityCategory] = None
    price: Optional[float] = None
    duration: Optional[str] = None
    capacity: Optional[int] = None
    age_limit: Optional[str] = None
    difficulty: Optional[str] = None
    included_items: Optional[str] = None
    excluded_items: Optional[str] = None
    cancellation_policy: Optional[str] = None
    image_url: Optional[str] = None
    is_featured: Optional[bool] = None

class ActivityLocationSummary(BaseModel):
    id: int
    name: str
    slug: str

    class Config:
        from_attributes = True

class ActivityResponse(ActivityBase):
    id: int
    slug: str
    host_id: int
    location_id: int
    property_id: Optional[int]
    verification_status: ApprovalStatus
    is_featured: bool
    created_at: datetime
    updated_at: datetime
    location: Optional[ActivityLocationSummary] = None
    slots_count: int = 0
    average_rating: float = 0.0
    reviews_count: int = 0

    class Config:
        from_attributes = True

class ActivityDetailResponse(ActivityResponse):
    slots: List[ActivitySlotResponse] = []
    recent_reviews: List[dict] = []
