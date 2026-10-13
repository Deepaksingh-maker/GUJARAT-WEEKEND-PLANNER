import urllib.request
import urllib.parse
import json
import sys

BASE = 'http://127.0.0.1:8000/api'

def get_json(url):
    req = urllib.request.Request(url, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def post_json(url, payload, token=None):
    data = json.dumps(payload).encode('utf-8')
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def run_tests():
    print("=" * 60)
    print("1. SEARCH TESTS FOR GUJARAT LOCATIONS")
    print("=" * 60)
    search_targets = [
        'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 
        'Dwarka', 'Somnath', 'Saputara', 'Bhuj', 
        'Ekta Nagar', 'Patan', 'Bhavnagar', 'Jamnagar',
        'Junagadh', 'Gandhinagar', 'Anand', 'Nadiad',
        'Valsad', 'Bharuch', 'Porbandar', 'Sasan Gir'
    ]

    for target in search_targets:
        url = f'{BASE}/properties?location={urllib.parse.quote(target)}'
        data = get_json(url)
        props = data.get('data', [])
        print(f"Location '{target}': {len(props)} properties found.")
        assert len(props) > 0, f"Expected properties for {target}"

    print("\n" + "=" * 60)
    print("2. NON-GUJARAT REJECTION TESTS")
    print("=" * 60)
    non_gujarat = ['Mumbai', 'Delhi', 'Jaipur', 'Goa', 'Bangalore', 'Pune', 'Udaipur']
    for outside in non_gujarat:
        url = f'{BASE}/properties?location={urllib.parse.quote(outside)}'
        data = get_json(url)
        props = data.get('data', [])
        print(f"Non-Gujarat query '{outside}': {len(props)} properties returned.")
        assert len(props) == 0, f"Expected 0 properties for {outside}!"

    print("\n" + "=" * 60)
    print("3. PROPERTY DETAILS & METADATA VERIFICATION")
    print("=" * 60)
    dwarka_props = get_json(f'{BASE}/properties?location=Dwarka')['data']
    sample = dwarka_props[0]
    print(f"Property Name: {sample['name']}")
    print(f"Type: {sample['property_type']}")
    print(f"Location: {sample['location']['name']}, {sample['location']['district']}, {sample['location']['state']}")
    print(f"Nightly Price: INR {sample['price_per_night']}")
    print(f"Images count: {len(sample['images'])} (Primary: {sample['images'][0]['image_url'] if sample['images'] else 'None'})")
    print(f"Amenities: {[a['name'] for a in sample['amenities_list']]}")
    print(f"Data Source: {sample.get('data_source')}")
    print(f"Source URL: {sample.get('source_url')}")
    print(f"Verified At: {sample.get('verified_at')}")

    assert sample['data_source'] is not None
    assert sample['verified_at'] is not None
    assert sample['location']['state'] == "Gujarat"
    assert sample['location']['country'] == "India"

    print("\n" + "=" * 60)
    print("4. BOOKING AVAILABILITY & CHECKOUT FLOW TEST")
    print("=" * 60)
    # 1. Check property details with upcoming availabilities
    prop_id = sample['id']
    details = get_json(f'{BASE}/properties/{prop_id}')
    avail_list = details.get('data', {}).get('upcoming_availabilities', [])
    print(f"Property ID {prop_id} has {len(avail_list)} upcoming availability days in SQLite.")
    assert len(avail_list) > 0, "No availability found in property details!"

    # 2. Check dynamic availability check endpoint
    from datetime import date, timedelta
    check_in_date = (date.today() + timedelta(days=5)).isoformat()
    check_out_date = (date.today() + timedelta(days=7)).isoformat()

    avail_chk_url = f'{BASE}/properties/check-availability'
    avail_resp = post_json(avail_chk_url, {
        "property_id": prop_id,
        "check_in": check_in_date,
        "check_out": check_out_date,
        "guests": 2
    })
    print(f"Check availability response: available={avail_resp.get('data', {}).get('available')}, total=INR {avail_resp.get('data', {}).get('total_price')}")
    assert avail_resp.get('data', {}).get('available') == True

    # Customer login
    login_url = f'{BASE}/auth/login'
    login_resp = post_json(login_url, {"email": "customer@gujaratweekend.com", "password": "password123"})
    token = login_resp.get("data", {}).get("access_token")
    print("Customer logged in successfully.")

    # Calculate price / quotation
    quote_url = f'{BASE}/bookings/calculate-price'
    quote_payload = {
        "property_id": prop_id,
        "check_in": check_in_date,
        "check_out": check_out_date,
        "guest_count": 2
    }
    quote = post_json(quote_url, quote_payload, token=token)
    print(f"Booking quote: 2 nights = INR {quote.get('data', {}).get('total')}")

    # Create Booking
    book_url = f'{BASE}/bookings'
    book_payload = {
        "property_id": prop_id,
        "check_in": check_in_date,
        "check_out": check_out_date,
        "guest_count": 2,
        "special_requests": "Ground floor room preferred if possible."
    }
    booking = post_json(book_url, book_payload, token=token)
    booking_id = booking.get("data", {}).get("id")
    booking_code = booking.get("data", {}).get("booking_code")
    qr_data = booking.get("data", {}).get("qr_code_data")
    print(f"Created Booking ID {booking_id}, Code: {booking_code}")
    print(f"QR Pass Data generated: {bool(qr_data)}")
    print(f"Booking Status: {booking.get('data', {}).get('status')}")

    # QR Pass verification endpoint test
    verify_url = f'{BASE}/bookings/verify-pass/{booking_code}'
    pass_resp = get_json(verify_url, token=token) if False else None
    req = urllib.request.Request(verify_url, headers={'Authorization': f'Bearer {token}'})
    with urllib.request.urlopen(req) as resp:
        verified_data = json.loads(resp.read().decode())
    print(f"QR Pass Verification: {verified_data.get('message')}")
    assert verified_data.get('data', {}).get('booking_code') == booking_code

    print("\n" + "=" * 60)
    print("ALL SEARCH, LOCATION, METADATA, & BOOKING TESTS PASSED!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
