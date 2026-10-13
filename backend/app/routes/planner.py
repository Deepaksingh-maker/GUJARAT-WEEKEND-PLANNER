from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.schemas.planner import WeekendPlanRequest, WeekendPlanResponse
from backend.app.schemas.common import ApiResponse
from backend.app.services.planner_service import planner_service

router = APIRouter(prefix="/planner", tags=["Weekend Planner"])

@router.post("/generate", response_model=ApiResponse[WeekendPlanResponse])
def generate_plans(
    req: WeekendPlanRequest,
    db: Session = Depends(get_db)
):
    plan_response = planner_service.generate_weekend_plans(db=db, request=req)
    return ApiResponse(
        success=True,
        message=f"Generated {len(plan_response.generated_plans)} customized Gujarat weekend plans",
        data=plan_response
    )
