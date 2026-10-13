import httpx
import json
import sys
import datetime

BASE_URL = "http://127.0.0.1:8000/api"

def login(client, email, password):
    res = client.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if res.status_code != 200:
        raise Exception(f"Login failed for {email}: {res.text}")
    data = res.json()
    token = data["data"]["access_token"]
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    return headers, data["data"]["user"]

def main():
    print("=" * 70)
    print("STARTING CONTROLLED CONTACT & ANTI-BYPASS VERIFICATION TEST SUITE")
    print("=" * 70)
    passed = 0
    total = 10

    client = httpx.Client(timeout=30.0)

    # Log in test accounts
    admin_headers, admin_user = login(client, "admin@gujaratweekend.com", "admin123")
    host_headers, host_user = login(client, "host@gujaratweekend.com", "password123")
    guest_headers, guest_user = login(client, "customer@gujaratweekend.com", "password123")

    # Ensure admin has strict mode enabled
    client.post(f"{BASE_URL}/contacts/admin/settings", headers=admin_headers, json={"mode": "strict"})

    # Fetch a property
    props_res = client.get(f"{BASE_URL}/properties")
    props = props_res.json().get("data", [])
    if not props:
        print("FAIL: No properties found in DB")
        sys.exit(1)
    prop = props[0]
    prop_id = prop["id"]

    # -------------------------------------------------------------
    # Scenario 1: Guest views property -> WhatsApp & direct phone hidden
    # -------------------------------------------------------------
    print("\n[TEST 1] Guest views property -> Host contact details must be hidden on public endpoint...")
    p_res = client.get(f"{BASE_URL}/properties/{prop_id}")
    p_data = p_res.json()["data"]
    host_info = p_data.get("host", {})
    if host_info.get("phone") is None:
        print("  PASS: Host phone is strictly masked (None) on public property endpoint.")
        passed += 1
    else:
        print(f"  FAIL: Host phone leaked on public endpoint: {host_info.get('phone')}")

    # -------------------------------------------------------------
    # Scenario 2: Guest sends message -> internal chat works for normal inquiry
    # -------------------------------------------------------------
    print("\n[TEST 2] Guest sends normal message -> internal chat works...")
    msg_res = client.post(
        f"{BASE_URL}/messages",
        headers=guest_headers,
        json={
            "receiver_id": host_user["id"],
            "property_id": prop_id,
            "message": "Hello, is early check-in possible on Saturday?"
        }
    )
    if msg_res.status_code == 200 and msg_res.json().get("success"):
        print("  PASS: Normal message successfully sent through platform chat.")
        passed += 1
    else:
        print(f"  FAIL: Normal message failed: {msg_res.text}")

    # -------------------------------------------------------------
    # Scenario 3: Guest tries to send phone number -> blocked by strict shield
    # -------------------------------------------------------------
    print("\n[TEST 3] Guest tries to send phone number -> blocked with anti-bypass notice...")
    msg_phone_res = client.post(
        f"{BASE_URL}/messages",
        headers=guest_headers,
        json={
            "receiver_id": host_user["id"],
            "property_id": prop_id,
            "message": "Call me on 9876543210 to discuss discount"
        }
    )
    if msg_phone_res.status_code == 400 and "Direct contact information cannot be shared before the booking is confirmed" in msg_phone_res.text:
        print("  PASS: Phone number attempt was rejected with 400 and exact security notice.")
        passed += 1
    else:
        print(f"  FAIL: Phone number was not blocked properly: Status={msg_phone_res.status_code}, Body={msg_phone_res.text}")

    # -------------------------------------------------------------
    # Scenario 4: Guest creates pending booking -> WhatsApp remains locked
    # -------------------------------------------------------------
    print("\n[TEST 4] Guest creates pending booking -> WhatsApp remains locked...")
    today = datetime.date.today()
    check_in = (today + datetime.timedelta(days=15)).isoformat()
    check_out = (today + datetime.timedelta(days=17)).isoformat()

    booking_req = {
        "property_id": prop_id,
        "check_in": check_in,
        "check_out": check_out,
        "guest_count": 2,
        "special_requests": "Quiet room please"
    }
    b_res = client.post(f"{BASE_URL}/bookings", headers=guest_headers, json=booking_req)
    if b_res.status_code != 200:
        check_in = (today + datetime.timedelta(days=45)).isoformat()
        check_out = (today + datetime.timedelta(days=47)).isoformat()
        booking_req["check_in"] = check_in
        booking_req["check_out"] = check_out
        b_res = client.post(f"{BASE_URL}/bookings", headers=guest_headers, json=booking_req)

    booking_data = b_res.json()["data"]
    booking_id = booking_data["id"]
    booking_code = booking_data["booking_code"]

    b_detail = client.get(f"{BASE_URL}/bookings/{booking_id}", headers=guest_headers).json()["data"]
    c_access_res = client.get(f"{BASE_URL}/contacts/booking/{booking_id}", headers=guest_headers)

    if b_detail.get("contact_unlocked") is False and c_access_res.status_code == 403:
        print("  PASS: Pending booking has contact_unlocked=False and /contacts/booking returns 403 Forbidden.")
        passed += 1
    else:
        print(f"  FAIL: Contact unlocked prematurely! contact_unlocked={b_detail.get('contact_unlocked')}, code={c_access_res.status_code}")

    # -------------------------------------------------------------
    # Scenario 5: Payment fails or remains unpaid -> WhatsApp remains locked
    # -------------------------------------------------------------
    print("\n[TEST 5] Unpaid booking -> WhatsApp remains locked...")
    c_access_res_unpaid = client.get(f"{BASE_URL}/contacts/booking/{booking_code}", headers=guest_headers)
    if c_access_res_unpaid.status_code == 403 and "Direct contact is locked" in c_access_res_unpaid.text:
        print("  PASS: Unpaid booking status correctly prevents contact unlock.")
        passed += 1
    else:
        print(f"  FAIL: Unpaid check failed: {c_access_res_unpaid.text}")

    # -------------------------------------------------------------
    # Scenario 6: Booking confirmed + payment paid -> WhatsApp unlocks
    # -------------------------------------------------------------
    print("\n[TEST 6] Booking confirmed + payment paid -> WhatsApp & Call unlock...")
    init_res = client.post(f"{BASE_URL}/payments/initiate", headers=guest_headers, json={"booking_id": booking_id})
    order_id = init_res.json()["data"]["order_id"]
    sim_pay_id = f"pay_test_{booking_id}"
    sig_res = client.post(f"{BASE_URL}/payments/generate-simulation-signature?order_id={order_id}&payment_id={sim_pay_id}", headers=guest_headers)
    signature = sig_res.json()["signature"]

    verify_res = client.post(
        f"{BASE_URL}/payments/verify",
        headers=guest_headers,
        json={
            "booking_id": booking_id,
            "razorpay_order_id": order_id,
            "razorpay_payment_id": sim_pay_id,
            "razorpay_signature": signature,
            "payment_method": "upi"
        }
    )

    c_unlocked_res = client.get(f"{BASE_URL}/contacts/booking/{booking_id}", headers=guest_headers)
    if c_unlocked_res.status_code == 200:
        c_unlocked_data = c_unlocked_res.json()["data"]
        wa_url = c_unlocked_data.get("whatsapp_url")
        call_url = c_unlocked_data.get("call_url")
        prefilled = c_unlocked_data.get("prefilled_message")
        if wa_url and "wa.me" in wa_url and call_url and "tel:" in call_url:
            print(f"  PASS: Contact unlocked! WhatsApp URL: {wa_url[:50]}... Prefilled msg contains booking ref: {booking_code in prefilled}")
            passed += 1
        else:
            print(f"  FAIL: Incomplete contact unlock data: {c_unlocked_data}")
    else:
        print(f"  FAIL: Contact failed to unlock after payment: {c_unlocked_res.text}")

    # -------------------------------------------------------------
    # Scenario 7: Booking cancelled -> WhatsApp locks again
    # -------------------------------------------------------------
    print("\n[TEST 7] Booking cancelled -> WhatsApp locks again...")
    cancel_res = client.post(
        f"{BASE_URL}/bookings/{booking_id}/cancel",
        headers=guest_headers,
        json={"reason": "Change of travel plans"}
    )
    c_relocked_res = client.get(f"{BASE_URL}/contacts/booking/{booking_id}", headers=guest_headers)
    if c_relocked_res.status_code == 403:
        print("  PASS: Cancelled booking immediately revoked contact access (403 Forbidden).")
        passed += 1
    else:
        print(f"  FAIL: Cancelled booking did not revoke contact: {c_relocked_res.text}")

    # -------------------------------------------------------------
    # Scenario 8: Guest tries API manipulation -> backend denies access
    # -------------------------------------------------------------
    print("\n[TEST 8] Guest tries API manipulation for unauthorized/unconfirmed booking...")
    guest2_headers, guest2_user = login(client, "bagheldeepak5400@gmail.com", "deepak2006")
    tamper_res = client.get(f"{BASE_URL}/contacts/booking/{booking_id}", headers=guest2_headers)
    if tamper_res.status_code == 403:
        print("  PASS: API manipulation by unauthorized user blocked with 403 Forbidden.")
        passed += 1
    else:
        print(f"  FAIL: API manipulation was not blocked: {tamper_res.status_code}")

    # -------------------------------------------------------------
    # Scenario 9: Host tries to expose contact details in chat -> system blocks/masks
    # -------------------------------------------------------------
    print("\n[TEST 9] Host tries to expose contact details before booking -> blocked by shield...")
    host_bypass_res = client.post(
        f"{BASE_URL}/messages",
        headers=host_headers,
        json={
            "receiver_id": guest_user["id"],
            "property_id": prop_id,
            "message": "Message me directly on WhatsApp at 9898012345 for a cheaper deal"
        }
    )
    if host_bypass_res.status_code == 400 and "Direct contact information cannot be shared" in host_bypass_res.text:
        print("  PASS: Host circumvention attempt blocked by shield with 400 error.")
        passed += 1
    else:
        print(f"  FAIL: Host circumvention was not blocked: {host_bypass_res.status_code}, {host_bypass_res.text}")

    # -------------------------------------------------------------
    # Scenario 10: Existing booking functionality continues working
    # -------------------------------------------------------------
    print("\n[TEST 10] Existing booking system & property searches continue working...")
    search_res = client.get(f"{BASE_URL}/properties?location_name=Ahmedabad")
    my_bookings_res = client.get(f"{BASE_URL}/bookings", headers=guest_headers)
    host_dash_res = client.get(f"{BASE_URL}/host/dashboard", headers=host_headers)
    admin_logs_res = client.get(f"{BASE_URL}/contacts/admin/logs", headers=admin_headers)

    if (search_res.status_code == 200 and 
        my_bookings_res.status_code == 200 and 
        host_dash_res.status_code == 200 and 
        admin_logs_res.status_code == 200):
        print("  PASS: Search, My Bookings, Host Dashboard, and Admin Logs all functional and intact.")
        passed += 1
    else:
        print(f"  FAIL: One or more existing endpoints failed: search={search_res.status_code}, bookings={my_bookings_res.status_code}, host={host_dash_res.status_code}, admin={admin_logs_res.status_code}")

    print("\n" + "=" * 70)
    print(f"TEST RESULTS: {passed}/{total} SCENARIOS PASSED")
    print("=" * 70)
    if passed == total:
        print("ALL 10 VERIFICATION SCENARIOS PASSED WITH ZERO ERRORS!")
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
