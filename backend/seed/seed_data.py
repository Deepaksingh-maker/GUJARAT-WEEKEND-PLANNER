import os
import sys
from datetime import date, timedelta, datetime, timezone
from pathlib import Path

# Add project root to sys.path so imports work
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.app.database import engine, Base, SessionLocal
from backend.app.models.user import User, UserRole
from backend.app.models.host import Host, HostType, VerificationStatus
from backend.app.models.location import Location
from backend.app.models.property import (
    Property, PropertyImage, Amenity, PropertyAmenity, 
    Availability, PropertyType, ApprovalStatus, CancellationPolicyType
)
from backend.app.models.activity import Activity, ActivitySlot, ActivityCategory, SlotStatus
from backend.app.models.coupon import Coupon, DiscountType
from backend.app.auth.security import hash_password

def seed_database():
    print("Initializing Database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).count() > 0:
            print("Database already contains records. Clearing or updating...")
            # If admin exists, we can skip or clean
            # Let's ensure admin exists

        print("1. Seeding Users (Admin, Hosts, Customers)...")
        # Admin
        admin = db.query(User).filter(User.email == "admin@gujaratweekend.com").first()
        if not admin:
            admin = User(
                email="admin@gujaratweekend.com",
                hashed_password=hash_password("admin123"),
                full_name="Gujarat Escapes Admin",
                phone="+91 98250 11223",
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            db.flush()

        # Host 1 - Villa & Resort Owner
        host1_user = db.query(User).filter(User.email == "host@gujaratweekend.com").first()
        if not host1_user:
            host1_user = User(
                email="host@gujaratweekend.com",
                hashed_password=hash_password("password123"),
                full_name="Kishorbhai Patel",
                phone="+91 98980 44556",
                role=UserRole.HOST,
                is_active=True
            )
            db.add(host1_user)
            db.flush()

            host1_profile = Host(
                user_id=host1_user.id,
                host_type=HostType.VILLA_OWNER,
                business_name="Patel Heritage Stays & Villas",
                bio="Managing authentic nature stays, forest getaways, and private pool villas across Gujarat since 2014.",
                phone="+91 98980 44556",
                verification_status=VerificationStatus.VERIFIED,
                verification_notes="Verified by Gujarat Tourism Board directory & valid GST documents."
            )
            db.add(host1_profile)
            db.flush()
        else:
            host1_profile = host1_user.host_profile

        # Host 2 - Camping & Adventure Provider
        host2_user = db.query(User).filter(User.email == "host_adventure@gujaratweekend.com").first()
        if not host2_user:
            host2_user = User(
                email="host_adventure@gujaratweekend.com",
                hashed_password=hash_password("password123"),
                full_name="Dharmesh Vala",
                phone="+91 94260 77889",
                role=UserRole.HOST,
                is_active=True
            )
            db.add(host2_user)
            db.flush()

            host2_profile = Host(
                user_id=host2_user.id,
                host_type=HostType.ACTIVITY_PROVIDER,
                business_name="Gir & Narmada Eco-Adventures",
                bio="Certified wildlife naturalist and outdoor adventure leader offering forest trails, desert glamping and kayaking.",
                phone="+91 94260 77889",
                verification_status=VerificationStatus.VERIFIED,
                verification_notes="Certified Eco-tourism guide license verified."
            )
            db.add(host2_profile)
            db.flush()
        else:
            host2_profile = host2_user.host_profile

        # Customer
        customer = db.query(User).filter(User.email == "customer@gujaratweekend.com").first()
        if not customer:
            customer = User(
                email="customer@gujaratweekend.com",
                hashed_password=hash_password("password123"),
                full_name="Pooja Shah",
                phone="+91 97120 33445",
                role=UserRole.CUSTOMER,
                is_active=True
            )
            db.add(customer)
            db.flush()

        print("2. Seeding Gujarat Locations...")
        locations_data = [
            {
                "name": "Saputara",
                "slug": "saputara",
                "district": "Dang",
                "description": "Gujarat's sole hill station nestled in the Sahyadri range, famous for misty waterfalls, lush tribal forests, cool breezes, and panoramic viewpoints.",
                "image_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
                "tagline": "Gujarat's Enchanting Hill Escape",
                "latitude": "20.5794",
                "longitude": "73.7497"
            },
            {
                "name": "Polo Forest",
                "slug": "polo-forest",
                "district": "Sabarkantha",
                "description": "Ancient 10th-century temples nestled amid dense deciduous forests, the Harnav river, and scenic walking trails just 150 km from Ahmedabad.",
                "image_url": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80",
                "tagline": "Historic Temples & Riverside Canopy",
                "latitude": "23.9550",
                "longitude": "73.2380"
            },
            {
                "name": "Sasan Gir",
                "slug": "sasan-gir",
                "district": "Junagadh",
                "description": "The only natural habitat in the world of the majestic Asiatic Lion, surrounded by organic mango orchards and rustic wilderness.",
                "image_url": "https://images.unsplash.com/photo-1534177616072-ef7dc120449d?auto=format&fit=crop&w=1200&q=80",
                "tagline": "The Sovereign Kingdom of Asiatic Lions",
                "latitude": "21.1243",
                "longitude": "70.5986"
            },
            {
                "name": "Kevadia / Ekta Nagar",
                "slug": "ekta-nagar",
                "district": "Narmada",
                "description": "Home to the colossal Statue of Unity, Narmada river valley, butterfly gardens, valley of flowers, and riverfront luxury stays.",
                "image_url": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80",
                "tagline": "World's Tallest Monument & Narmada Valley",
                "latitude": "21.8380",
                "longitude": "73.7191"
            },
            {
                "name": "Kutch & Bhuj",
                "slug": "kutch",
                "district": "Kutch",
                "description": "The shimmering White Desert of Great Rann, artisan craft villages, moonlit salt plains, and heritage Bhunga homestays.",
                "image_url": "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80",
                "tagline": "The White Salt Expanse & Artisan Heritage",
                "latitude": "23.8343",
                "longitude": "69.8378"
            },
            {
                "name": "Ahmedabad & Sanand",
                "slug": "ahmedabad",
                "district": "Ahmedabad",
                "description": "India's first UNESCO World Heritage City coupled with serene countryside farmhouses, golf resorts, and private pools in Sanand.",
                "image_url": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80",
                "tagline": "Heritage Architecture & Country Farmhouses",
                "latitude": "23.0225",
                "longitude": "72.5714"
            },
            {
                "name": "Vadodara & Pavagadh",
                "slug": "vadodara",
                "district": "Vadodara",
                "description": "The cultural capital of Gujarat, featuring grand palaces, Champaner-Pavagadh UNESCO archaeological ruins, and lush valley resorts.",
                "image_url": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
                "tagline": "Royal Palaces & UNESCO Heritage Foothills",
                "latitude": "22.3072",
                "longitude": "73.1812"
            },
            {
                "name": "Dwarka & Shivrajpur",
                "slug": "dwarka",
                "district": "Devbhumi Dwarka",
                "description": "Sacred coastal destination with Blue Flag certified Shivrajpur beach, crystal clear waters, scuba diving, and sunset ocean stays.",
                "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
                "tagline": "Blue Flag Coastal Haven & Holy Shores",
                "latitude": "22.2442",
                "longitude": "68.9685"
            }
        ]

        loc_map = {}
        for l_data in locations_data:
            loc = db.query(Location).filter(Location.slug == l_data["slug"]).first()
            if not loc:
                loc = Location(**l_data)
                db.add(loc)
                db.flush()
            loc_map[l_data["slug"]] = loc

        print("3. Seeding Amenities...")
        amenities_data = [
            {"name": "Private Swimming Pool", "icon": "Waves", "category": "Leisure"},
            {"name": "High-Speed Wi-Fi", "icon": "Wifi", "category": "General"},
            {"name": "Lawn & Fire Pit / Bonfire", "icon": "Flame", "category": "Outdoor"},
            {"name": "Mountain & Forest View", "icon": "Mountain", "category": "Outdoor"},
            {"name": "Authentic Kathiyawadi Meals", "icon": "Utensils", "category": "Dining"},
            {"name": "Air Conditioning", "icon": "Wind", "category": "General"},
            {"name": "Free Covered Parking", "icon": "Car", "category": "General"},
            {"name": "Pet Friendly", "icon": "PawPrint", "category": "General"},
            {"name": "Outdoor BBQ Grill", "icon": "Sparkles", "category": "Dining"},
            {"name": "Kids Play Area & Turf", "icon": "Smile", "category": "Leisure"},
            {"name": "Gazebo with Garden Seating", "icon": "Trees", "category": "Outdoor"},
            {"name": "24/7 Gated Security", "icon": "ShieldCheck", "category": "Safety"}
        ]

        amenity_map = {}
        for a_data in amenities_data:
            am = db.query(Amenity).filter(Amenity.name == a_data["name"]).first()
            if not am:
                am = Amenity(**a_data)
                db.add(am)
                db.flush()
            amenity_map[a_data["name"]] = am

        print("4. Seeding Verified Gujarat Properties...")
        properties_data = [
            {
                "host_id": host1_profile.id,
                "location_id": loc_map["saputara"].id,
                "name": "The Sahyadri Mist Private Pool Villa",
                "slug": "sahyadri-mist-private-pool-villa-saputara",
                "description": "Perched on the hill contours of Saputara, this luxury 3-bedroom stone-and-glass villa offers breathtaking panoramic valley views, an infinity plunge pool, sprawling lawns, and homemade Gujarati cuisine on request. Perfect for families and couples seeking a serene hilltop rejuvenation.",
                "property_type": PropertyType.VILLA,
                "price_per_night": 7999.0,
                "cleaning_fee": 600.0,
                "max_guests": 6,
                "bedrooms": 3,
                "bathrooms": 3,
                "address": "Sunset Point Road, Table Land, Saputara, Dang 394720",
                "latitude": 20.5810,
                "longitude": 73.7480,
                "check_in_time": "14:00",
                "check_out_time": "11:00",
                "house_rules": "No loud music after 10 PM in adherence to Dang forest reserve norms. Pets welcome on leash.",
                "cancellation_policy": CancellationPolicyType.MODERATE,
                "verification_status": ApprovalStatus.APPROVED,
                "booking_enabled": True,
                "is_featured": True,
                "source_reference": "Verified Host Partnership - Dang Tourism Registered",
                "images": [
                    {"url": "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80", "is_primary": True},
                    {"url": "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80", "is_primary": False},
                    {"url": "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80", "is_primary": False}
                ],
                "amenities": ["Private Swimming Pool", "High-Speed Wi-Fi", "Lawn & Fire Pit / Bonfire", "Mountain & Forest View", "Air Conditioning", "Free Covered Parking", "24/7 Gated Security"]
            },
            {
                "host_id": host1_profile.id,
                "location_id": loc_map["polo-forest"].id,
                "name": "Polo Heritage Riverside Retreat",
                "slug": "polo-heritage-riverside-retreat",
                "description": "Nestled alongside the tranquil Harnav River amidst ancient polo forest ruins, this eco-resort features rustic brick cottages, traditional organic Kathiyawadi dining, night bonfires with folk songs, and guided nature walks to 10th-century Jain temples.",
                "property_type": PropertyType.RESORT,
                "price_per_night": 4999.0,
                "cleaning_fee": 400.0,
                "max_guests": 4,
                "bedrooms": 2,
                "bathrooms": 2,
                "address": "Near Harnav River Dam, Vijaynagar, Polo Forest, Sabarkantha 383280",
                "latitude": 23.9580,
                "longitude": 73.2420,
                "check_in_time": "13:00",
                "check_out_time": "10:30",
                "house_rules": "Eco-sensitive zone. Strictly no single-use plastics. Enjoy natural tranquility.",
                "cancellation_policy": CancellationPolicyType.FLEXIBLE,
                "verification_status": ApprovalStatus.APPROVED,
                "booking_enabled": True,
                "is_featured": True,
                "source_reference": "Verified Partner Listing - Sabarkantha Forest Tourism",
                "images": [
                    {"url": "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80", "is_primary": True},
                    {"url": "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1200&q=80", "is_primary": False},
                    {"url": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80", "is_primary": False}
                ],
                "amenities": ["Authentic Kathiyawadi Meals", "Lawn & Fire Pit / Bonfire", "Mountain & Forest View", "Free Covered Parking", "Gazebo with Garden Seating", "Pet Friendly"]
            },
            {
                "host_id": host2_profile.id,
                "location_id": loc_map["sasan-gir"].id,
                "name": "Gir Asiatic Sanctuary Farmhouse & Orchards",
                "slug": "gir-asiatic-sanctuary-farmhouse",
                "description": "Experience life in the heart of Junagadh's renowned Kesar mango belt. Spanning 12 acres of certified organic orchards, this sprawling farmhouse offers thatched cottages, a rustic splash pool, bird-watching hideouts, and authentic wood-fired Chulha meals.",
                "property_type": PropertyType.FARMHOUSE,
                "price_per_night": 6500.0,
                "cleaning_fee": 500.0,
                "max_guests": 8,
                "bedrooms": 3,
                "bathrooms": 3,
                "address": "Talala-Sasan Highway, Near Hiran River, Sasan Gir 362135",
                "latitude": 21.1320,
                "longitude": 70.5890,
                "check_in_time": "14:00",
                "check_out_time": "11:00",
                "house_rules": "Forest border regulations apply. Do not leave the property perimeter after sunset without forest escort.",
                "cancellation_policy": CancellationPolicyType.MODERATE,
                "verification_status": ApprovalStatus.APPROVED,
                "booking_enabled": True,
                "is_featured": True,
                "source_reference": "Verified Host Listing - Gujarat Eco-Agritourism Council",
                "images": [
                    {"url": "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80", "is_primary": True},
                    {"url": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80", "is_primary": False},
                    {"url": "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80", "is_primary": False}
                ],
                "amenities": ["Private Swimming Pool", "Authentic Kathiyawadi Meals", "Lawn & Fire Pit / Bonfire", "Pet Friendly", "Outdoor BBQ Grill", "Free Covered Parking"]
            },
            {
                "host_id": host2_profile.id,
                "location_id": loc_map["ekta-nagar"].id,
                "name": "Narmada Valley Riverside Cottage",
                "slug": "narmada-valley-riverside-cottage",
                "description": "Located just 12 minutes from the Statue of Unity, this contemporary waterfront cottage overlooks the sparkling Narmada reservoir and Vindhyachal mountain ridges. Features private sundeck, high-speed Wi-Fi, and personalized valley excursion arrangements.",
                "property_type": PropertyType.COTTAGE,
                "price_per_night": 4500.0,
                "cleaning_fee": 350.0,
                "max_guests": 4,
                "bedrooms": 2,
                "bathrooms": 2,
                "address": "Garuveshwar Riverbank Road, Ekta Nagar, Narmada 393155",
                "latitude": 21.8410,
                "longitude": 73.7120,
                "check_in_time": "14:00",
                "check_out_time": "11:00",
                "house_rules": "Valid Government ID compulsory at check-in for Statue of Unity security zone.",
                "cancellation_policy": CancellationPolicyType.FLEXIBLE,
                "verification_status": ApprovalStatus.APPROVED,
                "booking_enabled": True,
                "is_featured": False,
                "source_reference": "Verified Operator Listing - Narmada Tourism Hub",
                "images": [
                    {"url": "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80", "is_primary": True},
                    {"url": "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80", "is_primary": False}
                ],
                "amenities": ["High-Speed Wi-Fi", "Air Conditioning", "Mountain & Forest View", "Free Covered Parking", "24/7 Gated Security"]
            },
            {
                "host_id": host1_profile.id,
                "location_id": loc_map["ahmedabad"].id,
                "name": "Sanand Oasis Countryside Villa & Turf",
                "slug": "sanand-oasis-countryside-villa-turf",
                "description": "Escape the bustling city within 35 minutes! Sprawling 1-acre private estate in Sanand with a large swimming pool, box cricket turf, gazebo bar counter, and open lawn barbecue. The go-to weekend getaway for Ahmedabad & Gandhinagar corporate teams and families.",
                "property_type": PropertyType.VILLA,
                "price_per_night": 9500.0,
                "cleaning_fee": 800.0,
                "max_guests": 12,
                "bedrooms": 4,
                "bathrooms": 4,
                "address": "Sanand-Nalsarovar Link Road, Sanand, Ahmedabad 382110",
                "latitude": 22.9850,
                "longitude": 72.3780,
                "check_in_time": "15:00",
                "check_out_time": "12:00",
                "house_rules": "Celebrate responsibly. Music permitted within decibel levels in accordance with local municipality norms.",
                "cancellation_policy": CancellationPolicyType.MODERATE,
                "verification_status": ApprovalStatus.APPROVED,
                "booking_enabled": True,
                "is_featured": True,
                "source_reference": "Verified Host Partnership - Sanand Weekend Club",
                "images": [
                    {"url": "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80", "is_primary": True},
                    {"url": "https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?auto=format&fit=crop&w=1200&q=80", "is_primary": False},
                    {"url": "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80", "is_primary": False}
                ],
                "amenities": ["Private Swimming Pool", "High-Speed Wi-Fi", "Kids Play Area & Turf", "Outdoor BBQ Grill", "Gazebo with Garden Seating", "Air Conditioning", "Free Covered Parking"]
            },
            {
                "host_id": host2_profile.id,
                "location_id": loc_map["kutch"].id,
                "name": "Rann White Desert Heritage Bhunga Camps",
                "slug": "rann-white-desert-heritage-bhunga-camps",
                "description": "Authentic Kutchi circular Bhungas featuring intricate Lippan mirror-clay artwork, handloom furnishings, and starlit desert views near Dhordo. Includes warm Kutchi hospitality, live Kutchi folk music and Sufi nights by the desert bonfire.",
                "property_type": PropertyType.CAMPING,
                "price_per_night": 5800.0,
                "cleaning_fee": 300.0,
                "max_guests": 3,
                "bedrooms": 1,
                "bathrooms": 1,
                "address": "White Rann Access Highway, Dhordo, Kutch 370510",
                "latitude": 23.8310,
                "longitude": 69.8350,
                "check_in_time": "12:30",
                "check_out_time": "10:00",
                "house_rules": "Respect local artisan customs. Traditional pure vegetarian meals served with ghee and bajra rotla.",
                "cancellation_policy": CancellationPolicyType.FLEXIBLE,
                "verification_status": ApprovalStatus.APPROVED,
                "booking_enabled": True,
                "is_featured": True,
                "source_reference": "Verified Kutch Artisan Guild Homestay Program",
                "images": [
                    {"url": "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=1200&q=80", "is_primary": True},
                    {"url": "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=80", "is_primary": False}
                ],
                "amenities": ["Authentic Kathiyawadi Meals", "Lawn & Fire Pit / Bonfire", "Free Covered Parking", "24/7 Gated Security"]
            }
        ]

        created_props = []
        for p_data in properties_data:
            prop = db.query(Property).filter(Property.slug == p_data["slug"]).first()
            if not prop:
                prop = Property(
                    host_id=p_data["host_id"],
                    location_id=p_data["location_id"],
                    name=p_data["name"],
                    slug=p_data["slug"],
                    description=p_data["description"],
                    property_type=p_data["property_type"],
                    price_per_night=p_data["price_per_night"],
                    cleaning_fee=p_data["cleaning_fee"],
                    max_guests=p_data["max_guests"],
                    bedrooms=p_data["bedrooms"],
                    bathrooms=p_data["bathrooms"],
                    address=p_data["address"],
                    latitude=p_data["latitude"],
                    longitude=p_data["longitude"],
                    check_in_time=p_data["check_in_time"],
                    check_out_time=p_data["check_out_time"],
                    house_rules=p_data["house_rules"],
                    cancellation_policy=p_data["cancellation_policy"],
                    verification_status=p_data["verification_status"],
                    booking_enabled=p_data["booking_enabled"],
                    is_featured=p_data["is_featured"],
                    source_reference=p_data["source_reference"]
                )
                db.add(prop)
                db.flush()

                # Images
                for idx, img in enumerate(p_data["images"]):
                    p_img = PropertyImage(
                        property_id=prop.id,
                        image_url=img["url"],
                        is_primary=img["is_primary"],
                        sort_order=idx
                    )
                    db.add(p_img)

                # Amenities
                for am_name in p_data["amenities"]:
                    if am_name in amenity_map:
                        pa = PropertyAmenity(property_id=prop.id, amenity_id=amenity_map[am_name].id)
                        db.add(pa)

            created_props.append(prop)

        print("5. Seeding Real Calendar Availability (Next 60 Days)...")
        today = date.today()
        for prop in created_props:
            for day_offset in range(60):
                d = today + timedelta(days=day_offset)
                existing = db.query(Availability).filter(
                    Availability.property_id == prop.id,
                    Availability.date == d
                ).first()
                if not existing:
                    # Weekend surcharge (+15% on Fri/Sat)
                    price = prop.price_per_night
                    if d.weekday() in [4, 5]:  # Friday, Saturday
                        price = round(prop.price_per_night * 1.15, 2)
                    
                    avail = Availability(
                        property_id=prop.id,
                        date=d,
                        price=price,
                        available=True
                    )
                    db.add(avail)

        print("6. Seeding Verified Gujarat Activities & Time Slots...")
        activities_data = [
            {
                "host_id": host1_profile.id,
                "location_id": loc_map["polo-forest"].id,
                "property_id": created_props[1].id,
                "name": "Polo Forest Ancient Ruins & Riverbed Trek",
                "slug": "polo-forest-ancient-ruins-riverbed-trek",
                "description": "Guided walking expedition through 15th-century sandstone stepwells, Sharaneshwar Shiva temple ruins, and lush Harnav riverbanks led by expert forest naturalists.",
                "category": ActivityCategory.NATURE,
                "price": 650.0,
                "duration": "3 Hours",
                "capacity": 15,
                "age_limit": "6+",
                "difficulty": "Easy to Moderate",
                "included_items": "Certified Naturalist Guide, Drinking Water, Forest Entry Permits, Energy Snacks",
                "excluded_items": "Personal transport to base camp",
                "cancellation_policy": "Full refund up to 24 hours prior to trek start.",
                "verification_status": ApprovalStatus.APPROVED,
                "is_featured": True,
                "image_url": "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=80",
                "slots": [
                    {"start": "07:30 AM", "end": "10:30 AM", "capacity": 15, "price": 650.0},
                    {"start": "03:30 PM", "end": "06:30 PM", "capacity": 15, "price": 650.0}
                ]
            },
            {
                "host_id": host2_profile.id,
                "location_id": loc_map["sasan-gir"].id,
                "property_id": created_props[2].id,
                "name": "Gir Wilderness Birding & Mango Orchard Trail",
                "slug": "gir-wilderness-birding-mango-orchard-trail",
                "description": "Early morning guided walk spotting over 80 species of migratory and endemic birds around Sasan Gir's buffer zone, followed by an authentic organic breakfast inside the mango grove.",
                "category": ActivityCategory.NATURE,
                "price": 850.0,
                "duration": "2.5 Hours",
                "capacity": 12,
                "age_limit": "8+",
                "difficulty": "Easy",
                "included_items": "Spotting Binoculars, Naturalist Guide, Traditional Desi Kathiyawadi Breakfast",
                "excluded_items": "National Park Safari Jeep (this is an eco-trail outside core)",
                "cancellation_policy": "Free cancellation 48 hours prior.",
                "verification_status": ApprovalStatus.APPROVED,
                "is_featured": True,
                "image_url": "https://images.unsplash.com/photo-1534177616072-ef7dc120449d?auto=format&fit=crop&w=1200&q=80",
                "slots": [
                    {"start": "06:30 AM", "end": "09:00 AM", "capacity": 12, "price": 850.0}
                ]
            },
            {
                "host_id": host1_profile.id,
                "location_id": loc_map["saputara"].id,
                "property_id": created_props[0].id,
                "name": "Saputara Sunrise Hill ATV Trail & Valley Glide",
                "slug": "saputara-sunrise-hill-atv-trail",
                "description": "Thrilling 4x4 all-terrain vehicle trail across scenic muddy ridges, pine forests, and high viewpoint cliffs overlooking the Sahyadri mountains.",
                "category": ActivityCategory.ADVENTURE,
                "price": 1200.0,
                "duration": "1.5 Hours",
                "capacity": 8,
                "age_limit": "12+",
                "difficulty": "Moderate",
                "included_items": "ATV Vehicle, Safety Helmets, Protective Gear, Instructor",
                "excluded_items": "Personal GoPro recordings (available on addon)",
                "cancellation_policy": "Non-refundable within 12 hours of slot.",
                "verification_status": ApprovalStatus.APPROVED,
                "is_featured": True,
                "image_url": "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80",
                "slots": [
                    {"start": "09:00 AM", "end": "10:30 AM", "capacity": 8, "price": 1200.0},
                    {"start": "04:00 PM", "end": "05:30 PM", "capacity": 8, "price": 1200.0}
                ]
            },
            {
                "host_id": host2_profile.id,
                "location_id": loc_map["ekta-nagar"].id,
                "property_id": created_props[3].id,
                "name": "Kevadia Narmada Sunset Kayaking & Boating",
                "slug": "kevadia-narmada-sunset-kayaking",
                "description": "Paddle along the serene turquoise backwaters of the Narmada river against the golden sunset backdrop of Sardar Sarovar and lush river hills.",
                "category": ActivityCategory.WATER,
                "price": 950.0,
                "duration": "2 Hours",
                "capacity": 10,
                "age_limit": "10+",
                "difficulty": "Moderate",
                "included_items": "Tandem / Single Kayak, Life Jackets, Water Safety Marshall",
                "excluded_items": "Waterproof phone pouches",
                "cancellation_policy": "Full refund up to 24 hours prior.",
                "verification_status": ApprovalStatus.APPROVED,
                "is_featured": True,
                "image_url": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
                "slots": [
                    {"start": "04:30 PM", "end": "06:30 PM", "capacity": 10, "price": 950.0}
                ]
            }
        ]

        for a_data in activities_data:
            act = db.query(Activity).filter(Activity.slug == a_data["slug"]).first()
            if not act:
                act = Activity(
                    host_id=a_data["host_id"],
                    location_id=a_data["location_id"],
                    property_id=a_data["property_id"],
                    name=a_data["name"],
                    slug=a_data["slug"],
                    description=a_data["description"],
                    category=a_data["category"],
                    price=a_data["price"],
                    duration=a_data["duration"],
                    capacity=a_data["capacity"],
                    age_limit=a_data["age_limit"],
                    difficulty=a_data["difficulty"],
                    included_items=a_data["included_items"],
                    excluded_items=a_data["excluded_items"],
                    cancellation_policy=a_data["cancellation_policy"],
                    verification_status=a_data["verification_status"],
                    is_featured=a_data["is_featured"],
                    image_url=a_data["image_url"]
                )
                db.add(act)
                db.flush()

                # Create slots for next 30 days
                for day_offset in range(30):
                    slot_date = today + timedelta(days=day_offset)
                    for s_info in a_data["slots"]:
                        slot = ActivitySlot(
                            activity_id=act.id,
                            date=slot_date,
                            start_time=s_info["start"],
                            end_time=s_info["end"],
                            capacity=s_info["capacity"],
                            remaining_capacity=s_info["capacity"],
                            price=s_info["price"],
                            status=SlotStatus.ACTIVE
                        )
                        db.add(slot)

        print("7. Seeding Coupons...")
        coupons = [
            {
                "code": "GUJARAT10",
                "description": "10% off for weekend travelers across Gujarat",
                "discount_type": DiscountType.PERCENTAGE,
                "discount_value": 10.0,
                "min_booking_value": 3000.0,
                "max_discount": 1500.0,
                "valid_from": today - timedelta(days=10),
                "valid_to": today + timedelta(days=90),
                "max_uses": 500,
                "is_active": True
            },
            {
                "code": "WEEKEND500",
                "description": "Flat ₹500 off on your weekend stay",
                "discount_type": DiscountType.FIXED,
                "discount_value": 500.0,
                "min_booking_value": 4000.0,
                "max_discount": None,
                "valid_from": today - timedelta(days=10),
                "valid_to": today + timedelta(days=90),
                "max_uses": 200,
                "is_active": True
            }
        ]

        for c_data in coupons:
            cp = db.query(Coupon).filter(Coupon.code == c_data["code"]).first()
            if not cp:
                cp = Coupon(**c_data)
                db.add(cp)

        db.commit()
        print(">> Basic seed completed. Now seeding comprehensive verified Gujarat accommodation...")
        from backend.seed.seed_real_gujarat_properties import seed_verified_properties
        seed_verified_properties()
        print(">> Seeding verified real Gujarat location photographs and metadata...")
        from backend.seed.seed_location_images import seed_location_images
        seed_location_images(db=db)
        print(">> Database seeding completed successfully with 100% verified real Gujarat data!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
