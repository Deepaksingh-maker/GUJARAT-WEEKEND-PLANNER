"""
Gujarat Locations Migration & Comprehensive Seed Script
Adds missing columns to locations table and populates comprehensive Gujarat locations
(Districts, Talukas, Major Cities, Towns, Tourist Spots, Heritage Sites, Localities).
Strictly restricted to:
State: Gujarat
Country: India
"""
import sqlite3
import re
from pathlib import Path
from datetime import datetime, timezone

DB_PATH = Path(__file__).resolve().parent.parent.parent / "database" / "app.db"

def slugify(text: str) -> str:
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    return re.sub(r'[-\s]+', '-', text)

def migrate_schema():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check columns in locations table
    cursor.execute("PRAGMA table_info(locations)")
    cols = {row[1] for row in cursor.fetchall()}

    columns_to_add = [
        ("type", "VARCHAR(50) DEFAULT 'city'"),
        ("taluka", "VARCHAR(100)"),
        ("state", "VARCHAR(100) DEFAULT 'Gujarat' NOT NULL"),
        ("country", "VARCHAR(100) DEFAULT 'India' NOT NULL"),
    ]

    for col_name, col_def in columns_to_add:
        if col_name not in cols:
            print(f"Adding column '{col_name}' to locations table...")
            cursor.execute(f"ALTER TABLE locations ADD COLUMN {col_name} {col_def}")

    # Ensure existing rows are marked as Gujarat, India
    cursor.execute("UPDATE locations SET state = 'Gujarat', country = 'India' WHERE state IS NULL OR state != 'Gujarat'")
    cursor.execute("UPDATE locations SET country = 'India' WHERE country IS NULL OR country != 'India'")

    # Update existing specific seed rows to canonical names and slugs
    existing_updates = [
        (1, "Saputara", "saputara", "tourist", "Ahwa", "Dang"),
        (2, "Polo Forest", "polo-forest", "tourist", "Vijaynagar", "Sabarkantha"),
        (3, "Sasan Gir", "sasan-gir", "tourist", "Talala", "Junagadh"),
        (4, "Ekta Nagar", "ekta-nagar", "tourist", "Garudeshwar", "Narmada"),
        (5, "Kutch", "kutch", "district", "Bhuj", "Kutch"),
        (6, "Ahmedabad", "ahmedabad", "city", "Ahmedabad", "Ahmedabad"),
        (7, "Vadodara", "vadodara", "city", "Vadodara", "Vadodara"),
        (8, "Dwarka", "dwarka", "tourist", "Dwarka", "Devbhumi Dwarka"),
    ]
    for loc_id, name, slug, l_type, taluka, dist in existing_updates:
        cursor.execute(
            "UPDATE locations SET name = ?, slug = ?, type = ?, taluka = ?, district = ?, state = 'Gujarat', country = 'India', is_popular = 1 WHERE id = ?",
            (name, slug, l_type, taluka, dist, loc_id)
        )

    # Create index for fast searching if not exists
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_locations_gujarat_search ON locations (country, state, name)")

    conn.commit()
    conn.close()
    print("Schema migration completed successfully.")

