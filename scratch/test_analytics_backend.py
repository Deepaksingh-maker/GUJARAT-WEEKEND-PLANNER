import sqlite3
from datetime import datetime, date, timedelta
from collections import defaultdict

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

# 1. Total revenue
paid_rows = c.execute("""
    SELECT b.id, b.total, b.status, b.payment_status, b.check_in, b.created_at,
           p.name, p.property_type, p.price_per_night, p.host_id,
           COALESCE(l.name, 'Gujarat') as location_name
    FROM bookings b
    LEFT JOIN properties p ON b.property_id = p.id
    LEFT JOIN locations l ON p.location_id = l.id
""").fetchall()

total_revenue = sum(r[1] for r in paid_rows if r[2] in ['CONFIRMED', 'COMPLETED'])
platform_commission = round(total_revenue * 0.10, 2)
host_payouts = round(total_revenue * 0.90, 2)

# Monthly breakdown (last 6 months)
monthly_data = defaultdict(lambda: {"revenue": 0.0, "bookings": 0, "commission": 0.0})
for r in paid_rows:
    created = r[5]
    if created:
        dt = datetime.fromisoformat(created)
        key = dt.strftime("%b %Y")
        if r[2] in ['CONFIRMED', 'COMPLETED']:
            monthly_data[key]["revenue"] += r[1]
            monthly_data[key]["commission"] += round(r[1] * 0.10, 2)
        monthly_data[key]["bookings"] += 1

# Location breakdown
city_rev = defaultdict(lambda: {"revenue": 0.0, "bookings": 0})
for r in paid_rows:
    city = r[10]
    if r[2] in ['CONFIRMED', 'COMPLETED']:
        city_rev[city]["revenue"] += r[1]
    city_rev[city]["bookings"] += 1

# Property type breakdown
type_rev = defaultdict(lambda: {"revenue": 0.0, "count": 0})
for r in paid_rows:
    ptype = r[7] or "villa"
    if r[2] in ['CONFIRMED', 'COMPLETED']:
        type_rev[ptype]["revenue"] += r[1]
    type_rev[ptype]["count"] += 1

# Booking status
status_counts = defaultdict(int)
for r in paid_rows:
    status_counts[r[2]] += 1

print("Total Revenue:", total_revenue)
print("Monthly:", dict(monthly_data))
print("City Rev:", dict(city_rev))
print("Type Rev:", dict(type_rev))
print("Statuses:", dict(status_counts))
