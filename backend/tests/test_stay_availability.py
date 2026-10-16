import uuid
import pytest
from datetime import date, datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import app
from backend.app.database import get_db, SessionLocal
from backend.app.models.user import User, UserRole
from backend.app.models.host import Host, HostType, VerificationStatus as HostVerification
from backend.app.models.location import Location
from backend.app.models.property import Property, PropertyType, ApprovalStatus, InventoryBlock
from backend.app.models.booking import Booking, BookingStatus, PaymentStatus
from backend.app.services.availability_service import availability_service
from backend.app.services.booking_service import booking_service
from backend.app.schemas.booking import BookingCreateRequest

client = TestClient(app)

@pytest.fixture(scope="function")
def db():
    db_session = SessionLocal()
    try:
        yield db_session
    finally:
        db_session.rollback()
        db_session.close()

@pytest.fixture(scope="function")
def setup_demo_data(db: Session):
    from backend.seed.seed_availability_demo import seed_demo_availability_data
    seed_demo_availability_data()
    
    prop_a = db.query(Property).filter(Property.slug == "demo-villa-a-serene-valley").first()
    prop_b = db.query(Property).filter(Property.slug == "demo-villa-b-sunset-hilltop").first()
    prop_c = db.query(Property).filter(Property.slug == "demo-resort-c-saputara-pines").first()
    prop_d = db.query(Property).filter(Property.slug == "demo-hotel-d-dangs-forest").first()
    prop_e = db.query(Property).filter(Property.slug == "demo-cottage-e-governor-hill").first()
    demo_host = db.query(User).filter(User.email == "demohost.saputara@gujaratstays.test").first()
    demo_guest = db.query(User).filter(User.email == "demoguest@gujaratstays.test").first()

    return {
        "prop_a": prop_a,
        "prop_b": prop_b,
        "prop_c": prop_c,
        "prop_d": prop_d,
        "prop_e": prop_e,
        "demo_host": demo_host,
        "demo_guest": demo_guest
    }

# -------------------------------------------------------------
# Scenario 1: Search without dates -> returns select_dates status
# -------------------------------------------------------------
def test_scenario_01_search_without_dates(setup_demo_data):
    response = client.get("/api/properties/search?destination=Saputara")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) > 0
    # Every property returned without dates has availability_status == 'select_dates'
    for prop in data["data"]:
        assert prop["availability_status"] == "select_dates"

# -------------------------------------------------------------
# Scenario 2: Search with valid dates (filters bookable by default, include_unavailable optional)
# -------------------------------------------------------------
def test_scenario_02_search_with_valid_dates(setup_demo_data):
    # Default: only bookable properties returned
    response = client.get(
        "/api/properties/search?destination=Saputara&check_in=2026-10-20&check_out=2026-10-22&guests=2&quantity=1"
    )
    assert response.status_code == 200
    data = response.json()
    returned_slugs = [p["slug"] for p in data["data"]]
    # Prop A (Available), Prop C (3 left), Prop D (1 left) are bookable
    assert "demo-villa-a-serene-valley" in returned_slugs
    assert "demo-resort-c-saputara-pines" in returned_slugs
    assert "demo-hotel-d-dangs-forest" in returned_slugs
    # Prop B (Sold out) and Prop E (Blocked) are filtered out by default
    assert "demo-villa-b-sunset-hilltop" not in returned_slugs
    assert "demo-cottage-e-governor-hill" not in returned_slugs

    # With include_unavailable=true
    resp_all = client.get(
        "/api/properties/search?destination=Saputara&check_in=2026-10-20&check_out=2026-10-22&guests=2&quantity=1&include_unavailable=true"
    )
    assert resp_all.status_code == 200
    all_data = {p["slug"]: p for p in resp_all.json()["data"]}
    assert all_data["demo-villa-a-serene-valley"]["availability_status"] == "available"
    assert all_data["demo-villa-b-sunset-hilltop"]["availability_status"] == "sold_out"
    assert all_data["demo-resort-c-saputara-pines"]["availability_status"] == "limited_availability"
    assert all_data["demo-hotel-d-dangs-forest"]["availability_status"] == "limited_availability"
    assert all_data["demo-cottage-e-governor-hill"]["availability_status"] == "unavailable"

