from typing import Optional, List
from datetime import date
from pydantic import BaseModel, Field
from backend.app.schemas.property import PropertyResponse
from backend.app.schemas.activity import ActivityResponse

class WeekendPlanRequest(BaseModel):
    destination: str             # e.g., "Saputara", "Polo Forest", "Sasan Gir", "Ekta Nagar"
    date_start: date
    date_end: date
    guests: int = Field(default=2, ge=1)
    budget: Optional[float] = Field(default=10000.0, ge=1000)
    interest: str = "Nature"     # Relaxation, Adventure, Nature, Couple, Family, Food, Camping

class PlanStayOption(BaseModel):
    property: PropertyResponse
    nights: int
    estimated_stay_cost: float

class PlanActivityOption(BaseModel):
    activity: ActivityResponse
    estimated_activity_cost: float
    recommended_slot: Optional[dict] = None

class WeekendPlanOption(BaseModel):
    plan_id: str
    title: str
    destination: str
    tagline: str
    stay: Optional[PlanStayOption] = None
    activities: List[PlanActivityOption] = []
    estimated_total: float
    match_score: int
    highlights: List[str]

class WeekendPlanResponse(BaseModel):
    query: WeekendPlanRequest
    generated_plans: List[WeekendPlanOption]