# Comprehensive dataset of Gujarat locations
GUJARAT_LOCATIONS = [
    # 33 Districts of Gujarat
    {"name": "Ahmedabad District", "type": "district", "district": "Ahmedabad", "taluka": None, "latitude": "23.0225", "longitude": "72.5714", "is_popular": True},
    {"name": "Amreli District", "type": "district", "district": "Amreli", "taluka": None, "latitude": "21.6032", "longitude": "71.2221", "is_popular": False},
    {"name": "Anand District", "type": "district", "district": "Anand", "taluka": None, "latitude": "22.5645", "longitude": "72.9289", "is_popular": True},
    {"name": "Aravalli District", "type": "district", "district": "Aravalli", "taluka": None, "latitude": "23.4616", "longitude": "73.2982", "is_popular": False},
    {"name": "Banaskantha District", "type": "district", "district": "Banaskantha", "taluka": None, "latitude": "24.1724", "longitude": "72.4346", "is_popular": False},
    {"name": "Bharuch District", "type": "district", "district": "Bharuch", "taluka": None, "latitude": "21.7051", "longitude": "72.9959", "is_popular": False},
    {"name": "Bhavnagar District", "type": "district", "district": "Bhavnagar", "taluka": None, "latitude": "21.7645", "longitude": "72.1519", "is_popular": True},
    {"name": "Botad District", "type": "district", "district": "Botad", "taluka": None, "latitude": "22.1706", "longitude": "71.6669", "is_popular": False},
    {"name": "Chhota Udaipur District", "type": "district", "district": "Chhota Udaipur", "taluka": None, "latitude": "22.3108", "longitude": "74.0117", "is_popular": False},
    {"name": "Dahod District", "type": "district", "district": "Dahod", "taluka": None, "latitude": "22.8340", "longitude": "74.2562", "is_popular": False},
    {"name": "Dang District", "type": "district", "district": "Dang", "taluka": None, "latitude": "20.7634", "longitude": "73.6844", "is_popular": True},
    {"name": "Devbhumi Dwarka District", "type": "district", "district": "Devbhumi Dwarka", "taluka": None, "latitude": "22.2442", "longitude": "68.9685", "is_popular": True},
    {"name": "Gandhinagar District", "type": "district", "district": "Gandhinagar", "taluka": None, "latitude": "23.2156", "longitude": "72.6369", "is_popular": True},
    {"name": "Gir Somnath District", "type": "district", "district": "Gir Somnath", "taluka": None, "latitude": "20.9042", "longitude": "70.3674", "is_popular": True},
    {"name": "Jamnagar District", "type": "district", "district": "Jamnagar", "taluka": None, "latitude": "22.4707", "longitude": "70.0577", "is_popular": True},
    {"name": "Junagadh District", "type": "district", "district": "Junagadh", "taluka": None, "latitude": "21.5222", "longitude": "70.4579", "is_popular": True},
    {"name": "Kheda District", "type": "district", "district": "Kheda", "taluka": None, "latitude": "22.7533", "longitude": "72.6826", "is_popular": False},
    {"name": "Kutch District", "type": "district", "district": "Kutch", "taluka": None, "latitude": "23.7337", "longitude": "69.8597", "is_popular": True},
    {"name": "Mahisagar District", "type": "district", "district": "Mahisagar", "taluka": None, "latitude": "23.1368", "longitude": "73.6146", "is_popular": False},
    {"name": "Mehsana District", "type": "district", "district": "Mehsana", "taluka": None, "latitude": "23.5880", "longitude": "72.3693", "is_popular": True},
    {"name": "Morbi District", "type": "district", "district": "Morbi", "taluka": None, "latitude": "22.8120", "longitude": "70.8378", "is_popular": False},
    {"name": "Narmada District", "type": "district", "district": "Narmada", "taluka": None, "latitude": "21.8718", "longitude": "73.5027", "is_popular": True},
    {"name": "Navsari District", "type": "district", "district": "Navsari", "taluka": None, "latitude": "20.9467", "longitude": "72.9520", "is_popular": False},
    {"name": "Panchmahal District", "type": "district", "district": "Panchmahal", "taluka": None, "latitude": "22.7758", "longitude": "73.6149", "is_popular": False},
    {"name": "Patan District", "type": "district", "district": "Patan", "taluka": None, "latitude": "23.8493", "longitude": "72.1266", "is_popular": False},
    {"name": "Porbandar District", "type": "district", "district": "Porbandar", "taluka": None, "latitude": "21.6417", "longitude": "69.6293", "is_popular": True},
    {"name": "Rajkot District", "type": "district", "district": "Rajkot", "taluka": None, "latitude": "22.3039", "longitude": "70.8022", "is_popular": True},
    {"name": "Sabarkantha District", "type": "district", "district": "Sabarkantha", "taluka": None, "latitude": "23.6037", "longitude": "72.9625", "is_popular": True},
    {"name": "Surat District", "type": "district", "district": "Surat", "taluka": None, "latitude": "21.1702", "longitude": "72.8311", "is_popular": True},
    {"name": "Surendranagar District", "type": "district", "district": "Surendranagar", "taluka": None, "latitude": "22.7278", "longitude": "71.6370", "is_popular": False},
    {"name": "Tapi District", "type": "district", "district": "Tapi", "taluka": None, "latitude": "21.1147", "longitude": "73.3941", "is_popular": False},
    {"name": "Vadodara District", "type": "district", "district": "Vadodara", "taluka": None, "latitude": "22.3072", "longitude": "73.1812", "is_popular": True},
    {"name": "Valsad District", "type": "district", "district": "Valsad", "taluka": None, "latitude": "20.5992", "longitude": "72.9342", "is_popular": True},

    # Major Cities
    {"name": "Ahmedabad", "type": "city", "district": "Ahmedabad", "taluka": "Ahmedabad", "latitude": "23.0225", "longitude": "72.5714", "is_popular": True, "tagline": "Manchester of the East & Heritage Metropolis"},
    {"name": "Surat", "type": "city", "district": "Surat", "taluka": "Choryasi", "latitude": "21.1702", "longitude": "72.8311", "is_popular": True, "tagline": "The Diamond & Silk City"},
    {"name": "Vadodara", "type": "city", "district": "Vadodara", "taluka": "Vadodara", "latitude": "22.3072", "longitude": "73.1812", "is_popular": True, "tagline": "Cultural Capital of Gujarat"},
    {"name": "Rajkot", "type": "city", "district": "Rajkot", "taluka": "Rajkot", "latitude": "22.3039", "longitude": "70.8022", "is_popular": True, "tagline": "Heart of Saurashtra"},
    {"name": "Gandhinagar", "type": "city", "district": "Gandhinagar", "taluka": "Gandhinagar", "latitude": "23.2156", "longitude": "72.6369", "is_popular": True, "tagline": "Green Capital of Gujarat"},
    {"name": "Bhavnagar", "type": "city", "district": "Bhavnagar", "taluka": "Bhavnagar", "latitude": "21.7645", "longitude": "72.1519", "is_popular": True, "tagline": "Cultural Haven of Gohilwad"},
    {"name": "Jamnagar", "type": "city", "district": "Jamnagar", "taluka": "Jamnagar", "latitude": "22.4707", "longitude": "70.0577", "is_popular": True, "tagline": "Oil City & Birdwatchers Paradise"},
    {"name": "Junagadh", "type": "city", "district": "Junagadh", "taluka": "Junagadh", "latitude": "21.5222", "longitude": "70.4579", "is_popular": True, "tagline": "Historic Foot of Mount Girnar"},
    {"name": "Anand", "type": "city", "district": "Anand", "taluka": "Anand", "latitude": "22.5645", "longitude": "72.9289", "is_popular": True, "tagline": "Milk Capital of India"},
    {"name": "Navsari", "type": "city", "district": "Navsari", "taluka": "Navsari", "latitude": "20.9467", "longitude": "72.9520", "is_popular": False, "tagline": "Twin City of Surat"},
    {"name": "Morbi", "type": "city", "district": "Morbi", "taluka": "Morbi", "latitude": "22.8120", "longitude": "70.8378", "is_popular": False, "tagline": "Ceramic Capital of India"},
    {"name": "Nadiad", "type": "city", "district": "Kheda", "taluka": "Nadiad", "latitude": "22.6916", "longitude": "72.8634", "is_popular": True, "tagline": "Land of Sardar Patel & Santram Mandir"},
    {"name": "Surendranagar", "type": "city", "district": "Surendranagar", "taluka": "Wadhwan", "latitude": "22.7278", "longitude": "71.6370", "is_popular": False, "tagline": "Gateway to Saurashtra"},
    {"name": "Bharuch", "type": "city", "district": "Bharuch", "taluka": "Bharuch", "latitude": "21.7051", "longitude": "72.9959", "is_popular": False, "tagline": "Ancient Port on Narmada River"},
    {"name": "Mehsana", "type": "city", "district": "Mehsana", "taluka": "Mehsana", "latitude": "23.5880", "longitude": "72.3693", "is_popular": True, "tagline": "Hub of North Gujarat"},
    {"name": "Bhuj", "type": "city", "district": "Kutch", "taluka": "Bhuj", "latitude": "23.2420", "longitude": "69.6669", "is_popular": True, "tagline": "Crown Jewel of Kutch"},
    {"name": "Porbandar", "type": "city", "district": "Porbandar", "taluka": "Porbandar", "latitude": "21.6417", "longitude": "69.6293", "is_popular": True, "tagline": "Birthplace of Mahatma Gandhi"},
    {"name": "Palanpur", "type": "city", "district": "Banaskantha", "taluka": "Palanpur", "latitude": "24.1724", "longitude": "72.4346", "is_popular": False, "tagline": "City of Diamonds & Perfumes"},
    {"name": "Valsad", "type": "city", "district": "Valsad", "taluka": "Valsad", "latitude": "20.5992", "longitude": "72.9342", "is_popular": True, "tagline": "Coastal Paradise & Mango Hub"},
    {"name": "Vapi", "type": "city", "district": "Valsad", "taluka": "Pardi", "latitude": "20.3893", "longitude": "72.9106", "is_popular": False, "tagline": "Chemical & Industrial Hub of South Gujarat"},
    {"name": "Gondal", "type": "town", "district": "Rajkot", "taluka": "Gondal", "latitude": "21.9619", "longitude": "70.7997", "is_popular": True, "tagline": "Royal Heritage Palaces & Vintage Cars"},
    {"name": "Veraval", "type": "town", "district": "Gir Somnath", "taluka": "Veraval", "latitude": "20.9004", "longitude": "70.3629", "is_popular": True, "tagline": "Historic Coastal Port by Somnath"},
    {"name": "Godhra", "type": "city", "district": "Panchmahal", "taluka": "Godhra", "latitude": "22.7758", "longitude": "73.6149", "is_popular": False},
    {"name": "Patan", "type": "city", "district": "Patan", "taluka": "Patan", "latitude": "23.8493", "longitude": "72.1266", "is_popular": True, "tagline": "Ancient Solanki Capital & Home of Patola"},
    {"name": "Dahod", "type": "city", "district": "Dahod", "taluka": "Dahod", "latitude": "22.8340", "longitude": "74.2562", "is_popular": False},
    {"name": "Botad", "type": "town", "district": "Botad", "taluka": "Botad", "latitude": "22.1706", "longitude": "71.6669", "is_popular": False},
    {"name": "Amreli", "type": "city", "district": "Amreli", "taluka": "Amreli", "latitude": "21.6032", "longitude": "71.2221", "is_popular": False},
    {"name": "Deesa", "type": "city", "district": "Banaskantha", "taluka": "Deesa", "latitude": "24.2587", "longitude": "72.1812", "is_popular": False},
    {"name": "Jetpur", "type": "town", "district": "Rajkot", "taluka": "Jetpur", "latitude": "21.7548", "longitude": "70.7854", "is_popular": False},
    {"name": "Kalol", "type": "town", "district": "Gandhinagar", "taluka": "Kalol", "latitude": "23.2372", "longitude": "72.4988", "is_popular": False},
    {"name": "Khambhat", "type": "town", "district": "Anand", "taluka": "Khambhat", "latitude": "22.3134", "longitude": "72.6192", "is_popular": False, "tagline": "Historic Port & Halwas"},
    {"name": "Ankleshwar", "type": "city", "district": "Bharuch", "taluka": "Ankleshwar", "latitude": "21.6264", "longitude": "73.0033", "is_popular": False},
    {"name": "Himatnagar", "type": "city", "district": "Sabarkantha", "taluka": "Himatnagar", "latitude": "23.6037", "longitude": "72.9625", "is_popular": False},
    {"name": "Modasa", "type": "city", "district": "Aravalli", "taluka": "Modasa", "latitude": "23.4616", "longitude": "73.2982", "is_popular": False},

    # Tourist, Pilgrimage, Wildlife & Heritage Destinations
    {"name": "Dwarka", "type": "tourist", "district": "Devbhumi Dwarka", "taluka": "Dwarka", "latitude": "22.2442", "longitude": "68.9685", "is_popular": True, "tagline": "Sacred Char Dham & Krishna's Golden Kingdom"},
    {"name": "Somnath", "type": "tourist", "district": "Gir Somnath", "taluka": "Veraval", "latitude": "20.8880", "longitude": "70.4013", "is_popular": True, "tagline": "First Jyotirlinga Shrine on the Arabian Sea"},
    {"name": "Gir", "type": "tourist", "district": "Junagadh", "taluka": "Talala", "latitude": "21.1243", "longitude": "70.5986", "is_popular": True, "tagline": "Wild Abode of Asiatic Lions"},
    {"name": "Statue of Unity", "type": "tourist", "district": "Narmada", "taluka": "Garudeshwar", "latitude": "21.8380", "longitude": "73.7191", "is_popular": True, "tagline": "World's Tallest Monument & Valley of Flowers"},
    {"name": "Kevadia", "type": "town", "district": "Narmada", "taluka": "Garudeshwar", "latitude": "21.8718", "longitude": "73.6844", "is_popular": True, "tagline": "Gateway to Sardar Sarovar & Statue of Unity"},
    {"name": "Ekta Nagar", "type": "town", "district": "Narmada", "taluka": "Garudeshwar", "latitude": "21.8380", "longitude": "73.7191", "is_popular": True, "tagline": "Eco-Tourism Capital of Narmada"},
    {"name": "White Rann", "type": "tourist", "district": "Kutch", "taluka": "Bhuj", "latitude": "23.8333", "longitude": "69.8333", "is_popular": True, "tagline": "Endless Salt Desert & Rann Utsav Cultural Nights"},
    {"name": "Dhordo", "type": "village", "district": "Kutch", "taluka": "Bhuj", "latitude": "23.7917", "longitude": "69.5167", "is_popular": True, "tagline": "UN Best Tourism Village & Tent City"},
    {"name": "Kalo Dungar", "type": "tourist", "district": "Kutch", "taluka": "Bhuj", "latitude": "23.9167", "longitude": "69.8167", "is_popular": True, "tagline": "Highest Point in Kutch with Panoramic Desert Views"},
    {"name": "Dholavira", "type": "tourist", "district": "Kutch", "taluka": "Bhachau", "latitude": "23.8860", "longitude": "70.2170", "is_popular": True, "tagline": "UNESCO World Heritage Harappan Civilization City"},
    {"name": "Shivrajpur", "type": "tourist", "district": "Devbhumi Dwarka", "taluka": "Dwarka", "latitude": "22.3328", "longitude": "68.9555", "is_popular": True, "tagline": "Blue Flag Certified Pristine White Sand Beach"},
    {"name": "Bet Dwarka", "type": "tourist", "district": "Devbhumi Dwarka", "taluka": "Okhamandal", "latitude": "22.4419", "longitude": "69.1039", "is_popular": True, "tagline": "Ancient Island Residence of Lord Krishna"},
    {"name": "Pavagadh", "type": "tourist", "district": "Panchmahal", "taluka": "Halol", "latitude": "22.4833", "longitude": "73.5333", "is_popular": True, "tagline": "Kalika Mata Shrine on Volcanic Summit"},
    {"name": "Champaner", "type": "tourist", "district": "Panchmahal", "taluka": "Halol", "latitude": "22.4864", "longitude": "73.5358", "is_popular": True, "tagline": "UNESCO World Heritage Medieval Fortified City"},
    {"name": "Modhera", "type": "tourist", "district": "Mehsana", "taluka": "Becharaji", "latitude": "23.5835", "longitude": "72.1332", "is_popular": True, "tagline": "Iconic 11th Century Sun Temple & Stepwell"},
    {"name": "Rani ki Vav", "type": "tourist", "district": "Patan", "taluka": "Patan", "latitude": "23.8589", "longitude": "72.1017", "is_popular": True, "tagline": "UNESCO World Heritage Subterranean Stepwell Masterpiece"},
    {"name": "Palitana", "type": "tourist", "district": "Bhavnagar", "taluka": "Palitana", "latitude": "21.5222", "longitude": "71.8267", "is_popular": True, "tagline": "World's Largest Marble Temple Complex on Shatrunjaya"},
    {"name": "Lothal", "type": "tourist", "district": "Ahmedabad", "taluka": "Dholka", "latitude": "22.5220", "longitude": "72.2497", "is_popular": True, "tagline": "Ancient Bronze Age Harappan Dockyard Port"},
    {"name": "Velavadar", "type": "tourist", "district": "Bhavnagar", "taluka": "Vallabhipur", "latitude": "21.9333", "longitude": "72.0333", "is_popular": True, "tagline": "Blackbuck National Park & Grassland Wilderness"},
    {"name": "Wild Ass Sanctuary", "type": "tourist", "district": "Surendranagar", "taluka": "Dhrangadhra", "latitude": "23.1667", "longitude": "71.4167", "is_popular": True, "tagline": "Little Rann Wildlife Sanctuary for Indian Wild Ass"},
    {"name": "Ambaji", "type": "tourist", "district": "Banaskantha", "taluka": "Danta", "latitude": "24.3333", "longitude": "72.8500", "is_popular": True, "tagline": "Major Shakti Peeth Shrine in the Aravalli Hills"},
    {"name": "Dakor", "type": "tourist", "district": "Kheda", "taluka": "Thasra", "latitude": "22.7567", "longitude": "73.1500", "is_popular": True, "tagline": "Ranchhodraiji Krishna Temple & Sacred Gomti Lake"},
    {"name": "Shamlaji", "type": "tourist", "district": "Aravalli", "taluka": "Bhiloda", "latitude": "23.6833", "longitude": "73.3833", "is_popular": True, "tagline": "Ancient Meshwo River Shrine of Lord Gadadhar"},
    {"name": "Becharaji", "type": "tourist", "district": "Mehsana", "taluka": "Becharaji", "latitude": "23.5000", "longitude": "72.0333", "is_popular": True, "tagline": "Renowned Bahucharaji Mata Shakti Shrine"},
    {"name": "Salangpur", "type": "tourist", "district": "Botad", "taluka": "Barwala", "latitude": "22.1500", "longitude": "71.7667", "is_popular": True, "tagline": "Kashtbhanjan Dev Hanumanji Temple"},
    {"name": "Madhavpur", "type": "tourist", "district": "Porbandar", "taluka": "Porbandar", "latitude": "21.2536", "longitude": "69.9575", "is_popular": True, "tagline": "Scenic Coastal Coconut Belts & Krishna-Rukmini Fair"},
    {"name": "Nalsarovar", "type": "tourist", "district": "Ahmedabad", "taluka": "Sanand", "latitude": "22.8000", "longitude": "72.0333", "is_popular": True, "tagline": "Ramsar Wetland Bird Sanctuary with 200+ Species"},
    {"name": "Thol Lake", "type": "tourist", "district": "Mehsana", "taluka": "Kadi", "latitude": "23.1417", "longitude": "72.4042", "is_popular": True, "tagline": "Serene Wetland Birding Lake near Ahmedabad"},
    {"name": "Dumas Beach", "type": "tourist", "district": "Surat", "taluka": "Choryasi", "latitude": "21.0967", "longitude": "72.7092", "is_popular": True, "tagline": "Famous Black Sand Beach & Sunset Point"},
    {"name": "Tithal Beach", "type": "tourist", "district": "Valsad", "taluka": "Valsad", "latitude": "20.6053", "longitude": "72.9056", "is_popular": True, "tagline": "Breezy Arabian Shoreline with Sai Baba Temple"},
    {"name": "Mandvi Beach", "type": "tourist", "district": "Kutch", "taluka": "Mandvi", "latitude": "22.8333", "longitude": "69.3500", "is_popular": True, "tagline": "Vijay Vilas Palace & Windmill Coast"},
    {"name": "Don Hill Station", "type": "tourist", "district": "Dang", "taluka": "Ahwa", "latitude": "20.7300", "longitude": "73.8600", "is_popular": True, "tagline": "Highest Altitude Tribal Hill Hamlet in Gujarat"},
    {"name": "Gira Waterfalls", "type": "tourist", "district": "Dang", "taluka": "Waghai", "latitude": "20.7667", "longitude": "73.5000", "is_popular": True, "tagline": "Roaring Ambika River Waterfalls in Monsoon"},
    {"name": "Zarwani Waterfalls", "type": "tourist", "district": "Narmada", "taluka": "Garudeshwar", "latitude": "21.8167", "longitude": "73.6500", "is_popular": True, "tagline": "Deep Forest Waterfalls inside Shoolpaneshwar Sanctuary"},
    {"name": "Idar Gadh", "type": "tourist", "district": "Sabarkantha", "taluka": "Idar", "latitude": "23.8333", "longitude": "73.0000", "is_popular": False, "tagline": "Historic Hill Fort on Natural Granite Boulders"},
    {"name": "Vadnagar", "type": "tourist", "district": "Mehsana", "taluka": "Vadnagar", "latitude": "23.7833", "longitude": "72.6333", "is_popular": True, "tagline": "Ancient Heritage Town with Kirti Toran & Buddhist Relics"},
    {"name": "Adalaj", "type": "tourist", "district": "Gandhinagar", "taluka": "Gandhinagar", "latitude": "23.1667", "longitude": "72.5833", "is_popular": True, "tagline": "Adalaj Ni Vav 5-Storey Intricate Stepwell"},
    {"name": "GIFT City", "type": "locality", "district": "Gandhinagar", "taluka": "Gandhinagar", "latitude": "23.1611", "longitude": "72.6842", "is_popular": True, "tagline": "Gujarat International Finance Tec-City"},

    # Ahmedabad Talukas, Towns & Prominent Localities
    {"name": "Sanand", "type": "town", "district": "Ahmedabad", "taluka": "Sanand", "latitude": "22.9868", "longitude": "72.3811", "is_popular": True, "tagline": "Automobile Hub & Nalsarovar Countryside Stays"},
    {"name": "Ahmedabad Cantonment", "type": "locality", "district": "Ahmedabad", "taluka": "Ahmedabad", "latitude": "23.0567", "longitude": "72.6000", "is_popular": False, "tagline": "Historic Green Cantonment Area of Ahmedabad"},
    {"name": "Daskroi", "type": "taluka", "district": "Ahmedabad", "taluka": "Daskroi", "latitude": "23.0167", "longitude": "72.6167", "is_popular": False},
    {"name": "Dholka", "type": "town", "district": "Ahmedabad", "taluka": "Dholka", "latitude": "22.7214", "longitude": "72.4636", "is_popular": False},
    {"name": "Dhandhuka", "type": "town", "district": "Ahmedabad", "taluka": "Dhandhuka", "latitude": "22.3739", "longitude": "71.9806", "is_popular": False},
    {"name": "Bavla", "type": "town", "district": "Ahmedabad", "taluka": "Bavla", "latitude": "22.8333", "longitude": "72.3667", "is_popular": False},
    {"name": "Viramgam", "type": "town", "district": "Ahmedabad", "taluka": "Viramgam", "latitude": "23.1256", "longitude": "72.0322", "is_popular": False},
    {"name": "Mandal", "type": "taluka", "district": "Ahmedabad", "taluka": "Mandal", "latitude": "23.2833", "longitude": "71.9167", "is_popular": False},
    {"name": "Detroj-Rampura", "type": "taluka", "district": "Ahmedabad", "taluka": "Detroj-Rampura", "latitude": "23.3333", "longitude": "72.1833", "is_popular": False},
    {"name": "Bopal", "type": "locality", "district": "Ahmedabad", "taluka": "Daskroi", "latitude": "23.0333", "longitude": "72.4667", "is_popular": True},
    {"name": "Chandkheda", "type": "locality", "district": "Ahmedabad", "taluka": "Ahmedabad", "latitude": "23.1111", "longitude": "72.5833", "is_popular": False},
    {"name": "Maninagar", "type": "locality", "district": "Ahmedabad", "taluka": "Ahmedabad", "latitude": "22.9989", "longitude": "72.6033", "is_popular": False},
    {"name": "Dholera", "type": "town", "district": "Ahmedabad", "taluka": "Dhandhuka", "latitude": "22.2500", "longitude": "72.1833", "is_popular": True, "tagline": "Special Investment Region & Green City"},
    {"name": "Sarkhej", "type": "locality", "district": "Ahmedabad", "taluka": "Daskroi", "latitude": "22.9833", "longitude": "72.5000", "is_popular": False},

    # Surat Talukas & Towns
    {"name": "Bardoli", "type": "town", "district": "Surat", "taluka": "Bardoli", "latitude": "21.1219", "longitude": "73.1119", "is_popular": True, "tagline": "Historic Town of Sardar Patel's Satyagraha"},
    {"name": "Kamrej", "type": "town", "district": "Surat", "taluka": "Kamrej", "latitude": "21.2667", "longitude": "72.9667", "is_popular": False},
    {"name": "Olpad", "type": "taluka", "district": "Surat", "taluka": "Olpad", "latitude": "21.3333", "longitude": "72.7500", "is_popular": False},
    {"name": "Mangrol (Surat)", "type": "taluka", "district": "Surat", "taluka": "Mangrol", "latitude": "21.5500", "longitude": "73.0833", "is_popular": False},
    {"name": "Palsana", "type": "taluka", "district": "Surat", "taluka": "Palsana", "latitude": "21.0833", "longitude": "72.9833", "is_popular": False},
    {"name": "Mahuva (Surat)", "type": "taluka", "district": "Surat", "taluka": "Mahuva", "latitude": "20.9667", "longitude": "73.1500", "is_popular": False},
    {"name": "Mandvi (Surat)", "type": "town", "district": "Surat", "taluka": "Mandvi", "latitude": "21.2500", "longitude": "73.3000", "is_popular": False},
    {"name": "Umarpada", "type": "taluka", "district": "Surat", "taluka": "Umarpada", "latitude": "21.5000", "longitude": "73.2833", "is_popular": False},
    {"name": "Hazira", "type": "town", "district": "Surat", "taluka": "Choryasi", "latitude": "21.1167", "longitude": "72.6333", "is_popular": False},

    # Vadodara Talukas & Towns
    {"name": "Padra", "type": "town", "district": "Vadodara", "taluka": "Padra", "latitude": "22.2333", "longitude": "73.0833", "is_popular": False},
    {"name": "Karjan", "type": "town", "district": "Vadodara", "taluka": "Karjan", "latitude": "22.0500", "longitude": "73.1167", "is_popular": False},
    {"name": "Dabhoi", "type": "town", "district": "Vadodara", "taluka": "Dabhoi", "latitude": "22.1833", "longitude": "73.4333", "is_popular": True, "tagline": "Historic 13th Century Fortified Gates"},
    {"name": "Waghodia", "type": "taluka", "district": "Vadodara", "taluka": "Waghodia", "latitude": "22.3000", "longitude": "73.4167", "is_popular": False},
    {"name": "Savli", "type": "taluka", "district": "Vadodara", "taluka": "Savli", "latitude": "22.5667", "longitude": "73.2167", "is_popular": False},
    {"name": "Desar", "type": "taluka", "district": "Vadodara", "taluka": "Desar", "latitude": "22.6167", "longitude": "73.3667", "is_popular": False},
    {"name": "Shinor", "type": "taluka", "district": "Vadodara", "taluka": "Shinor", "latitude": "21.9167", "longitude": "73.3333", "is_popular": False},

    # Dang Talukas & Towns
    {"name": "Ahwa", "type": "town", "district": "Dang", "taluka": "Ahwa", "latitude": "20.7634", "longitude": "73.6844", "is_popular": True, "tagline": "Tribal Administrative Headquarters of Dang"},
    {"name": "Waghai", "type": "town", "district": "Dang", "taluka": "Waghai", "latitude": "20.7667", "longitude": "73.5000", "is_popular": True, "tagline": "Gateway to Dang Forest & Botanical Gardens"},
    {"name": "Subir", "type": "taluka", "district": "Dang", "taluka": "Subir", "latitude": "20.9333", "longitude": "73.8167", "is_popular": False},

    # Devbhumi Dwarka Talukas & Towns
    {"name": "Khambhalia", "type": "town", "district": "Devbhumi Dwarka", "taluka": "Khambhalia", "latitude": "22.2000", "longitude": "69.6667", "is_popular": False, "tagline": "District Headquarters of Devbhumi Dwarka"},
    {"name": "Kalyanpur", "type": "taluka", "district": "Devbhumi Dwarka", "taluka": "Kalyanpur", "latitude": "22.0333", "longitude": "69.1833", "is_popular": False},
    {"name": "Bhanvad", "type": "town", "district": "Devbhumi Dwarka", "taluka": "Bhanvad", "latitude": "21.9333", "longitude": "69.7833", "is_popular": False},
    {"name": "Mithapur", "type": "town", "district": "Devbhumi Dwarka", "taluka": "Dwarka", "latitude": "22.4167", "longitude": "68.9833", "is_popular": False},

    # Gir Somnath Talukas & Towns
    {"name": "Talala", "type": "town", "district": "Gir Somnath", "taluka": "Talala", "latitude": "21.0500", "longitude": "70.5167", "is_popular": True, "tagline": "Famous Kesar Mango Hub of Gir"},
    {"name": "Kodinar", "type": "town", "district": "Gir Somnath", "taluka": "Kodinar", "latitude": "20.7833", "longitude": "70.7000", "is_popular": False},
    {"name": "Sutrapada", "type": "taluka", "district": "Gir Somnath", "taluka": "Sutrapada", "latitude": "20.8500", "longitude": "70.4833", "is_popular": False},
    {"name": "Una", "type": "town", "district": "Gir Somnath", "taluka": "Una", "latitude": "20.8247", "longitude": "71.0392", "is_popular": False},
    {"name": "Gir Gadhada", "type": "taluka", "district": "Gir Somnath", "taluka": "Gir Gadhada", "latitude": "20.9167", "longitude": "70.9167", "is_popular": False},

    # Junagadh Talukas & Towns
    {"name": "Keshod", "type": "town", "district": "Junagadh", "taluka": "Keshod", "latitude": "21.3000", "longitude": "70.2500", "is_popular": False},
    {"name": "Mangrol (Junagadh)", "type": "town", "district": "Junagadh", "taluka": "Mangrol", "latitude": "21.1167", "longitude": "70.1167", "is_popular": False},
    {"name": "Manavadar", "type": "town", "district": "Junagadh", "taluka": "Manavadar", "latitude": "21.4833", "longitude": "70.1333", "is_popular": False},
    {"name": "Visavadar", "type": "town", "district": "Junagadh", "taluka": "Visavadar", "latitude": "21.3500", "longitude": "70.6833", "is_popular": False},
    {"name": "Malia Hatina", "type": "taluka", "district": "Junagadh", "taluka": "Malia Hatina", "latitude": "21.1500", "longitude": "70.3000", "is_popular": False},
    {"name": "Bhesan", "type": "taluka", "district": "Junagadh", "taluka": "Bhesan", "latitude": "21.5500", "longitude": "70.7000", "is_popular": False},
    {"name": "Mendarda", "type": "taluka", "district": "Junagadh", "taluka": "Mendarda", "latitude": "21.3167", "longitude": "70.4333", "is_popular": False},
    {"name": "Vanthali", "type": "town", "district": "Junagadh", "taluka": "Vanthali", "latitude": "21.4667", "longitude": "70.3167", "is_popular": False},

    # Kutch Talukas & Towns
    {"name": "Gandhidham", "type": "city", "district": "Kutch", "taluka": "Gandhidham", "latitude": "23.0767", "longitude": "70.1337", "is_popular": True, "tagline": "Financial Capital of Kutch"},
    {"name": "Anjar", "type": "town", "district": "Kutch", "taluka": "Anjar", "latitude": "23.1167", "longitude": "70.0167", "is_popular": False, "tagline": "Jesal Toral Samadhi & Traditional Metalcraft"},
    {"name": "Mandvi", "type": "town", "district": "Kutch", "taluka": "Mandvi", "latitude": "22.8333", "longitude": "69.3500", "is_popular": True, "tagline": "Centuries Old Wooden Shipbuilding Port"},
    {"name": "Mundra", "type": "town", "district": "Kutch", "taluka": "Mundra", "latitude": "22.8400", "longitude": "69.7200", "is_popular": True, "tagline": "Largest Private Commercial Port in India"},
    {"name": "Nakhatrana", "type": "taluka", "district": "Kutch", "taluka": "Nakhatrana", "latitude": "23.3500", "longitude": "69.2667", "is_popular": False},
    {"name": "Abdasa", "type": "taluka", "district": "Kutch", "taluka": "Abdasa", "latitude": "23.2167", "longitude": "68.8667", "is_popular": False},
    {"name": "Lakhpat", "type": "town", "district": "Kutch", "taluka": "Lakhpat", "latitude": "23.8333", "longitude": "68.7833", "is_popular": True, "tagline": "Historic Ghost Town inside Vast Ramparts"},
    {"name": "Rapar", "type": "town", "district": "Kutch", "taluka": "Rapar", "latitude": "23.5667", "longitude": "70.6333", "is_popular": False},
    {"name": "Bhachau", "type": "town", "district": "Kutch", "taluka": "Bhachau", "latitude": "23.2833", "longitude": "70.3500", "is_popular": False},
    {"name": "Kandla", "type": "town", "district": "Kutch", "taluka": "Gandhidham", "latitude": "23.0167", "longitude": "70.2167", "is_popular": False, "tagline": "Major Seaport on the Gulf of Kutch"},

    # Banaskantha Talukas & Towns
    {"name": "Danta", "type": "taluka", "district": "Banaskantha", "taluka": "Danta", "latitude": "24.1833", "longitude": "72.7833", "is_popular": False},
    {"name": "Vadgam", "type": "taluka", "district": "Banaskantha", "taluka": "Vadgam", "latitude": "24.0833", "longitude": "72.5333", "is_popular": False},
    {"name": "Dhanera", "type": "town", "district": "Banaskantha", "taluka": "Dhanera", "latitude": "24.5167", "longitude": "72.0167", "is_popular": False},
    {"name": "Tharad", "type": "town", "district": "Banaskantha", "taluka": "Tharad", "latitude": "24.3833", "longitude": "71.6333", "is_popular": False},
    {"name": "Vav", "type": "taluka", "district": "Banaskantha", "taluka": "Vav", "latitude": "24.3667", "longitude": "71.5000", "is_popular": False},
    {"name": "Bhabhar", "type": "town", "district": "Banaskantha", "taluka": "Bhabhar", "latitude": "24.1167", "longitude": "71.6000", "is_popular": False},
    {"name": "Diyodar", "type": "taluka", "district": "Banaskantha", "taluka": "Diyodar", "latitude": "24.1000", "longitude": "71.7667", "is_popular": False},
    {"name": "Kankrej", "type": "taluka", "district": "Banaskantha", "taluka": "Kankrej", "latitude": "23.9667", "longitude": "71.8667", "is_popular": False},

    # Sabarkantha Talukas & Towns
    {"name": "Idar", "type": "town", "district": "Sabarkantha", "taluka": "Idar", "latitude": "23.8333", "longitude": "73.0000", "is_popular": True, "tagline": "Town of Handcrafted Wooden Toys & Idar Gadh"},
    {"name": "Prantij", "type": "town", "district": "Sabarkantha", "taluka": "Prantij", "latitude": "23.4333", "longitude": "72.8500", "is_popular": False},
    {"name": "Talod", "type": "town", "district": "Sabarkantha", "taluka": "Talod", "latitude": "23.3500", "longitude": "72.9500", "is_popular": False},
    {"name": "Khedbrahma", "type": "town", "district": "Sabarkantha", "taluka": "Khedbrahma", "latitude": "24.0333", "longitude": "73.0500", "is_popular": False, "tagline": "Rare Brahma Temple & Sacred Confluence"},
    {"name": "Vadali", "type": "town", "district": "Sabarkantha", "taluka": "Vadali", "latitude": "23.9333", "longitude": "73.0333", "is_popular": False},
    {"name": "Vijaynagar", "type": "town", "district": "Sabarkantha", "taluka": "Vijaynagar", "latitude": "23.9550", "longitude": "73.2380", "is_popular": True, "tagline": "Home to the Ancient Polo Forest Canopy"},

    # Aravalli Talukas & Towns
    {"name": "Bhiloda", "type": "taluka", "district": "Aravalli", "taluka": "Bhiloda", "latitude": "23.7667", "longitude": "73.2500", "is_popular": False},
    {"name": "Bayad", "type": "town", "district": "Aravalli", "taluka": "Bayad", "latitude": "23.2333", "longitude": "73.2167", "is_popular": False},
    {"name": "Malpur", "type": "taluka", "district": "Aravalli", "taluka": "Malpur", "latitude": "23.3500", "longitude": "73.4667", "is_popular": False},
    {"name": "Dhansura", "type": "taluka", "district": "Aravalli", "taluka": "Dhansura", "latitude": "23.3667", "longitude": "73.1833", "is_popular": False},
    {"name": "Meghraj", "type": "taluka", "district": "Aravalli", "taluka": "Meghraj", "latitude": "23.5000", "longitude": "73.5000", "is_popular": False},

    # Mehsana Talukas & Towns
    {"name": "Kadi", "type": "town", "district": "Mehsana", "taluka": "Kadi", "latitude": "23.3000", "longitude": "72.3333", "is_popular": False, "tagline": "Cotton Mills & Near Thol Bird Sanctuary"},
    {"name": "Visnagar", "type": "town", "district": "Mehsana", "taluka": "Visnagar", "latitude": "23.7000", "longitude": "72.5500", "is_popular": False},
    {"name": "Vijapur", "type": "town", "district": "Mehsana", "taluka": "Vijapur", "latitude": "23.5667", "longitude": "72.7500", "is_popular": False},
    {"name": "Unjha", "type": "town", "district": "Mehsana", "taluka": "Unjha", "latitude": "23.8000", "longitude": "72.4000", "is_popular": True, "tagline": "Asia's Largest Spice & Cumin Market"},
    {"name": "Satlasana", "type": "taluka", "district": "Mehsana", "taluka": "Satlasana", "latitude": "24.0000", "longitude": "72.7167", "is_popular": False},
    {"name": "Jotana", "type": "taluka", "district": "Mehsana", "taluka": "Jotana", "latitude": "23.4667", "longitude": "72.3167", "is_popular": False},
    {"name": "Kheralu", "type": "town", "district": "Mehsana", "taluka": "Kheralu", "latitude": "23.8833", "longitude": "72.6167", "is_popular": False},

    # Patan Talukas & Towns
    {"name": "Siddhpur", "type": "town", "district": "Patan", "taluka": "Siddhpur", "latitude": "23.9167", "longitude": "72.3833", "is_popular": True, "tagline": "Rudra Mahalaya & Historic Bohra Haveli Mansions"},
    {"name": "Chanasma", "type": "taluka", "district": "Patan", "taluka": "Chanasma", "latitude": "23.7167", "longitude": "72.1167", "is_popular": False},
    {"name": "Harij", "type": "town", "district": "Patan", "taluka": "Harij", "latitude": "23.7000", "longitude": "71.9000", "is_popular": False},
    {"name": "Radhanpur", "type": "town", "district": "Patan", "taluka": "Radhanpur", "latitude": "23.8333", "longitude": "71.6000", "is_popular": False},
    {"name": "Shankheshwar", "type": "town", "district": "Patan", "taluka": "Shankheshwar", "latitude": "23.5000", "longitude": "71.7833", "is_popular": True, "tagline": "Major Jain Pilgrimage Tirth"},

    # Kheda Talukas & Towns
    {"name": "Kheda", "type": "town", "district": "Kheda", "taluka": "Kheda", "latitude": "22.7533", "longitude": "72.6826", "is_popular": False},
    {"name": "Matar", "type": "taluka", "district": "Kheda", "taluka": "Matar", "latitude": "22.7000", "longitude": "72.6500", "is_popular": False},
    {"name": "Mehmedabad", "type": "town", "district": "Kheda", "taluka": "Mehmedabad", "latitude": "22.8333", "longitude": "72.7667", "is_popular": False, "tagline": "Bhammariyo Kuan Stepwell"},
    {"name": "Mahudha", "type": "town", "district": "Kheda", "taluka": "Mahudha", "latitude": "22.8167", "longitude": "72.9333", "is_popular": False},
    {"name": "Kapadvanj", "type": "town", "district": "Kheda", "taluka": "Kapadvanj", "latitude": "23.0167", "longitude": "73.0667", "is_popular": False, "tagline": "Historic Kund & Glass Carving Craft"},
    {"name": "Kathlal", "type": "town", "district": "Kheda", "taluka": "Kathlal", "latitude": "22.9167", "longitude": "72.9833", "is_popular": False},
    {"name": "Thasra", "type": "taluka", "district": "Kheda", "taluka": "Thasra", "latitude": "22.8000", "longitude": "73.2000", "is_popular": False},

    # Anand Talukas & Towns
    {"name": "Vallabh Vidyanagar", "type": "town", "district": "Anand", "taluka": "Anand", "latitude": "22.5500", "longitude": "72.9333", "is_popular": True, "tagline": "Premier Educational Hub of Gujarat"},
    {"name": "Karamsad", "type": "town", "district": "Anand", "taluka": "Anand", "latitude": "22.5500", "longitude": "72.9000", "is_popular": True, "tagline": "Ancestral Home of Iron Man Sardar Patel"},
    {"name": "Borsad", "type": "town", "district": "Anand", "taluka": "Borsad", "latitude": "22.4167", "longitude": "72.9000", "is_popular": False},
    {"name": "Petlad", "type": "town", "district": "Anand", "taluka": "Petlad", "latitude": "22.4833", "longitude": "72.8000", "is_popular": False},
    {"name": "Umreth", "type": "town", "district": "Anand", "taluka": "Umreth", "latitude": "22.7000", "longitude": "73.1167", "is_popular": False},
    {"name": "Anklav", "type": "taluka", "district": "Anand", "taluka": "Anklav", "latitude": "22.3833", "longitude": "72.9833", "is_popular": False},
    {"name": "Sojitra", "type": "town", "district": "Anand", "taluka": "Sojitra", "latitude": "22.5333", "longitude": "72.7333", "is_popular": False},
    {"name": "Tarapur", "type": "taluka", "district": "Anand", "taluka": "Tarapur", "latitude": "22.4833", "longitude": "72.6667", "is_popular": False},

    # Bharuch Talukas & Towns
    {"name": "Jambusar", "type": "town", "district": "Bharuch", "taluka": "Jambusar", "latitude": "22.0500", "longitude": "72.8000", "is_popular": False},
    {"name": "Amod", "type": "taluka", "district": "Bharuch", "taluka": "Amod", "latitude": "21.9833", "longitude": "72.8667", "is_popular": False},
    {"name": "Vagra", "type": "taluka", "district": "Bharuch", "taluka": "Vagra", "latitude": "21.8500", "longitude": "72.8333", "is_popular": False},
    {"name": "Hansot", "type": "taluka", "district": "Bharuch", "taluka": "Hansot", "latitude": "21.5833", "longitude": "72.8000", "is_popular": False},
    {"name": "Jhagadia", "type": "taluka", "district": "Bharuch", "taluka": "Jhagadia", "latitude": "21.7167", "longitude": "73.1500", "is_popular": False},
    {"name": "Dahej", "type": "town", "district": "Bharuch", "taluka": "Vagra", "latitude": "21.7167", "longitude": "72.5833", "is_popular": False, "tagline": "Deepwater Petrochemical Port on Gulf of Khambhat"},

    # Narmada Talukas & Towns
    {"name": "Rajpipla", "type": "town", "district": "Narmada", "taluka": "Nandod", "latitude": "21.8718", "longitude": "73.5027", "is_popular": True, "tagline": "Princely Capital on the Karjan River"},
    {"name": "Nandod", "type": "taluka", "district": "Narmada", "taluka": "Nandod", "latitude": "21.8718", "longitude": "73.5027", "is_popular": False},
    {"name": "Garudeshwar", "type": "taluka", "district": "Narmada", "taluka": "Garudeshwar", "latitude": "21.8380", "longitude": "73.7191", "is_popular": True},
    {"name": "Tilakwada", "type": "taluka", "district": "Narmada", "taluka": "Tilakwada", "latitude": "21.9667", "longitude": "73.6167", "is_popular": False},
    {"name": "Dediapada", "type": "taluka", "district": "Narmada", "taluka": "Dediapada", "latitude": "21.6333", "longitude": "73.6000", "is_popular": False},
    {"name": "Sagbara", "type": "taluka", "district": "Narmada", "taluka": "Sagbara", "latitude": "21.5500", "longitude": "73.8000", "is_popular": False},

    # Navsari Talukas & Towns
    {"name": "Jalalpore", "type": "taluka", "district": "Navsari", "taluka": "Jalalpore", "latitude": "20.9500", "longitude": "72.9000", "is_popular": False},
    {"name": "Gandevi", "type": "town", "district": "Navsari", "taluka": "Gandevi", "latitude": "20.8167", "longitude": "72.9833", "is_popular": False},
    {"name": "Bilimora", "type": "city", "district": "Navsari", "taluka": "Gandevi", "latitude": "20.7667", "longitude": "72.9667", "is_popular": False},
    {"name": "Chikhli", "type": "town", "district": "Navsari", "taluka": "Chikhli", "latitude": "20.7500", "longitude": "73.0667", "is_popular": False},
    {"name": "Vansda", "type": "town", "district": "Navsari", "taluka": "Vansda", "latitude": "20.7500", "longitude": "73.3667", "is_popular": True, "tagline": "National Park & Deciduous Flora"},

    # Valsad Talukas & Towns
    {"name": "Pardi", "type": "town", "district": "Valsad", "taluka": "Pardi", "latitude": "20.5167", "longitude": "72.9500", "is_popular": False},
    {"name": "Umbergaon", "type": "town", "district": "Valsad", "taluka": "Umbergaon", "latitude": "20.1833", "longitude": "72.7500", "is_popular": False},
    {"name": "Dharampur", "type": "town", "district": "Valsad", "taluka": "Dharampur", "latitude": "20.5333", "longitude": "73.1833", "is_popular": True, "tagline": "Tribal Heritage Museum & Lady Wilson Museum"},
    {"name": "Kaprada", "type": "taluka", "district": "Valsad", "taluka": "Kaprada", "latitude": "20.3500", "longitude": "73.2000", "is_popular": False},

    # Surendranagar Talukas & Towns
    {"name": "Wadhwan", "type": "town", "district": "Surendranagar", "taluka": "Wadhwan", "latitude": "22.7000", "longitude": "71.6833", "is_popular": False, "tagline": "Historic Stepwells of Madha Vav"},
    {"name": "Dhrangadhra", "type": "town", "district": "Surendranagar", "taluka": "Dhrangadhra", "latitude": "22.9833", "longitude": "71.4667", "is_popular": False, "tagline": "Yellow Stone Architecture & Gateway to Little Rann"},
    {"name": "Halvad", "type": "town", "district": "Surendranagar", "taluka": "Halvad", "latitude": "23.0167", "longitude": "71.1833", "is_popular": False},
    {"name": "Limbdi", "type": "town", "district": "Surendranagar", "taluka": "Limbdi", "latitude": "22.5667", "longitude": "71.8000", "is_popular": False},
    {"name": "Chotila", "type": "tourist", "district": "Surendranagar", "taluka": "Chotila", "latitude": "22.4167", "longitude": "71.1833", "is_popular": True, "tagline": "Sacred Chamunda Mata Hilltop Shrine"},
    {"name": "Dasada", "type": "village", "district": "Surendranagar", "taluka": "Dasada", "latitude": "23.2833", "longitude": "71.7667", "is_popular": True, "tagline": "Safari Base for Little Rann of Kutch"},
    {"name": "Thangadh", "type": "town", "district": "Surendranagar", "taluka": "Thangadh", "latitude": "22.5833", "longitude": "71.2000", "is_popular": False, "tagline": "Ceramic Town & Tarnetar Fair"},

    # Morbi Talukas & Towns
    {"name": "Wankaner", "type": "town", "district": "Morbi", "taluka": "Wankaner", "latitude": "22.6167", "longitude": "70.9333", "is_popular": True, "tagline": "Ranjit Vilas Palace on Gadhio Hill"},
    {"name": "Tankara", "type": "town", "district": "Morbi", "taluka": "Tankara", "latitude": "22.6667", "longitude": "70.7500", "is_popular": False, "tagline": "Birthplace of Swami Dayanand Saraswati"},

    # Jamnagar Talukas & Towns
    {"name": "Dhrol", "type": "town", "district": "Jamnagar", "taluka": "Dhrol", "latitude": "22.5667", "longitude": "70.4167", "is_popular": False, "tagline": "Historic Battle of Bhuchar Mori"},
    {"name": "Kalavad", "type": "town", "district": "Jamnagar", "taluka": "Kalavad", "latitude": "22.2167", "longitude": "70.3833", "is_popular": False},
    {"name": "Jamjodhpur", "type": "town", "district": "Jamnagar", "taluka": "Jamjodhpur", "latitude": "21.9000", "longitude": "69.8667", "is_popular": False},

    # Porbandar Talukas & Towns
    {"name": "Ranavav", "type": "town", "district": "Porbandar", "taluka": "Ranavav", "latitude": "21.6833", "longitude": "69.7500", "is_popular": False},
    {"name": "Kutiyana", "type": "town", "district": "Porbandar", "taluka": "Kutiyana", "latitude": "21.6333", "longitude": "69.9833", "is_popular": False},

    # Amreli Talukas & Towns
    {"name": "Savarkundla", "type": "city", "district": "Amreli", "taluka": "Savarkundla", "latitude": "21.3333", "longitude": "71.3000", "is_popular": False, "tagline": "Famed for Navrang Scales & Ironware"},
    {"name": "Rajula", "type": "town", "district": "Amreli", "taluka": "Rajula", "latitude": "20.9833", "longitude": "71.4333", "is_popular": False},
    {"name": "Babra", "type": "town", "district": "Amreli", "taluka": "Babra", "latitude": "21.8500", "longitude": "71.3000", "is_popular": False},
    {"name": "Bagasara", "type": "town", "district": "Amreli", "taluka": "Bagasara", "latitude": "21.4833", "longitude": "71.0000", "is_popular": False},
    {"name": "Dhari", "type": "town", "district": "Amreli", "taluka": "Dhari", "latitude": "21.3333", "longitude": "71.0333", "is_popular": True, "tagline": "Kankai Mata Shrine & Gir Ambardi Safari Park"},
    {"name": "Jafrabad", "type": "town", "district": "Amreli", "taluka": "Jafrabad", "latitude": "20.8667", "longitude": "71.3667", "is_popular": False},

    # Bhavnagar Talukas & Towns
    {"name": "Sihor", "type": "town", "district": "Bhavnagar", "taluka": "Sihor", "latitude": "21.7167", "longitude": "71.9667", "is_popular": False},
    {"name": "Talaja", "type": "town", "district": "Bhavnagar", "taluka": "Talaja", "latitude": "21.3500", "longitude": "72.0333", "is_popular": True, "tagline": "Ancient Buddhist Rock-Cut Caves & Hilltop Shrine"},
    {"name": "Mahuva (Bhavnagar)", "type": "city", "district": "Bhavnagar", "taluka": "Mahuva", "latitude": "21.0917", "longitude": "71.7628", "is_popular": False, "tagline": "Kashmir of Saurashtra & Onion Dehydration Hub"},
    {"name": "Alang", "type": "town", "district": "Bhavnagar", "taluka": "Talaja", "latitude": "21.4167", "longitude": "72.1833", "is_popular": False, "tagline": "World's Largest Ship Breaking Yard"},

    # Botad Talukas & Towns
    {"name": "Gadhada", "type": "town", "district": "Botad", "taluka": "Gadhada", "latitude": "21.9667", "longitude": "71.5833", "is_popular": True, "tagline": "Gopinathji Swaminarayan Temple"},
    {"name": "Barwala", "type": "town", "district": "Botad", "taluka": "Barwala", "latitude": "22.1500", "longitude": "71.9000", "is_popular": False},
    {"name": "Ranpur", "type": "taluka", "district": "Botad", "taluka": "Ranpur", "latitude": "22.3500", "longitude": "71.7167", "is_popular": False},

    # Tapi Talukas & Towns
    {"name": "Vyara", "type": "town", "district": "Tapi", "taluka": "Vyara", "latitude": "21.1147", "longitude": "73.3941", "is_popular": False, "tagline": "District Capital on Mindhola River"},
    {"name": "Songadh", "type": "town", "district": "Tapi", "taluka": "Songadh", "latitude": "21.1667", "longitude": "73.5500", "is_popular": False, "tagline": "Songadh Fort & Dense Teak Forests"},
    {"name": "Ukai", "type": "town", "district": "Tapi", "taluka": "Songadh", "latitude": "21.2500", "longitude": "73.5833", "is_popular": True, "tagline": "Vallabh Sagar Ukai Dam on Tapi River"},
]

