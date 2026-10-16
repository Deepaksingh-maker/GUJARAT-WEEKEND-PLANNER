import os
import sys
from datetime import date, datetime, timezone

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.app.database import SessionLocal
from backend.app.models.user import User, UserRole
from backend.app.models.host import Host, HostType, VerificationStatus as HostVerification
from backend.app.models.location import Location
from backend.app.models.property import Property, PropertyType, ApprovalStatus, InventoryBlock, PropertyImage
from backend.app.models.booking import Booking, BookingStatus, PaymentStatus

def seed_demo_availability_data():
    db = SessionLocal()
    try:
        print("Checking/seeding Demo Availability Data...")

        # 1. Ensure Saputara location exists
        saputara = db.query(Location).filter(
            Location.name == "Saputara",
            Location.state == "Gujarat"
        ).first()

        if not saputara:
            saputara = Location(
                name="Saputara",
                slug="saputara",
                district="Dang",
                taluka="Ahwa",
                state="Gujarat",
                country="India",
                description="Gujarat's premier picturesque hill station surrounded by lush Sahyadri forests.",
                hero_image="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
                latitude=20.5784,
                longitude=73.7483,
                is_featured=True
            )
            db.add(saputara)
            db.flush()

        # 2. Ensure Demo Host User & Host profile exists
        demo_user = db.query(User).filter(User.email == "demohost.saputara@gujaratstays.test").first()
        if not demo_user:
            demo_user = User(
                email="demohost.saputara@gujaratstays.test",
                hashed_password="demo_hashed_password_123",
                full_name="Saputara Demo Host",
                phone="+919876543210",
                role=UserRole.HOST,
                is_active=True
            )
            db.add(demo_user)
            db.flush()

        demo_host = db.query(Host).filter(Host.user_id == demo_user.id).first()
        if not demo_host:
            demo_host = Host(
                user_id=demo_user.id,
                business_name="Saputara Hospitality Demo Co.",
                host_type=HostType.RESORT_OWNER,
                phone="+919876543210",
                verification_status=HostVerification.VERIFIED,
                bio="Sunset Point Road, Saputara, Gujarat"
            )
            db.add(demo_host)
            db.flush()

        # 3. Ensure Demo Guest User exists for reservations
        demo_guest = db.query(User).filter(User.email == "demoguest@gujaratstays.test").first()
        if not demo_guest:
            demo_guest = User(
                email="demoguest@gujaratstays.test",
                hashed_password="demo_guest_password_123",
                full_name="Pooja Sharma (Demo Guest)",
                phone="+919825012345",
                role=UserRole.CUSTOMER,
                is_active=True
            )
            db.add(demo_guest)
            db.flush()

        # Target dates for scenario testing: 20 to 22 October 2026
        target_check_in = date(2026, 10, 20)
        target_check_out = date(2026, 10, 22)

        # Helper to get or create property
        def get_or_create_prop(slug, name, ptype, units, price, guests, bedrooms):
            p = db.query(Property).filter(Property.slug == slug).first()
            if not p:
                p = Property(
                    host_id=demo_host.id,
                    location_id=saputara.id,
                    name=name,
                    slug=slug,
                    description=f"[Demo Listing] {name} is a demonstration listing in Saputara, Gujarat.",
                    property_type=ptype,
                    price_per_night=price,
                    cleaning_fee=500.0,
                    max_guests=guests,
                    bedrooms=bedrooms,
                    bathrooms=bedrooms,
                    total_units=units,
                    address="Governor Hill Road, Saputara, Gujarat 394720",
                    latitude=20.5784,
                    longitude=73.7483,
                    verification_status=ApprovalStatus.APPROVED,
                    booking_enabled=True,
                    is_featured=True,
                    source_reference="Demonstration Availability Dataset",
                    data_source="Controlled Demo Dataset"
                )
                db.add(p)
                db.flush()
                # Primary image
                img = PropertyImage(
                    property_id=p.id,
                    image_url="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80",
                    caption=name,
                    is_cover=True,
                    is_primary=True,
                    sort_order=0
                )
                db.add(img)
                db.flush()
            else:
                p.total_units = units
                p.verification_status = ApprovalStatus.APPROVED
                p.booking_enabled = True
                p.price_per_night = price
                p.max_guests = guests
                db.flush()
            return p

        # -------------------------------------------------------------
        # Property A: One villa, no overlapping reservations -> Available
        # -------------------------------------------------------------
        prop_a = get_or_create_prop(
            slug="demo-villa-a-serene-valley",
            name="Demo Villa A - Serene Valley Villa",
            ptype=PropertyType.VILLA,
            units=1,
            price=4500.0,
            guests=6,
            bedrooms=3
        )
        # Clear any existing test bookings for target dates on Prop A
        db.query(Booking).filter(
            Booking.property_id == prop_a.id,
            Booking.check_in < target_check_out,
            Booking.check_out > target_check_in
        ).delete()
        db.query(InventoryBlock).filter(
            InventoryBlock.property_id == prop_a.id,
            InventoryBlock.start_date <= target_check_out,
            InventoryBlock.end_date >= target_check_in
        ).delete()
        print(f"Property A configured: ID {prop_a.id} ({prop_a.name}) - 1 unit, available.")

        # -------------------------------------------------------------
        # Property B: One villa, overlapping confirmed reservation -> Sold Out
        # -------------------------------------------------------------
        prop_b = get_or_create_prop(
            slug="demo-villa-b-sunset-hilltop",
            name="Demo Villa B - Sunset Hilltop Villa",
            ptype=PropertyType.VILLA,
            units=1,
            price=5500.0,
            guests=6,
            bedrooms=3
        )
        db.query(Booking).filter(
            Booking.property_id == prop_b.id,
            Booking.check_in < target_check_out,
            Booking.check_out > target_check_in
        ).delete()
        b_booking = Booking(
            booking_code="DEMO-B-SOLDOUT",
            customer_id=demo_guest.id,
            property_id=prop_b.id,
            check_in=target_check_in,
            check_out=target_check_out,
            guest_count=4,
            quantity=1,
            subtotal=11000.0,
            cleaning_fee=500.0,
            tax=1380.0,
            discount=0.0,
            total=12880.0,
            status=BookingStatus.CONFIRMED,
            payment_status=PaymentStatus.PAID
        )
        db.add(b_booking)
        print(f"Property B configured: ID {prop_b.id} ({prop_b.name}) - 1 unit, 1 confirmed booking -> Sold Out.")

        # -------------------------------------------------------------
        # Property C: Ten rooms, seven booked for every requested night -> Three rooms available
        # -------------------------------------------------------------
        prop_c = get_or_create_prop(
            slug="demo-resort-c-saputara-pines",
            name="Demo Resort C - Saputara Pines Resort",
            ptype=PropertyType.RESORT,
            units=10,
            price=3200.0,
            guests=3,
            bedrooms=1
        )
        db.query(Booking).filter(
            Booking.property_id == prop_c.id,
            Booking.check_in < target_check_out,
            Booking.check_out > target_check_in
        ).delete()
        c_booking = Booking(
            booking_code="DEMO-C-7ROOMS",
            customer_id=demo_guest.id,
            property_id=prop_c.id,
            check_in=target_check_in,
            check_out=target_check_out,
            guest_count=14,
            quantity=7,
            subtotal=44800.0,
            cleaning_fee=3500.0,
            tax=5796.0,
            discount=0.0,
            total=54096.0,
            status=BookingStatus.CONFIRMED,
            payment_status=PaymentStatus.PAID
        )
        db.add(c_booking)
        print(f"Property C configured: ID {prop_c.id} ({prop_c.name}) - 10 rooms, 7 booked -> 3 rooms available.")

        # -------------------------------------------------------------
        # Property D: Five rooms, but only one room available on final night -> max bookable 1 room
        # -------------------------------------------------------------
        prop_d = get_or_create_prop(
            slug="demo-hotel-d-dangs-forest",
            name="Demo Hotel D - Dangs Forest Retreat",
            ptype=PropertyType.HOTEL,
            units=5,
            price=2800.0,
            guests=2,
            bedrooms=1
        )
        db.query(Booking).filter(
            Booking.property_id == prop_d.id,
            Booking.check_in < target_check_out,
            Booking.check_out > target_check_in
        ).delete()
        # Booking 1: Night 20 (20 to 21) -> 2 rooms booked (leaving 3)
        d_booking_1 = Booking(
            booking_code="DEMO-D-NIGHT1",
            customer_id=demo_guest.id,
            property_id=prop_d.id,
            check_in=date(2026, 10, 20),
            check_out=date(2026, 10, 21),
            guest_count=4,
            quantity=2,
            subtotal=5600.0,
            cleaning_fee=1000.0,
            tax=792.0,
            discount=0.0,
            total=7392.0,
            status=BookingStatus.CONFIRMED,
            payment_status=PaymentStatus.PAID
        )
        # Booking 2: Night 21 (21 to 22) -> 4 rooms booked (leaving 1)
        d_booking_2 = Booking(
            booking_code="DEMO-D-NIGHT2",
            customer_id=demo_guest.id,
            property_id=prop_d.id,
            check_in=date(2026, 10, 21),
            check_out=date(2026, 10, 22),
            guest_count=8,
            quantity=4,
            subtotal=11200.0,
            cleaning_fee=2000.0,
            tax=1584.0,
            discount=0.0,
            total=14784.0,
            status=BookingStatus.CONFIRMED,
            payment_status=PaymentStatus.PAID
        )
        db.add(d_booking_1)
        db.add(d_booking_2)
        print(f"Property D configured: ID {prop_d.id} ({prop_d.name}) - 5 rooms (Night 20: 3 left, Night 21: 1 left) -> Max bookable 1.")

        # -------------------------------------------------------------
        # Property E: All units blocked by the host -> Unavailable
        # -------------------------------------------------------------
        prop_e = get_or_create_prop(
            slug="demo-cottage-e-governor-hill",
            name="Demo Cottage E - Governor Hill Eco Cottages",
            ptype=PropertyType.COTTAGE,
            units=4,
            price=3500.0,
            guests=4,
            bedrooms=2
        )
        db.query(Booking).filter(
            Booking.property_id == prop_e.id,
            Booking.check_in < target_check_out,
            Booking.check_out > target_check_in
        ).delete()
        db.query(InventoryBlock).filter(
            InventoryBlock.property_id == prop_e.id,
            InventoryBlock.start_date <= target_check_out,
            InventoryBlock.end_date >= target_check_in
        ).delete()
        e_block = InventoryBlock(
            property_id=prop_e.id,
            start_date=date(2026, 10, 19),
            end_date=date(2026, 10, 23),
            blocked_units=4,
            reason="Scheduled resort renovation and deep sanitization"
        )
        db.add(e_block)
        print(f"Property E configured: ID {prop_e.id} ({prop_e.name}) - 4 units blocked by host -> Unavailable.")

        db.commit()
        print("All 5 Demonstration Properties successfully seeded!")
    except Exception as e:
        db.rollback()
        print("Error seeding demo data:", e)
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_availability_data()
