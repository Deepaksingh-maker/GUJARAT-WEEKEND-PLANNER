import pytest
import random
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import base64

from backend.app.main import app
from backend.app.database import get_db
from backend.app.models.booking import Booking, BookingStatus, PaymentStatus
from backend.app.models.property import Property
from backend.app.models.user import User, UserRole
from backend.app.services.qr_service import generate_booking_qr_code, generate_verification_token

client = TestClient(app)

def get_auth_headers(email: str, password: str = "password123"):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    token = res.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}

def get_test_property():
    res = client.get("/api/properties")
    assert res.status_code == 200
    data = res.json()["data"]
    props = data["items"] if isinstance(data, dict) and "items" in data else data
    for p in props:
        if p.get("total_units", 1) >= 2:
            return p
    return props[0]

def get_unique_future_dates(nights: int = 2):
    offset = random.randint(2000, 15000)
    c_in = date.today() + timedelta(days=offset)
    c_out = c_in + timedelta(days=nights)
    return c_in, c_out

def test_qr_generation_contains_url_not_raw_json():
    token = "gwk_testtoken1234567890"
    qr_data = generate_booking_qr_code(token)
    assert qr_data.startswith("data:image/png;base64,")
    
    prop = get_test_property()
    customer_headers = get_auth_headers("customer@gujaratweekend.com")
    c_in, c_out = get_unique_future_dates(2)
    booking_res = client.post("/api/bookings", json={
        "property_id": prop["id"],
        "check_in": c_in.isoformat(),
        "check_out": c_out.isoformat(),
        "guest_count": 2,
        "special_requests": "Sea view room"
    }, headers=customer_headers)
    assert booking_res.status_code == 200
    booking_data = booking_res.json()["data"]
    
    assert "verification_token" in booking_data
    v_token = booking_data["verification_token"]
    assert v_token is not None
    assert v_token.startswith("gwk_")
    assert booking_data["qr_code_data"].startswith("data:image/png;base64,")

def test_verify_pass_valid_confirmed_booking():
    prop = get_test_property()
    customer_headers = get_auth_headers("customer@gujaratweekend.com")
    
    # 1. Create booking
    c_in, c_out = get_unique_future_dates(3)
    res = client.post("/api/bookings", json={
        "property_id": prop["id"],
        "check_in": c_in.isoformat(),
        "check_out": c_out.isoformat(),
        "guest_count": 2
    }, headers=customer_headers)
    assert res.status_code == 200
    b_data = res.json()["data"]
    b_id = b_data["id"]
    v_token = b_data["verification_token"]
    b_code = b_data["booking_code"]

    # 2. Initiate and verify payment
    init_res = client.post("/api/payments/initiate", json={"booking_id": b_id}, headers=customer_headers)
    assert init_res.status_code == 200
    order_id = init_res.json()["data"]["order_id"]
    payment_id = f"pay_{b_code}"

    sim_res = client.post(
        f"/api/payments/generate-simulation-signature?order_id={order_id}&payment_id={payment_id}",
        headers=customer_headers
    )
    assert sim_res.status_code == 200
    sig = sim_res.json()["signature"]

    v_res = client.post("/api/payments/verify", json={
        "booking_id": b_id,
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": sig,
        "payment_method": "upi"
    }, headers=customer_headers)
    assert v_res.status_code == 200

    # 3. Public verification by token (no auth headers!)
    pass_res = client.get(f"/api/bookings/verify-pass/{v_token}")
    assert pass_res.status_code == 200
    pass_info = pass_res.json()["data"]
    
    assert pass_info["is_valid"] is True
    assert pass_info["status"] == "confirmed"
    assert pass_info["booking_code"] == b_code
    assert pass_info["guest_count"] == 2
    assert pass_info["nights"] == 3
    assert pass_info["is_checked_in"] is False
    assert pass_info["can_check_in"] is False  # unauthenticated viewer cannot check in
    assert pass_info["qr_code_data"].startswith("data:image/png;base64,")
    assert "booking-pass/verify" in pass_info["verification_url"]
    assert pass_info["property_name"] is not None

    # 4. Also verify lookup by booking code works
    code_res = client.get(f"/api/bookings/verify-pass/{b_code}")
    assert code_res.status_code == 200
    assert code_res.json()["data"]["booking_code"] == b_code

def test_verify_pass_pending_booking():
    prop = get_test_property()
    customer_headers = get_auth_headers("customer@gujaratweekend.com")
    c_in, c_out = get_unique_future_dates(2)
    res = client.post("/api/bookings", json={
        "property_id": prop["id"],
        "check_in": c_in.isoformat(),
        "check_out": c_out.isoformat(),
        "guest_count": 2
    }, headers=customer_headers)
    assert res.status_code == 200
    v_token = res.json()["data"]["verification_token"]

    pass_res = client.get(f"/api/bookings/verify-pass/{v_token}")
    assert pass_res.status_code == 200
    data = pass_res.json()["data"]
    assert data["is_valid"] is False
    assert data["status"] in ["pending", "payment_pending"]
    assert "Pending" in data["verification_message"]
    assert data["can_check_in"] is False

