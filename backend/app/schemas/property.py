from typing import Optional, List, Any
from datetime import datetime, date
from pydantic import BaseModel, Field
from backend.app.models.property import PropertyType, ApprovalStatus, CancellationPolicyType

class AmenityResponse(BaseModel):
    id: int
    name: str
    icon: str
    category: str

    class Config:
        from_attributes = True

class PropertyImageCreate(BaseModel):
    image_url: str
    caption: Optional[str] = None
    is_cover: bool = False
    is_primary: bool = False
    sort_order: int = 0

class PropertyImageUpdate(BaseModel):
    image_url: Optional[str] = None
    caption: Optional[str] = None
    is_cover: Optional[bool] = None
    is_primary: Optional[bool] = None
    sort_order: Optional[int] = None

class PropertyImageResponse(BaseModel):
    id: int
    property_id: Optional[int] = None
    image_url: str
    caption: Optional[str] = None
    is_cover: bool = False
    is_primary: bool = False
    sort_order: int = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AvailabilityItem(BaseModel):
    date: date
    price: float
    available: bool

class AvailabilityResponse(BaseModel):
    id: int
    date: date
    price: float
    available: bool

    class Config:
        from_attributes = True

class AvailabilitySetRequest(BaseModel):
    start_date: date
    end_date: date
    price: Optional[float] = None
    available: bool = True

class PropertyBase(BaseModel):
    name: str
    description: str
    property_type: PropertyType = PropertyType.VILLA
    price_per_night: float = Field(..., gt=0)
    cleaning_fee: float = 500.0
    max_guests: int = Field(default=4, gt=0)
    bedrooms: int = Field(default=2, ge=0)
    bathrooms: int = Field(default=2, ge=0)
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    check_in_time: str = "14:00"
    check_out_time: str = "11:00"
    house_rules: Optional[str] = None
    cancellation_policy: CancellationPolicyType = CancellationPolicyType.MODERATE

NON_GUJARAT_AREAS = {
    "mumbai", "pune", "nashik", "nagpur", "thane", "jaipur", "udaipur", 
    "jodhpur", "delhi", "new delhi", "bangalore", "bengaluru", "indore", 
    "bhopal", "goa", "hyderabad", "kolkata", "chennai", "lucknow", 
    "kanpur", "agra", "varanasi", "chandigarh", "amritsar", "shimla",
    "maharashtra", "rajasthan", "madhya pradesh", "karnataka",
    "telangana", "west bengal", "tamil nadu", "uttar pradesh", "punjab",
    "haryana", "kerala", "bihar"
}

class PropertyCreate(PropertyBase):
    location_id: Optional[int] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    district: Optional[str] = None
    taluka: Optional[str] = None
    amenity_ids: List[int] = []
    images: List[PropertyImageCreate] = []

    def model_post_init(self, __context: Any) -> None:
        if self.state and self.state.strip().lower() != "gujarat":
            raise ValueError(f"State '{self.state}' is outside Gujarat. Only properties located in Gujarat, India are allowed.")
        if self.country and self.country.strip().lower() not in ["india", "in"]:
            raise ValueError("Country must be India.")
        if self.city and self.city.strip().lower() in NON_GUJARAT_AREAS:
            raise ValueError(f"Location '{self.city}' is outside Gujarat. Only locations inside Gujarat, India are permitted.")

class PropertyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location_id: Optional[int] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    district: Optional[str] = None
    taluka: Optional[str] = None
    property_type: Optional[PropertyType] = None
    price_per_night: Optional[float] = None
    cleaning_fee: Optional[float] = None
    max_guests: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    house_rules: Optional[str] = None
    cancellation_policy: Optional[CancellationPolicyType] = None
    booking_enabled: Optional[bool] = None
    is_featured: Optional[bool] = None
    amenity_ids: Optional[List[int]] = None
    images: Optional[List[PropertyImageCreate]] = None

    def model_post_init(self, __context: Any) -> None:
        if self.state and self.state.strip().lower() != "gujarat":
            raise ValueError(f"State '{self.state}' is outside Gujarat. Only properties located in Gujarat, India are allowed.")
        if self.country and self.country.strip().lower() not in ["india", "in"]:
            raise ValueError("Country must be India.")
        if self.city and self.city.strip().lower() in NON_GUJARAT_AREAS:
            raise ValueError(f"Location '{self.city}' is outside Gujarat. Only locations inside Gujarat, India are permitted.")

class PropertyLocationSummary(BaseModel):
    id: int
    name: str
    slug: str
    district: Optional[str] = None
    taluka: Optional[str] = None
    state: str = "Gujarat"
    country: str = "India"

    class Config:
        from_attributes = True

class PropertyHostSummary(BaseModel):
    id: int
    user_id: Optional[int] = None
    business_name: str
    host_type: str
    phone: Optional[str] = None
    verification_status: str

    class Config:
        from_attributes = True

class PropertyResponse(PropertyBase):
    id: int
    slug: str
    host_id: int
    location_id: int
    verification_status: ApprovalStatus
    booking_enabled: bool
    is_featured: bool
    source_reference: Optional[str] = None
    data_source: Optional[str] = None
    source_url: Optional[str] = None
    verified_at: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Associated summaries
    location: Optional[PropertyLocationSummary] = None
    host: Optional[PropertyHostSummary] = None
    images: List[PropertyImageResponse] = []
    amenities_list: List[AmenityResponse] = []
    average_rating: float = 0.0
    reviews_count: int = 0
    is_wishlisted: bool = False

    class Config:
        from_attributes = True

class PropertyDetailResponse(PropertyResponse):
    recent_reviews: List[dict] = []
    upcoming_availabilities: List[AvailabilityResponse] = []

class AvailabilityCheckRequest(BaseModel):
    property_id: int
    check_in: date
    check_out: date
    guests: int = 1

class AvailabilityCheckResponse(BaseModel):
    available: bool
    property_id: int
    check_in: date
    check_out: date
    nights: int
    price_per_night: float
    base_price: float
    cleaning_fee: float
    tax: float
    total_price: float
    message: Optional[str] = None
