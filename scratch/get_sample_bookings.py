import sqlite3
conn = sqlite3.connect('database/app.db')
c = conn.cursor()
rows = c.execute("SELECT id, booking_code, verification_token, status, is_checked_in FROM bookings LIMIT 5").fetchall()
for r in rows:
    print(r)
conn.close()