def seed_gujarat_locations():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    inserted = 0
    updated = 0

    now_iso = datetime.now(timezone.utc).isoformat()

    for item in GUJARAT_LOCATIONS:
        name = item["name"].strip()
        slug = slugify(name)

        # Check by name or slug
        cursor.execute("SELECT id, name, slug FROM locations WHERE LOWER(name) = ? OR LOWER(slug) = ?", (name.lower(), slug.lower()))
        row = cursor.fetchone()

        if row:
            loc_id = row[0]
            cursor.execute("""
                UPDATE locations
                SET type = ?, taluka = ?, district = ?, state = 'Gujarat', country = 'India',
                    latitude = COALESCE(latitude, ?), longitude = COALESCE(longitude, ?),
                    tagline = COALESCE(tagline, ?)
                WHERE id = ?
            """, (
                item.get("type", "city"),
                item.get("taluka"),
                item.get("district"),
                item.get("latitude"),
                item.get("longitude"),
                item.get("tagline"),
                loc_id
            ))
            updated += 1
        else:
            cursor.execute("""
                INSERT INTO locations (name, slug, type, taluka, district, state, country, description, tagline, is_popular, latitude, longitude, created_at)
                VALUES (?, ?, ?, ?, ?, 'Gujarat', 'India', ?, ?, ?, ?, ?, ?)
            """, (
                name,
                slug,
                item.get("type", "city"),
                item.get("taluka"),
                item.get("district"),
                item.get("description", f"Explore stays and getaways in {name}, {item.get('district', 'Gujarat')}."),
                item.get("tagline", f"Scenic destination in {item.get('district', 'Gujarat')}"),
                item.get("is_popular", False),
                item.get("latitude"),
                item.get("longitude"),
                now_iso
            ))
            inserted += 1

    conn.commit()

    # Total locations count
    cursor.execute("SELECT count(*) FROM locations WHERE country = 'India' AND state = 'Gujarat'")
    total = cursor.fetchone()[0]

    # Verify no non-Gujarat locations
    cursor.execute("SELECT count(*) FROM locations WHERE state != 'Gujarat' OR country != 'India'")
    non_gujarat = cursor.fetchone()[0]

    conn.close()

    print(f"Seeding completed: {inserted} inserted, {updated} updated.")
    print(f"Total Gujarat locations in database: {total}")
    print(f"Non-Gujarat locations count: {non_gujarat}")

if __name__ == "__main__":
    migrate_schema()
    seed_gujarat_locations()
