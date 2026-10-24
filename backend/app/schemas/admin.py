from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from backend.app.schemas.user import UserResponse
from backend.app.schemas.property import PropertyResponse
from backend.app.schemas.activity import ActivityResponse
from backend.app.schemas.booking import BookingResponse

class AdminDashboardStats(BaseModel):
    total_customers: int
    total_hosts: int
    total_properties: int
    total_activities: int
    total_bookings: int
    total_revenue: float
    pending_host_approvals: int
    pending_property_approvals: int
    pending_activity_approvals: int
    cancellations_count: int
    reviews_count: int

class AdminApprovalAction(BaseModel):
    status: Optional[str] = None  # approved, rejected, paused, blocked
    notes: Optional[str] = None

class AdminUserUpdate(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None