def test_verify_pass_cancelled_booking():
    prop = get_test_property()
    customer_headers = get_auth_headers("customer@gujaratweekend.com")
    c_in, c_out = get_unique_future_dates(2)
    res = client.post("/api/bookings", json={
        "property_id": prop["id"],
        "check_in": c_in.isoformat(),
        "check_out": c_out.isoformat(),
        "guest_count": 2
    }, headers=customer_headers)
    assert res.status_code == 200
    b_id = res.json()["data"]["id"]
    v_token = res.json()["data"]["verification_token"]

    # Cancel booking
    cancel_res = client.post(f"/api/bookings/{b_id}/cancel", json={
        "reason": "Change of weekend family schedule"
    }, headers=customer_headers)
    assert cancel_res.status_code == 200

    # Verify pass reflects cancelled status
    pass_res = client.get(f"/api/bookings/verify-pass/{v_token}")
    assert pass_res.status_code == 200
    data = pass_res.json()["data"]
    assert data["is_valid"] is False
    assert data["status"] == "cancelled"
    assert "Cancelled" in data["verification_message"]
    assert data["can_check_in"] is False

def test_verify_pass_invalid_token():
    res = client.get("/api/bookings/verify-pass/gwk_totally_non_existent_token_9999")
    assert res.status_code == 404
    assert "Invalid booking pass" in res.json()["detail"]

def test_host_check_in_flow_and_unauthorized_rejection():
    customer_headers = get_auth_headers("customer@gujaratweekend.com")
    host_headers = get_auth_headers("host@gujaratweekend.com")
    admin_headers = get_auth_headers("admin@gujaratweekend.com", "admin123")
    
    # 1. Create and confirm booking for property 1 (owned by host@gujaratweekend.com)
    c_in, c_out = get_unique_future_dates(2)
    b_res = client.post("/api/bookings", json={
        "property_id": 1,
        "check_in": c_in.isoformat(),
        "check_out": c_out.isoformat(),
        "guest_count": 2
    }, headers=customer_headers)
    assert b_res.status_code == 200
    b_id = b_res.json()["data"]["id"]
    v_token = b_res.json()["data"]["verification_token"]
    b_code = b_res.json()["data"]["booking_code"]

    init_res = client.post("/api/payments/initiate", json={"booking_id": b_id}, headers=customer_headers)
    assert init_res.status_code == 200
    order_id = init_res.json()["data"]["order_id"]
    payment_id = f"pay_{b_code}"

    sim_res = client.post(
        f"/api/payments/generate-simulation-signature?order_id={order_id}&payment_id={payment_id}",
        headers=customer_headers
    )
    sig = sim_res.json()["signature"]
    v_res = client.post("/api/payments/verify", json={
        "booking_id": b_id,
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": sig,
        "payment_method": "upi"
    }, headers=customer_headers)
    assert v_res.status_code == 200

    # 2. Verify with Host Auth: can_check_in should be True
    host_pass_res = client.get(f"/api/bookings/verify-pass/{v_token}", headers=host_headers)
    assert host_pass_res.status_code == 200
    assert host_pass_res.json()["data"]["can_check_in"] is True
    assert host_pass_res.json()["data"]["is_host_or_admin"] is True

    # 3. Attempt check-in by customer (Unauthorized!)
    unauth_checkin = client.post(f"/api/bookings/{v_token}/check-in", headers=customer_headers)
    assert unauth_checkin.status_code == 403
    assert "Unauthorized" in unauth_checkin.json()["detail"]

    # 4. Successful check-in by authorized Host
    checkin_res = client.post(f"/api/bookings/{v_token}/check-in", headers=host_headers)
    assert checkin_res.status_code == 200
    assert checkin_res.json()["data"]["is_checked_in"] is True
    assert checkin_res.json()["data"]["checked_in_by"] is not None

    # 5. Repeated check-in attempt should fail gracefully
    repeat_res = client.post(f"/api/bookings/{v_token}/check-in", headers=host_headers)
    assert repeat_res.status_code == 400
    assert "already been checked in" in repeat_res.json()["detail"]

    # 6. Verify pass now shows checked-in status
    pass_res = client.get(f"/api/bookings/verify-pass/{v_token}")
    assert pass_res.status_code == 200
    data = pass_res.json()["data"]
    assert data["is_checked_in"] is True
    assert data["checked_in_at"] is not None
    assert "Already Checked In" in data["verification_message"]
    assert data["can_check_in"] is False
