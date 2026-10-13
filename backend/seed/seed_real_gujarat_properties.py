"""
Main idempotent seed runner for verified Gujarat accommodation dataset.
Populates real-world properties across 22 Gujarat destinations into database/app.db.
"""
import sys
from datetime import date, timedelta, datetime, timezone
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.app.database import engine, Base, SessionLocal
from backend.app.models.host import Host, HostType, VerificationStatus
from backend.app.models.user import User, UserRole
from backend.app.models.location import Location
from backend.app.models.property import (
    Property, PropertyImage, Amenity, PropertyAmenity,
    Availability, PropertyType, ApprovalStatus, CancellationPolicyType
)
from backend.seed.migrate_property_columns import migrate as migrate_columns
from backend.seed.gujarat_properties_data import REAL_GUJARAT_PROPERTIES as BATCH1
from backend.seed.gujarat_properties_data_part2 import REAL_GUJARAT_PROPERTIES as BATCH2
from backend.seed.gujarat_properties_data_part3 import REAL_GUJARAT_PROPERTIES as BATCH3

def seed_verified_properties():
    print("=" * 70)
    print("RUNNING IDEMPOTENT GUJARAT ACCOMMODATION SEEDING")
    print("=" * 70)

    # 1. Run column migrations if needed
    migrate_columns()

    db = SessionLocal()
    try:
        # 2. Verify or get Host
        host = db.query(Host).filter(Host.id == 1).first()
        if not host:
            host = db.query(Host).first()
        if not host:
            admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
            if not admin_user:
                raise RuntimeError("No Host or Admin user found in database. Run basic seed first.")
            host = Host(
                user_id=admin_user.id,
                host_type=HostType.VILLA_OWNER,
                business_name="Gujarat Verified Partner Network",
                bio="Official hospitality partner network managing verified stays across Gujarat.",
                verification_status=VerificationStatus.VERIFIED
            )
            db.add(host)
            db.flush()
        print(f"Assigning seeded inventory to Host: {host.business_name} (ID: {host.id})")

        # 3. Cache amenities
        amenity_map = {a.name: a for a in db.query(Amenity).all()}
        print(f"Loaded {len(amenity_map)} system amenities.")

        # 4. Load all property datasets
        all_properties = BATCH1 + BATCH2 + BATCH3
        print(f"Total verified properties to process: {len(all_properties)}")

        # 5. Process each property
        today = date.today()
        added_count = 0
        existing_count = 0

        # Map string property types to PropertyType enum
        enum_type_map = {
            "HOTEL": PropertyType.HOTEL,
            "RESORT": PropertyType.RESORT,
            "VILLA": PropertyType.VILLA,
            "HOMESTAY": PropertyType.HOMESTAY,
            "GUEST_HOUSE": PropertyType.GUEST_HOUSE,
            "BOUTIQUE": PropertyType.BOUTIQUE,
            "HOLIDAY_HOME": PropertyType.HOLIDAY_HOME,
            "FARMHOUSE": PropertyType.FARMHOUSE,
            "CAMPING": PropertyType.CAMPING,
            "COTTAGE": PropertyType.COTTAGE
        }

        # Map cancellation policy string
        policy_map = {
            "FLEXIBLE": CancellationPolicyType.FLEXIBLE,
            "MODERATE": CancellationPolicyType.MODERATE,
            "STRICT": CancellationPolicyType.STRICT
        }

        for p_data in all_properties:
            slug = p_data["slug"]
            prop = db.query(Property).filter(Property.slug == slug).first()

            p_type_enum = enum_type_map.get(p_data["property_type"], PropertyType.HOTEL)
            c_policy_enum = policy_map.get(p_data.get("cancellation_policy", "MODERATE"), CancellationPolicyType.MODERATE)

            if not prop:
                # Create property
                prop = Property(
                    host_id=host.id,
                    location_id=p_data["location_id"],
                    name=p_data["name"],
                    slug=slug,
                    description=p_data["description"],
                    property_type=p_type_enum,
                    price_per_night=p_data["price_per_night"],
                    cleaning_fee=p_data["cleaning_fee"],
                    max_guests=p_data["max_guests"],
                    bedrooms=p_data["bedrooms"],
                    bathrooms=p_data["bathrooms"],
                    address=p_data["address"],
                    latitude=p_data["latitude"],
                    longitude=p_data["longitude"],
                    check_in_time=p_data.get("check_in_time", "14:00"),
                    check_out_time=p_data.get("check_out_time", "11:00"),
                    house_rules=p_data.get("house_rules"),
                    cancellation_policy=c_policy_enum,
                    verification_status=ApprovalStatus.APPROVED,
                    booking_enabled=True,
                    is_featured=p_data.get("is_featured", False),
                    source_reference=p_data.get("source_reference", "Verified Public Listing"),
                    data_source=p_data.get("data_source", "Public Accommodation Directory"),
                    source_url=p_data.get("source_url"),
                    verified_at=p_data.get("verified_at", "2026-09-30")
                )
                db.add(prop)
                db.flush()

                # Add Images
                for idx, img_url in enumerate(p_data.get("images", [])):
                    p_img = PropertyImage(
                        property_id=prop.id,
                        image_url=img_url,
                        is_primary=(idx == 0),
                        is_cover=(idx == 0),
                        sort_order=idx
                    )
                    db.add(p_img)

                # Add Amenities
                for a_name in p_data.get("amenities", []):
                    if a_name in amenity_map:
                        pa = PropertyAmenity(property_id=prop.id, amenity_id=amenity_map[a_name].id)
                        db.add(pa)

                # Add 60 Days Availability
                for day_offset in range(60):
                    d = today + timedelta(days=day_offset)
                    # +15% on Fri/Sat
                    rate = prop.price_per_night * 1.15 if d.weekday() in (4, 5) else prop.price_per_night
                    avail = Availability(
                        property_id=prop.id,
                        date=d,
                        price=round(rate, 2),
                        available=True
                    )
                    db.add(avail)

                added_count += 1
            else:
                # Update data_source tracking if empty
                if not prop.data_source:
                    prop.data_source = p_data.get("data_source", "Public Accommodation Directory")
                    prop.source_url = p_data.get("source_url")
                    prop.verified_at = p_data.get("verified_at", "2026-09-30")
                existing_count += 1

        db.commit()
        print(f"Seeding completed successfully!")
        print(f"  - Newly inserted properties: {added_count}")
        print(f"  - Already existing properties: {existing_count}")
        print(f"  - Total properties now in DB: {db.query(Property).count()}")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_verified_properties()
