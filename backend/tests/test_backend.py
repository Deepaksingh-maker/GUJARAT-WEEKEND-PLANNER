import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.payment_service import payment_service

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_login_seeded_users():
    # 1. Admin login
    res_admin = client.post("/api/auth/login", json={
        "email": "admin@gujaratweekend.com",
        "password": "admin123"
    })
    assert res_admin.status_code == 200
    admin_data = res_admin.json()["data"]
    assert admin_data["user"]["role"] == "ADMIN"
    assert "access_token" in admin_data

    # 2. Host login
    res_host = client.post("/api/auth/login", json={
        "email": "host@gujaratweekend.com",
        "password": "password123"
    })
    assert res_host.status_code == 200
    assert res_host.json()["data"]["user"]["role"] == "HOST"

    # 3. Customer login
    res_cust = client.post("/api/auth/login", json={
        "email": "customer@gujaratweekend.com",
        "password": "password123"
    })
    assert res_cust.status_code == 200
    assert res_cust.json()["data"]["user"]["role"] == "CUSTOMER"

def test_locations_list():
    res = client.get("/api/locations")
    assert res.status_code == 200
    locations = res.json()["data"]
    assert len(locations) >= 5
    names = [loc["name"] for loc in locations]
    assert "Saputara" in names
    assert "Polo Forest" in names

def test_properties_search_and_filter():
    # Filter by Saputara
    res = client.get("/api/properties?location=saputara")
    assert res.status_code == 200
    props = res.json()["data"]
    assert len(props) >= 1
    assert "Saputara" in props[0]["name"] or props[0]["location"]["slug"] == "saputara"

def test_coupon_validation():
    res = client.post("/api/coupons/validate", json={
        "code": "GUJARAT10",
        "booking_amount": 5000.0
    })
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["valid"] is True
    assert data["discount_amount"] == 500.0