# -------------------------------------------------------------
# Scenario 3: Search with invalid dates (past dates, checkout <= checkin, negative guests)
# -------------------------------------------------------------
def test_scenario_03_search_with_invalid_dates():
    # Past check-in
    r1 = client.get("/api/properties/search?check_in=2020-01-01&check_out=2020-01-05")
    assert r1.status_code == 400
    assert "past" in r1.json()["detail"].lower()

    # Check-out before check-in
    r2 = client.get("/api/properties/search?check_in=2026-10-25&check_out=2026-10-20")
    assert r2.status_code == 400
    assert "strictly after" in r2.json()["detail"].lower()

    # Zero or negative guests
    r3 = client.get("/api/properties/search?check_in=2026-10-20&check_out=2026-10-22&guests=0")
    assert r3.status_code in [400, 422]

# -------------------------------------------------------------
# Scenario 4: One-night and multi-night stays
# -------------------------------------------------------------
def test_scenario_04_one_night_and_multi_night(setup_demo_data, db: Session):
    prop_a = setup_demo_data["prop_a"]
    # 1 night
    res_1 = availability_service.calculate_property_availability(
        db, prop_a.id, date(2026, 11, 1), date(2026, 11, 2)
    )
    assert res_1["is_available"] is True
    assert len(res_1["requested_dates"]) == 1
    assert res_1["stay_price"] == 4500.0

    # 3 nights
    res_3 = availability_service.calculate_property_availability(
        db, prop_a.id, date(2026, 11, 1), date(2026, 11, 4)
    )
    assert res_3["is_available"] is True
    assert len(res_3["requested_dates"]) == 3
    assert res_3["stay_price"] == 4500.0 * 3

# -------------------------------------------------------------
# Scenario 5: Check-in on the same day another guest checks out
# -------------------------------------------------------------
def test_scenario_05_checkin_on_same_day_checkout(setup_demo_data, db: Session):
    # Prop B has booking: 2026-10-20 to 2026-10-22
    # Another guest checking in on 2026-10-22 to 2026-10-25 MUST be available
    prop_b = setup_demo_data["prop_b"]
    res = availability_service.calculate_property_availability(
        db, prop_b.id, date(2026, 10, 22), date(2026, 10, 25), guest_count=2, quantity=1
    )
    assert res["is_available"] is True
    assert res["availability_status"] == "available"
    assert res["available_units"] == 1

# -------------------------------------------------------------
# Scenario 6: Fully booked villas
# -------------------------------------------------------------
def test_scenario_06_fully_booked_villa(setup_demo_data, db: Session):
    prop_b = setup_demo_data["prop_b"]
    # Prop B is booked for 20-22 Oct
    res = availability_service.calculate_property_availability(
        db, prop_b.id, date(2026, 10, 20), date(2026, 10, 22), guest_count=2, quantity=1
    )
    assert res["is_available"] is False
    assert res["availability_status"] == "sold_out"
    assert res["available_units"] == 0

# -------------------------------------------------------------
# Scenario 7: Partially available resorts (10 rooms, 7 booked -> 3 left)
# -------------------------------------------------------------
def test_scenario_07_partially_available_resort(setup_demo_data, db: Session):
    prop_c = setup_demo_data["prop_c"]
    res = availability_service.calculate_property_availability(
        db, prop_c.id, date(2026, 10, 20), date(2026, 10, 22), guest_count=2, quantity=1
    )
    assert res["is_available"] is True
    assert res["availability_status"] == "limited_availability"
    assert res["available_units"] == 3
    assert "Only 3 rooms left" in res["message"]

# -------------------------------------------------------------
# Scenario 8: Host-blocked dates -> Unavailable
# -------------------------------------------------------------
def test_scenario_08_host_blocked_dates(setup_demo_data, db: Session):
    prop_e = setup_demo_data["prop_e"]
    res = availability_service.calculate_property_availability(
        db, prop_e.id, date(2026, 10, 20), date(2026, 10, 22), guest_count=2, quantity=1
    )
    assert res["is_available"] is False
    assert res["availability_status"] == "unavailable"
    assert res["available_units"] == 0
    assert "blocked by the host" in res["message"]

