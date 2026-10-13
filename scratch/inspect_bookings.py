import sqlite3

conn = sqlite3.connect('database/app.db')
c = conn.cursor()

print("Bookings count:", c.execute("SELECT COUNT(*) FROM bookings").fetchone()[0])
rows = c.execute("SELECT id, status, payment_status, total, check_in, check_out, created_at FROM bookings LIMIT 10").fetchall()
for r in rows:
    print(r)

print("\nProperties count:", c.execute("SELECT COUNT(*) FROM properties").fetchone()[0])
print("Users count:", c.execute("SELECT COUNT(*) FROM users").fetchone()[0])
print("Hosts count:", c.execute("SELECT COUNT(*) FROM hosts").fetchone()[0])
