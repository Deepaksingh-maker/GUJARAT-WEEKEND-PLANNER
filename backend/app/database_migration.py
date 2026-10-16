import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "..", "..", "database", "app.db")
if not os.path.exists(db_path):
    # Try direct path
    db_path = "database/app.db"

print(f"Connecting to database at: {os.path.abspath(db_path)}")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Enable WAL mode and busy_timeout
cur.execute("PRAGMA journal_mode=WAL;")
cur.execute("PRAGMA busy_timeout=10000;")

# 1. Check properties table for total_units
cols = [r[1] for r in cur.execute("PRAGMA table_info(properties)").fetchall()]
if "total_units" not in cols:
    print("Adding total_units column to properties...")
    cur.execute("ALTER TABLE properties ADD COLUMN total_units INTEGER DEFAULT 1 NOT NULL;")
else:
    print("Column total_units already exists in properties.")

# 2. Check bookings table for quantity and hold_expires_at
b_cols = [r[1] for r in cur.execute("PRAGMA table_info(bookings)").fetchall()]
if "quantity" not in b_cols:
    print("Adding quantity column to bookings...")
    cur.execute("ALTER TABLE bookings ADD COLUMN quantity INTEGER DEFAULT 1 NOT NULL;")
else:
    print("Column quantity already exists in bookings.")

if "hold_expires_at" not in b_cols:
    print("Adding hold_expires_at column to bookings...")
    cur.execute("ALTER TABLE bookings ADD COLUMN hold_expires_at DATETIME;")
else:
    print("Column hold_expires_at already exists in bookings.")

# 3. Create inventory_blocks table
cur.execute("""
CREATE TABLE IF NOT EXISTS inventory_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    unit_id INTEGER,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    blocked_units INTEGER DEFAULT 1 NOT NULL,
    reason TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE
);
""")
cur.execute("CREATE INDEX IF NOT EXISTS ix_inventory_blocks_prop_dates ON inventory_blocks (property_id, start_date, end_date);")
print("Ensured inventory_blocks table and index.")

# 4. Check bookings table for verification_token and check-in tracking columns
import secrets

if "verification_token" not in b_cols:
    print("Adding verification_token column to bookings...")
    cur.execute("ALTER TABLE bookings ADD COLUMN verification_token VARCHAR(100);")
    cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_bookings_verification_token ON bookings (verification_token);")
else:
    print("Column verification_token already exists in bookings.")

if "is_checked_in" not in b_cols:
    print("Adding is_checked_in column to bookings...")
    cur.execute("ALTER TABLE bookings ADD COLUMN is_checked_in BOOLEAN DEFAULT 0 NOT NULL;")
else:
    print("Column is_checked_in already exists in bookings.")

if "checked_in_at" not in b_cols:
    print("Adding checked_in_at column to bookings...")
    cur.execute("ALTER TABLE bookings ADD COLUMN checked_in_at DATETIME;")
else:
    print("Column checked_in_at already exists in bookings.")

if "checked_in_by_user_id" not in b_cols:
    print("Adding checked_in_by_user_id column to bookings...")
    cur.execute("ALTER TABLE bookings ADD COLUMN checked_in_by_user_id INTEGER REFERENCES users (id) ON DELETE SET NULL;")
else:
    print("Column checked_in_by_user_id already exists in bookings.")

# Backfill any bookings missing verification_token
rows = cur.execute("SELECT id, booking_code, verification_token FROM bookings WHERE verification_token IS NULL OR verification_token = ''").fetchall()
if rows:
    print(f"Backfilling verification_token for {len(rows)} bookings...")
    for row in rows:
        b_id = row[0]
        token = f"gwk_{secrets.token_urlsafe(24)}"
        cur.execute("UPDATE bookings SET verification_token = ? WHERE id = ?", (token, b_id))
    print("Backfill complete.")

conn.commit()
conn.close()
print("Migration completed successfully.")