# -------------------------------------------------------------
# Scenario 9: Cancelled bookings release inventory immediately
# -------------------------------------------------------------
def test_scenario_09_cancelled_booking_releases_inventory(setup_demo_data, db: Session):
    prop_a = setup_demo_data["prop_a"]
    demo_guest = setup_demo_data["demo_guest"]
    
    # Clean up any existing bookings for these test dates
    db.query(Booking).filter(
        Booking.property_id == prop_a.id,
        Booking.check_in == date(2026, 11, 10),
        Booking.check_out == date(2026, 11, 12)
    ).delete()
    db.commit()

    code = f"TEST-CANCEL-{uuid.uuid4().hex[:6]}"
    booking = Booking(
        booking_code=code,
        customer_id=demo_guest.id,
        property_id=prop_a.id,
        check_in=date(2026, 11, 10),
        check_out=date(2026, 11, 12),
        guest_count=2,
        quantity=1,
        status=BookingStatus.CONFIRMED,
        payment_status=PaymentStatus.PAID
    )
    db.add(booking)
    db.commit()

    # Now verify it's sold out
    chk1 = availability_service.calculate_property_availability(
        db, prop_a.id, date(2026, 11, 10), date(2026, 11, 12)
    )
    assert chk1["is_available"] is False

    # Cancel booking
    booking_service.cancel_booking(db, booking, reason="Guest requested refund")

    # Now verify it's available again!
    chk2 = availability_service.calculate_property_availability(
        db, prop_a.id, date(2026, 11, 10), date(2026, 11, 12)
    )
    assert chk2["is_available"] is True
    assert chk2["available_units"] == 1

# -------------------------------------------------------------
# Scenario 10: Expired payment holds automatically stop blocking
# -------------------------------------------------------------
def test_scenario_10_expired_payment_holds(setup_demo_data, db: Session):
    prop_a = setup_demo_data["prop_a"]
    demo_guest = setup_demo_data["demo_guest"]

    # Clean up any existing bookings for these test dates
    db.query(Booking).filter(
        Booking.property_id == prop_a.id,
        Booking.check_in == date(2026, 11, 20),
        Booking.check_out == date(2026, 11, 22)
    ).delete()
    db.commit()

    code = f"TEST-HOLD-{uuid.uuid4().hex[:6]}"
    past_expiry = datetime.now(timezone.utc) - timedelta(hours=2)
    stale_booking = Booking(
        booking_code=code,
        customer_id=demo_guest.id,
        property_id=prop_a.id,
        check_in=date(2026, 11, 20),
        check_out=date(2026, 11, 22),
        guest_count=2,
        quantity=1,
        status=BookingStatus.PAYMENT_PENDING,
        payment_status=PaymentStatus.UNPAID,
        hold_expires_at=past_expiry
    )
    db.add(stale_booking)
    db.commit()

    # Checking availability must treat expired hold as unblocking and expire it
    chk = availability_service.calculate_property_availability(
        db, prop_a.id, date(2026, 11, 20), date(2026, 11, 22)
    )
    assert chk["is_available"] is True
    assert chk["available_units"] == 1
    
    # Confirm booking was transitioned to EXPIRED
    db.refresh(stale_booking)
    assert stale_booking.status == BookingStatus.EXPIRED

# -------------------------------------------------------------
# Scenario 11: Two guests booking the same villa simultaneously
# -------------------------------------------------------------
def test_scenario_11_simultaneous_double_booking_prevention(setup_demo_data, db: Session):
    prop_a = setup_demo_data["prop_a"]
    demo_guest = setup_demo_data["demo_guest"]

    # Clear target dates on Prop A for 2026-12-01 to 2026-12-03
    db.query(Booking).filter(
        Booking.property_id == prop_a.id,
        Booking.check_in < date(2026, 12, 3),
        Booking.check_out > date(2026, 12, 1)
    ).delete()
    db.commit()

    req = BookingCreateRequest(
        property_id=prop_a.id,
        check_in=date(2026, 12, 1),
        check_out=date(2026, 12, 3),
        guest_count=2,
        quantity=1
    )

    # Guest 1 books successfully
    b1 = booking_service.create_booking(db, demo_guest, req)
    assert b1.id is not None
    assert b1.status == BookingStatus.PAYMENT_PENDING

    # Guest 2 attempts to book overlapping dates simultaneously -> must be rejected with 409
    with pytest.raises(Exception) as exc_info:
        booking_service.create_booking(db, demo_guest, req)
    
    assert "409" in str(exc_info.value) or "no longer available" in str(exc_info.value)

# -------------------------------------------------------------
# Scenario 12: A guest attempting to book more rooms than are available
# -------------------------------------------------------------
def test_scenario_12_book_more_rooms_than_available(setup_demo_data, db: Session):
    # Prop C has 3 rooms left for 20-22 Oct
    prop_c = setup_demo_data["prop_c"]
    demo_guest = setup_demo_data["demo_guest"]

    req_too_many = BookingCreateRequest(
        property_id=prop_c.id,
        check_in=date(2026, 10, 20),
        check_out=date(2026, 10, 22),
        guest_count=4,
        quantity=4  # Only 3 rooms available!
    )
    with pytest.raises(Exception) as exc_info:
        booking_service.create_booking(db, demo_guest, req_too_many)
    
    assert "409" in str(exc_info.value) or "no longer available" in str(exc_info.value)

