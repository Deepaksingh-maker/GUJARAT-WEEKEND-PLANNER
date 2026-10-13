from datetime import date
from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, and_

from backend.app.models.location import Location
from backend.app.models.property import Property, ApprovalStatus
from backend.app.models.activity import Activity, ActivityCategory
from backend.app.schemas.planner import (
    WeekendPlanRequest, WeekendPlanResponse, WeekendPlanOption, 
    PlanStayOption, PlanActivityOption
)
from backend.app.schemas.property import PropertyResponse
from backend.app.schemas.activity import ActivityResponse
from backend.app.services.availability_service import availability_service

class PlannerService:
    @staticmethod
    def generate_weekend_plans(
        db: Session,
        request: WeekendPlanRequest
    ) -> WeekendPlanResponse:
        # 1. Match destination strictly within Gujarat, India
        dest_clean = (request.destination or "").strip()
        loc = db.query(Location).filter(
            Location.country == "India",
            Location.state == "Gujarat",
            or_(
                func.lower(Location.slug) == dest_clean.lower(),
                func.lower(Location.name) == dest_clean.lower(),
                func.lower(Location.name).like(f"%{dest_clean.lower()}%"),
                func.lower(Location.district).like(f"%{dest_clean.lower()}%"),
                func.lower(Location.taluka).like(f"%{dest_clean.lower()}%")
            )
        ).first()

        if not loc:
            raise HTTPException(
                status_code=400,
                detail=f"'{request.destination}' is not a recognized location in Gujarat, India. The Weekend Planner only supports destinations within Gujarat."
            )

        destination_name = loc.name
        loc_id = loc.id
        matching_loc_ids = [
            l.id for l in db.query(Location.id).filter(
                Location.country == "India",
                Location.state == "Gujarat",
                or_(
                    func.lower(Location.slug) == dest_clean.lower(),
                    func.lower(Location.name) == dest_clean.lower(),
                    func.lower(Location.name).like(f"%{dest_clean.lower()}%"),
                    func.lower(Location.district).like(f"%{dest_clean.lower()}%"),
                    func.lower(Location.taluka).like(f"%{dest_clean.lower()}%")
                )
            ).all()
        ]

        # 2. Query verified bookable properties in location
        prop_query = db.query(Property).filter(
            Property.verification_status == ApprovalStatus.APPROVED,
            Property.booking_enabled == True,
            Property.max_guests >= request.guests,
            Property.location.has(
                and_(Location.country == "India", Location.state == "Gujarat")
            )
        )
        if matching_loc_ids:
            prop_query = prop_query.filter(
                or_(
                    Property.location_id.in_(matching_loc_ids),
                    Property.name.ilike(f"%{dest_clean}%"),
                    Property.address.ilike(f"%{dest_clean}%")
                )
            )
        
        all_props = prop_query.all()

        # Filter properties by real date availability
        available_props = []
        nights = max(1, (request.date_end - request.date_start).days)
        for p in all_props:
            is_avail, _, _ = availability_service.check_property_availability(
                db=db,
                property_id=p.id,
                check_in=request.date_start,
                check_out=request.date_end,
                guest_count=request.guests
            )
            if is_avail:
                stay_subtotal, cleaning_fee, _ = availability_service.calculate_stay_cost(
                    db, p.id, request.date_start, request.date_end
                )
                stay_total = stay_subtotal + cleaning_fee
                if not request.budget or stay_total <= request.budget:
                    available_props.append((p, stay_total))

        # 3. Query activities matching interest category and location
        interest_lower = request.interest.lower()
        interest_category_map = {
            "adventure": ActivityCategory.ADVENTURE,
            "nature": ActivityCategory.NATURE,
            "relaxation": ActivityCategory.WELLNESS,
            "couple": ActivityCategory.COUPLE,
            "family": ActivityCategory.FAMILY,
            "food": ActivityCategory.CULTURAL,
            "camping": ActivityCategory.NATURE,
            "photography": ActivityCategory.NATURE,
        }
        target_cat = interest_category_map.get(interest_lower, ActivityCategory.NATURE)

        act_query = db.query(Activity).filter(
            Activity.verification_status == ApprovalStatus.APPROVED
        )
        if matching_loc_ids:
            act_query = act_query.filter(Activity.location_id.in_(matching_loc_ids))
        elif loc_id:
            act_query = act_query.filter(Activity.location_id == loc_id)
        
        all_activities = act_query.all()
        # Sort activities prioritizing target category
        sorted_activities = sorted(
            all_activities,
            key=lambda a: (0 if a.category == target_cat else 1, a.price)
        )

        plans: List[WeekendPlanOption] = []

        # If no properties directly in location, fall back to any available property
        if not available_props and all_props:
            # show available property without strict budget cut
            for p in all_props[:2]:
                stay_subtotal, cleaning_fee, _ = availability_service.calculate_stay_cost(
                    db, p.id, request.date_start, request.date_end
                )
                available_props.append((p, stay_subtotal + cleaning_fee))

        # Build curated plan options
        for idx, (prop, stay_cost) in enumerate(available_props[:3]):
            # Select 1 or 2 matching activities
            selected_activities = []
            activities_cost = 0.0

            for act in sorted_activities[:2]:
                # find a matching slot if available
                act_cost = act.price * request.guests
                if not request.budget or (stay_cost + activities_cost + act_cost <= request.budget * 1.15):
                    # Find a slot for date
                    first_slot = next(
                        (s for s in act.slots if s.date == request.date_start and s.remaining_capacity >= request.guests),
                        None
                    )
                    slot_info = None
                    if first_slot:
                        slot_info = {
                            "slot_id": first_slot.id,
                            "date": str(first_slot.date),
                            "start_time": first_slot.start_time,
                            "price": first_slot.price
                        }

                    selected_activities.append(
                        PlanActivityOption(
                            activity=ActivityResponse.model_validate(act),
                            estimated_activity_cost=act_cost,
                            recommended_slot=slot_info
                        )
                    )
                    activities_cost += act_cost

            total_plan_cost = round(stay_cost + activities_cost, 2)
            
            titles = [
                f"Classic {request.interest.title()} Retreat",
                f"Signature {destination_name} Weekend Escape",
                f"All-Inclusive Nature & Leisure Package"
            ]
            taglines = [
                f"Handcrafted {nights}-night stay featuring guided activities and local comfort",
                f"Immersive Gujarat weekend curated for {request.guests} guests",
                f"Peaceful retreat tailored for unforgettable weekend memories"
            ]

            plan_opt = WeekendPlanOption(
                plan_id=f"plan_{prop.id}_{idx}",
                title=titles[idx % len(titles)],
                destination=destination_name,
                tagline=taglines[idx % len(taglines)],
                stay=PlanStayOption(
                    property=PropertyResponse.model_validate(prop),
                    nights=nights,
                    estimated_stay_cost=stay_cost
                ),
                activities=selected_activities,
                estimated_total=total_plan_cost,
                match_score=95 - (idx * 5),
                highlights=[
                    f"Verified {prop.property_type.value.capitalize()} in {destination_name}",
                    f"Tailored for {request.interest.capitalize()} lovers",
                    f"{len(selected_activities)} Curated Experiential Activities Included"
                ]
            )
            plans.append(plan_opt)

        return WeekendPlanResponse(
            query=request,
            generated_plans=plans
        )

planner_service = PlannerService()
