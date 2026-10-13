import sqlite3
from datetime import datetime

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

# Check bookings with property & location join
rows = c.execute('''
    SELECT b.id, b.status, b.payment_status, b.total, b.check_in, b.check_out, b.created_at,
           p.name, p.property_type, p.host_id,
           l.name as location_name
    FROM bookings b
    LEFT JOIN properties p ON b.property_id = p.id
    LEFT JOIN locations l ON p.location_id = l.id
''').fetchall()

print(f"Total bookings joined: {len(rows)}")
for r in rows[:8]:
    print(r)