# -------------------------------------------------------------
# Scenario 13: A guest attempting to exceed maximum capacity
# -------------------------------------------------------------
def test_scenario_13_guest_exceeding_max_capacity(setup_demo_data, db: Session):
    # Prop A max guests is 6
    prop_a = setup_demo_data["prop_a"]
    demo_guest = setup_demo_data["demo_guest"]

    req_over_capacity = BookingCreateRequest(
        property_id=prop_a.id,
        check_in=date(2026, 12, 10),
        check_out=date(2026, 12, 12),
        guest_count=12,  # max is 6
        quantity=1
    )
    with pytest.raises(Exception) as exc_info:
        booking_service.create_booking(db, demo_guest, req_over_capacity)
    assert "409" in str(exc_info.value) or "capacity" in str(exc_info.value).lower() or "no longer available" in str(exc_info.value)

# -------------------------------------------------------------
# Scenario 14: Unauthorized host attempting to edit another host's inventory
# -------------------------------------------------------------
def test_scenario_14_unauthorized_host_inventory_access(setup_demo_data, db: Session):
    prop_a = setup_demo_data["prop_a"]
    
    # Create another host
    unauth_user = db.query(User).filter(User.email == "otherhost@gujaratstays.test").first()
    if not unauth_user:
        unauth_user = User(
            email="otherhost@gujaratstays.test",
            hashed_password="pw",
            full_name="Other Host",
            role=UserRole.HOST,
            is_active=True
        )
        db.add(unauth_user)
        db.flush()
        other_h = Host(
            user_id=unauth_user.id,
            business_name="Other Properties",
            host_type=HostType.VILLA_OWNER,
            verification_status=HostVerification.VERIFIED
        )
        db.add(other_h)
        db.commit()

    # Attempt to block dates on Prop A (owned by demo_host, not unauth_user)
    from backend.app.schemas.property import InventoryBlockCreate
    from backend.app.routes.host import create_inventory_block
    from fastapi import HTTPException

    block_req = InventoryBlockCreate(
        property_id=prop_a.id,
        start_date=date(2026, 12, 15),
        end_date=date(2026, 12, 18),
        blocked_units=1,
        reason="Malicious or unauthorized block"
    )

    with pytest.raises(HTTPException) as exc_info:
        create_inventory_block(block_req, current_user=unauth_user, db=db)
    
    assert exc_info.value.status_code == 403

# -------------------------------------------------------------
# Scenario 15: Availability changing between search and checkout
# -------------------------------------------------------------
def test_scenario_15_availability_changed_before_confirmation(setup_demo_data, db: Session):
    prop_a = setup_demo_data["prop_a"]
    demo_guest = setup_demo_data["demo_guest"]

    # Target dates
    cin = date(2026, 12, 20)
    cout = date(2026, 12, 22)

    # Clean dates
    db.query(Booking).filter(
        Booking.property_id == prop_a.id,
        Booking.check_in < cout,
        Booking.check_out > cin
    ).delete()
    db.commit()

    # Guest 1 creates pending booking
    req1 = BookingCreateRequest(
        property_id=prop_a.id,
        check_in=cin,
        check_out=cout,
        guest_count=2,
        quantity=1
    )
    b1 = booking_service.create_booking(db, demo_guest, req1)

    # In the meantime, another booking is confirmed on those dates
    # (e.g. offline reservation or host confirmed booking)
    code = f"INTERVENE-{uuid.uuid4().hex[:6]}"
    intervening_booking = Booking(
        booking_code=code,
        customer_id=demo_guest.id,
        property_id=prop_a.id,
        check_in=cin,
        check_out=cout,
        guest_count=2,
        quantity=1,
        status=BookingStatus.CONFIRMED,
        payment_status=PaymentStatus.PAID
    )
    db.add(intervening_booking)
    db.commit()

    # Now Guest 1 tries to confirm payment for b1
    # confirm_payment_and_booking must re-validate, detect conflict, and raise 409
    with pytest.raises(Exception) as exc_info:
        booking_service.confirm_payment_and_booking(
            db=db,
            booking=b1,
            order_id="order_123",
            transaction_id="txn_123",
            signature="sig_123"
        )

    assert "409" in str(exc_info.value) or "no longer available" in str(exc_info.value)
