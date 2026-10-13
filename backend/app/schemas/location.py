from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class LocationImageResponse(BaseModel):
    id: int
    image_url: str
    caption: Optional[str] = None
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    license: Optional[str] = None
    attribution: Optional[str] = None
    is_primary: bool = False

    class Config:
        from_attributes = True

class LocationBase(BaseModel):
    name: str
    slug: str
    type: Optional[str] = "city"
    taluka: Optional[str] = None
    district: Optional[str] = None
    state: str = "Gujarat"
    country: str = "India"
    description: Optional[str] = None
    image_url: Optional[str] = None
    landmark_name: Optional[str] = None
    image_source: Optional[str] = None
    source_url: Optional[str] = None
    image_license: Optional[str] = None
    image_attribution: Optional[str] = None
    tagline: Optional[str] = None
    is_popular: bool = True
    latitude: Optional[str] = None
    longitude: Optional[str] = None

class LocationCreate(LocationBase):
    pass

class LocationUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    type: Optional[str] = None
    taluka: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    landmark_name: Optional[str] = None
    image_source: Optional[str] = None
    source_url: Optional[str] = None
    image_license: Optional[str] = None
    image_attribution: Optional[str] = None
    tagline: Optional[str] = None
    is_popular: Optional[bool] = None
    latitude: Optional[str] = None
    longitude: Optional[str] = None

class LocationSearchResult(BaseModel):
    id: int
    name: str
    slug: str
    type: Optional[str] = "city"
    taluka: Optional[str] = None
    district: Optional[str] = None
    state: str = "Gujarat"
    country: str = "India"
    image_url: Optional[str] = None
    landmark_name: Optional[str] = None
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    display_name: str
    subtitle: str
    properties_count: Optional[int] = 0

    class Config:
        from_attributes = True

class LocationResponse(LocationBase):
    id: int
    created_at: datetime
    display_name: Optional[str] = None
    properties_count: Optional[int] = 0
    activities_count: Optional[int] = 0
    images: List[LocationImageResponse] = []

    class Config:
        from_attributes = True