def test_end_to_end_booking_flow_and_double_booking_prevention():
    # 1. Customer login
    login_res = client.post("/api/auth/login", json={
        "email": "customer@gujaratweekend.com",
        "password": "password123"
    })
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get a verified property
    props_res = client.get("/api/properties")
    props = props_res.json()["data"]
    prop = props[0]
    prop_id = prop["id"]

    # Pick future dates with dynamic offset to avoid collision with previous runs
    import time
    offset = (int(time.time()) % 400) + 30
    check_in = date.today() + timedelta(days=offset)
    check_out = date.today() + timedelta(days=offset + 2)

    # 3. Check availability
    avail_res = client.post("/api/properties/check-availability", json={
        "property_id": prop_id,
        "check_in": str(check_in),
        "check_out": str(check_out),
        "guests": 2
    })
    assert avail_res.status_code == 200
    assert avail_res.json()["data"]["available"] is True

    # 4. Calculate price breakdown
    price_res = client.post("/api/bookings/calculate-price", json={
        "property_id": prop_id,
        "check_in": str(check_in),
        "check_out": str(check_out),
        "guest_count": 2,
        "coupon_code": "GUJARAT10",
        "activities": []
    })
    assert price_res.status_code == 200
    price_data = price_res.json()["data"]
    assert price_data["nights"] == 2
    assert price_data["discount"] > 0
    assert price_data["total"] > 0

    # 5. Create Booking
    booking_res = client.post("/api/bookings", json={
        "property_id": prop_id,
        "check_in": str(check_in),
        "check_out": str(check_out),
        "guest_count": 2,
        "coupon_code": "GUJARAT10",
        "special_requests": "Arriving around 2 PM by private car",
        "activities": []
    }, headers=headers)
    assert booking_res.status_code == 200
    booking = booking_res.json()["data"]
    booking_id = booking["id"]
    booking_code = booking["booking_code"]
    assert booking["status"] == "payment_pending"
    assert booking_code.startswith("GUJ-WKD-")

    # 6. CRITICAL TEST: Double Booking Prevention!
    # Second customer or same customer attempting to book same property on overlapping dates
    second_booking_res = client.post("/api/bookings", json={
        "property_id": prop_id,
        "check_in": str(check_in),
        "check_out": str(check_out),
        "guest_count": 2,
        "activities": []
    }, headers=headers)
    assert second_booking_res.status_code == 409
    assert "Conflict" in second_booking_res.json()["detail"]

    # 7. Payment Initiation
    init_res = client.post("/api/payments/initiate", json={
        "booking_id": booking_id
    }, headers=headers)
    assert init_res.status_code == 200
    pay_order = init_res.json()["data"]
    order_id = pay_order["order_id"]
    payment_id = f"pay_test_{booking_code}"

    # 8. Server-Side Payment Verification (using authentic HMAC signature)
    valid_signature = payment_service.generate_simulation_signature(order_id, payment_id)
    
    # Negative test: invalid signature fails
    fake_verify_res = client.post("/api/payments/verify", json={
        "booking_id": booking_id,
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": "tampered_fake_signature",
        "payment_method": "upi"
    }, headers=headers)
    assert fake_verify_res.status_code == 400

    # Positive test: valid signature succeeds
    verify_res = client.post("/api/payments/verify", json={
        "booking_id": booking_id,
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": valid_signature,
        "payment_method": "upi"
    }, headers=headers)
    assert verify_res.status_code == 200
    verified_data = verify_res.json()["data"]
    assert verified_data["status"] == "confirmed"
    assert verified_data["payment_status"] == "paid"

    # 9. Verify Booking Pass QR code
    pass_res = client.get(f"/api/bookings/{booking_id}", headers=headers)
    assert pass_res.status_code == 200
    pass_data = pass_res.json()["data"]
    assert pass_data["status"] == "confirmed"
    assert pass_data["qr_code_data"].startswith("data:image/png;base64,")

    # 10. Submit Review for Confirmed Booking
    rev_res = client.post("/api/reviews", json={
        "booking_id": booking_id,
        "property_id": prop_id,
        "rating": 5,
        "title": "Outstanding stay in Gujarat!",
        "comment": "The hospitality, cleanliness and surrounding views were absolutely breathtaking."
    }, headers=headers)
    assert rev_res.status_code == 200
    assert rev_res.json()["data"]["rating"] == 5

def test_unauthorized_review_prevention():
    # Customer tries to review a random booking they did not make
    login_res = client.post("/api/auth/login", json={
        "email": "customer@gujaratweekend.com",
        "password": "password123"
    })
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    rev_res = client.post("/api/reviews", json={
        "booking_id": 99999,
        "property_id": 1,
        "rating": 5,
        "comment": "Fake review attempt without booking"
    }, headers=headers)
    assert rev_res.status_code in [403, 404]

def test_weekend_planner():
    today = date.today()
    plan_res = client.post("/api/planner/generate", json={
        "destination": "Saputara",
        "date_start": str(today + timedelta(days=25)),
        "date_end": str(today + timedelta(days=27)),
        "guests": 2,
        "budget": 20000.0,
        "interest": "Nature"
    })
    assert plan_res.status_code == 200
    plans = plan_res.json()["data"]["generated_plans"]
    assert len(plans) >= 1
    assert "Saputara" in plans[0]["destination"]
    assert plans[0]["stay"] is not None

