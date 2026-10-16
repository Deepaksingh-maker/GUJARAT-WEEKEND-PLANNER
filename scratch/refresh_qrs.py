import sys
import os
import sqlite3

# Connect to database
db_path = "database/app.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

from backend.app.services.qr_service import generate_booking_qr_code

rows = cur.execute("SELECT id, booking_code, verification_token FROM bookings").fetchall()
print(f"Total bookings to check: {len(rows)}")

updated_count = 0
for b_id, b_code, v_token in rows:
    token_to_use = v_token or b_code
    new_qr = generate_booking_qr_code(token_to_use)
    cur.execute("UPDATE bookings SET qr_code_data = ? WHERE id = ?", (new_qr, b_id))
    updated_count += 1

conn.commit()
conn.close()
print(f"Successfully refreshed {updated_count} booking QR codes to encode verification URLs!")
