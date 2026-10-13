from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from backend.app.schemas.property import PropertyResponse

class WishlistToggleRequest(BaseModel):
    property_id: int

class WishlistResponse(BaseModel):
    id: int
    property_id: int
    created_at: datetime
    property: Optional[PropertyResponse] = None

    class Config:
        from_attributes = True