def test_property_image_url_creation_and_cover_selection():
    # 1. Login as Host
    host_login = client.post("/api/auth/login", json={
        "email": "host@gujaratweekend.com",
        "password": "password123"
    })
    assert host_login.status_code == 200
    host_token = host_login.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {host_token}"}

    # 2. Create property with multiple image URLs
    prop_res = client.post("/api/properties", json={
        "name": "Gir Forest Wildlife Estate",
        "description": "Luxurious stay surrounded by Gir teak forests and mango groves.",
        "property_type": "villa",
        "location_id": 3,
        "price_per_night": 9500.0,
        "cleaning_fee": 600.0,
        "max_guests": 6,
        "bedrooms": 3,
        "bathrooms": 3,
        "address": "Sasan Gir, Junagadh District, Gujarat",
        "amenity_ids": [1, 2, 3],
        "images": [
            {
                "image_url": "https://images.unsplash.com/photo-1587061949409-02df41d5e562",
                "caption": "Villa Exterior",
                "is_cover": False,
                "sort_order": 0
            },
            {
                "image_url": "https://images.unsplash.com/photo-1564013799919-ab600027ffc6",
                "caption": "Private Pool Deck",
                "is_cover": True,
                "sort_order": 1
            },
            {
                "image_url": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
                "caption": "Living Lounge",
                "is_cover": False,
                "sort_order": 2
            }
        ]
    }, headers=headers)
    assert prop_res.status_code == 200
    prop_data = prop_res.json()["data"]
    prop_id = prop_data["id"]
    images = prop_data["images"]

    # Verify multiple images stored
    assert len(images) == 3
    # Verify designated cover image
    covers = [img for img in images if img["is_cover"]]
    assert len(covers) == 1
    assert covers[0]["image_url"] == "https://images.unsplash.com/photo-1564013799919-ab600027ffc6"
    assert covers[0]["sort_order"] == 1

