from datetime import date
from backend.app.database import SessionLocal
from backend.app.services.availability_service import availability_service
from backend.app.models.property import Property

db = SessionLocal()
p = db.query(Property).filter(Property.id == 1).first()
print(f"Property 1: {p.name}, total_units: {p.total_units}, booking_enabled: {p.booking_enabled}, status: {p.verification_status}, max_guests: {p.max_guests}")

res = availability_service.calculate_property_availability(
    db=db,
    property_id=1,
    check_in=date(2030, 8, 10),
    check_out=date(2030, 8, 12),
    guest_count=2,
    quantity=1
)
print("Availability result:", res)
db.close()