def test_property_image_crud_and_reordering():
    # 1. Login as Host
    host_login = client.post("/api/auth/login", json={
        "email": "host@gujaratweekend.com",
        "password": "password123"
    })
    token = host_login.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get a property owned by this host
    props_res = client.get("/api/host/properties", headers=headers)
    assert props_res.status_code == 200
    my_props = props_res.json()["data"]
    assert len(my_props) > 0
    prop_id = my_props[0]["id"]

    # Add a new image URL
    new_img_url = "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d"
    add_res = client.post(f"/api/properties/{prop_id}/images", json={
        "image_url": new_img_url,
        "caption": "Garden Pavilion",
        "is_cover": False,
        "sort_order": 5
    }, headers=headers)
    assert add_res.status_code == 200
    added_image = add_res.json()["data"]
    assert added_image["image_url"] == new_img_url
    image_id = added_image["id"]

    # Update image to become cover image
    patch_res = client.patch(f"/api/properties/{prop_id}/images/{image_id}", json={
        "is_cover": True,
        "sort_order": 0
    }, headers=headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["data"]["is_cover"] is True

    # Verify property API returns this as cover and others are not cover
    detail_res = client.get(f"/api/properties/{prop_id}")
    assert detail_res.status_code == 200
    updated_imgs = detail_res.json()["data"]["images"]
    covers = [img for img in updated_imgs if img["is_cover"]]
    assert len(covers) == 1
    assert covers[0]["id"] == image_id

    # Delete the image
    del_res = client.delete(f"/api/properties/{prop_id}/images/{image_id}", headers=headers)
    assert del_res.status_code == 200

    # Verify image was deleted and remaining images have a cover
    detail_res_after = client.get(f"/api/properties/{prop_id}")
    imgs_after = detail_res_after.json()["data"]["images"]
    assert not any(img["id"] == image_id for img in imgs_after)
    if len(imgs_after) > 0:
        assert any(img["is_cover"] for img in imgs_after)

def test_property_image_permissions_cross_host():
    # Login as Host 2 (Activity provider / adventure host)
    host2_login = client.post("/api/auth/login", json={
        "email": "host_adventure@gujaratweekend.com",
        "password": "password123"
    })
    token2 = host2_login.json()["data"]["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # Host 2 tries to modify Property 1 (owned by Host 1)
    forbidden_res = client.post("/api/properties/1/images", json={
        "image_url": "https://images.unsplash.com/photo-1580587771525-78b9dba3b914",
        "is_cover": False
    }, headers=headers2)
    assert forbidden_res.status_code == 403

def test_property_image_url_validation_and_dangerous_rejections():
    host_login = client.post("/api/auth/login", json={
        "email": "host@gujaratweekend.com",
        "password": "password123"
    })
    token = host_login.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Dangerous scheme: javascript:
    res_js = client.post("/api/properties/1/images", json={
        "image_url": "javascript:alert('xss')",
        "is_cover": False
    }, headers=headers)
    assert res_js.status_code == 400

    # 2. Dangerous scheme: data:
    res_data = client.post("/api/properties/1/images", json={
        "image_url": "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
        "is_cover": False
    }, headers=headers)
    assert res_data.status_code == 400

    # 3. Dangerous scheme: file:
    res_file = client.post("/api/properties/1/images", json={
        "image_url": "file:///etc/passwd",
        "is_cover": False
    }, headers=headers)
    assert res_file.status_code == 400

    # 4. Empty URL
    res_empty = client.post("/api/properties/1/images", json={
        "image_url": "",
        "is_cover": False
    }, headers=headers)
    assert res_empty.status_code == 400

    # 5. Google redirect URL auto-extraction
    google_url = "https://www.google.com/imgres?q=test&imgurl=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1542314831-068cd1dbfeeb"
    res_google = client.post("/api/properties/1/images", json={
        "image_url": google_url,
        "is_cover": False
    }, headers=headers)
    assert res_google.status_code == 200
    img_data = res_google.json()["data"]
    assert img_data["image_url"] == "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb"
    # Clean up
    client.delete(f"/api/properties/1/images/{img_data['id']}", headers=headers)

def test_forgot_and_reset_password_flow():
    # 1. Request forgot password for nonexistent user -> 404
    nonexistent_res = client.post("/api/auth/forgot-password", json={
        "email": "nobody_exists_12345@gujaratweekend.com"
    })
    assert nonexistent_res.status_code == 404

    # 2. Request for valid user -> 200
    res_forgot = client.post("/api/auth/forgot-password", json={
        "email": "customer@gujaratweekend.com"
    })
    assert res_forgot.status_code == 200
    forgot_data = res_forgot.json()["data"]
    code = forgot_data["code_preview"]
    assert len(code) == 6

    # 3. Verify invalid code -> 400
    res_invalid_code = client.post("/api/auth/verify-reset-code", json={
        "email": "customer@gujaratweekend.com",
        "code": "000000"
    })
    assert res_invalid_code.status_code == 400

    # 4. Verify valid code -> 200
    res_valid_code = client.post("/api/auth/verify-reset-code", json={
        "email": "customer@gujaratweekend.com",
        "code": code
    })
    assert res_valid_code.status_code == 200
    assert res_valid_code.json()["data"]["valid"] is True

    # 5. Reset password with new password
    res_reset = client.post("/api/auth/reset-password", json={
        "email": "customer@gujaratweekend.com",
        "code": code,
        "new_password": "brandnewpassword123"
    })
    assert res_reset.status_code == 200

    # 6. Verify login with new password
    res_login_new = client.post("/api/auth/login", json={
        "email": "customer@gujaratweekend.com",
        "password": "brandnewpassword123"
    })
    assert res_login_new.status_code == 200

    # 7. Restore original password
    res_restore_code = client.post("/api/auth/forgot-password", json={
        "email": "customer@gujaratweekend.com"
    })
    restore_code = res_restore_code.json()["data"]["code_preview"]
    res_restore = client.post("/api/auth/reset-password", json={
        "email": "customer@gujaratweekend.com",
        "code": restore_code,
        "new_password": "password123"
    })
    assert res_restore.status_code == 200

def test_notifications_and_chat_messaging_flow():
    # Login customer & host
    cust_res = client.post("/api/auth/login", json={
        "email": "customer@gujaratweekend.com",
        "password": "password123"
    })
    cust_token = cust_res.json()["data"]["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    host_res = client.post("/api/auth/login", json={
        "email": "host@gujaratweekend.com",
        "password": "password123"
    })
    host_token = host_res.json()["data"]["access_token"]
    host_id = host_res.json()["data"]["user"]["id"]
    host_headers = {"Authorization": f"Bearer {host_token}"}

    # 1. Fetch notifications
    notif_res = client.get("/api/notifications", headers=cust_headers)
    assert notif_res.status_code == 200
    assert "unread_count" in notif_res.json()["data"]

    # 2. Mark all notifications read
    read_all_res = client.put("/api/notifications/read-all", headers=cust_headers)
    assert read_all_res.status_code == 200

    # 3. Send message from customer to host
    send_res = client.post("/api/messages", json={
        "receiver_id": host_id,
        "property_id": 1,
        "message": "Hi Host! Is early check-in possible at 11am?"
    }, headers=cust_headers)
    assert send_res.status_code == 200
    msg_data = send_res.json()["data"]
    assert msg_data["message"] == "Hi Host! Is early check-in possible at 11am?"

    # 4. Fetch thread
    thread_res = client.get(f"/api/messages/thread?other_user_id={host_id}&property_id=1", headers=cust_headers)
    assert thread_res.status_code == 200
    msgs = thread_res.json()["data"]
    assert len(msgs) >= 1

    # 5. Fetch conversations
    conv_res = client.get("/api/messages/conversations", headers=cust_headers)
    assert conv_res.status_code == 200
    assert len(conv_res.json()["data"]) >= 1

def test_gujarat_only_location_search_acceptance():
    # 1. Acceptance test: Should return results for Gujarat locations
    allowed = [
        "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar",
        "Dwarka", "Somnath", "Saputara", "Sanand", "Bardoli",
        "Nadiad", "Mehsana", "Bhuj", "Jamnagar", "Junagadh"
    ]
    for loc in allowed:
        res = client.get(f"/api/locations/search?q={loc}")
        assert res.status_code == 200, f"Failed searching {loc}"
        data = res.json()["data"]
        assert len(data) > 0, f"Expected results for Gujarat location '{loc}'"
        for item in data:
            assert item["state"] == "Gujarat"
            assert item["country"] == "India"

    # 2. Acceptance test: Should return NO results for non-Gujarat locations
    blocked = [
        "Mumbai", "Pune", "Jaipur", "Udaipur", "Delhi",
        "Indore", "Bangalore", "Goa", "Hyderabad"
    ]
    for loc in blocked:
        res = client.get(f"/api/locations/search?q={loc}")
        assert res.status_code == 200
        data = res.json()["data"]
        assert len(data) == 0, f"Expected NO results for non-Gujarat location '{loc}', got {data}"
        assert res.json()["message"] == "No Gujarat locations found"

    # 3. Acceptance test: Case-insensitivity & whitespace normalization
    variants = ["ahmed", "AHMED", " Ahmedabad", "Ahmedabad", "sap", "Dwa", "som"]
    for q in variants:
        res = client.get(f"/api/locations/search?q={q}")
        assert res.status_code == 200
        data = res.json()["data"]
        assert len(data) > 0, f"Expected results for variant '{q}'"

    # 4. Search relevance order: Exact match -> Starts with -> Contains
    res = client.get("/api/locations/search?q=Ahmed")
    assert res.status_code == 200
    names = [d["name"] for d in res.json()["data"]]
    assert "Ahmedabad" in names
    assert "Ahmedabad District" in names
    assert "Ahmedabad Cantonment" in names

    # 5. Weekend Planner with Gujarat vs Non-Gujarat
    planner_good = client.post("/api/planner/generate", json={
        "destination": "Saputara",
        "date_start": "2026-10-10",
        "date_end": "2026-10-12",
        "guests": 2
    })
    assert planner_good.status_code == 200
    assert planner_good.json()["success"] is True

    planner_bad = client.post("/api/planner/generate", json={
        "destination": "Mumbai",
        "date_start": "2026-10-10",
        "date_end": "2026-10-12",
        "guests": 2
    })
    assert planner_bad.status_code == 400

    # 6. Property search strictly in Gujarat
    res_sap = client.get("/api/properties?location=saputara")
    assert res_sap.status_code == 200
    assert len(res_sap.json()["data"]) >= 1

    res_mum = client.get("/api/properties?location=mumbai")
    assert res_mum.status_code == 200
    assert len(res_mum.json()["data"]) == 0


