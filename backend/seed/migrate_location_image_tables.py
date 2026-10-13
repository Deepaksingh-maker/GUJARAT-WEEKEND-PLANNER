"""
Migration to add location image metadata columns and location_images table.
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent.parent / "database" / "app.db"

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Check locations table columns
    cols = [c[1] for c in cursor.execute("PRAGMA table_info(locations)").fetchall()]
    
    new_cols = [
        ("landmark_name", "VARCHAR(255)"),
        ("image_source", "VARCHAR(255)"),
        ("source_url", "VARCHAR(500)"),
        ("image_license", "VARCHAR(100)"),
        ("image_attribution", "VARCHAR(255)")
    ]

    for col_name, col_type in new_cols:
        if col_name not in cols:
            cursor.execute(f"ALTER TABLE locations ADD COLUMN {col_name} {col_type}")
            print(f"Added column {col_name} to locations table.")
        else:
            print(f"Column {col_name} already exists in locations.")

    # 2. Check location_images table
    tables = [r[0] for r in cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
    if "location_images" not in tables:
        cursor.execute("""
            CREATE TABLE location_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
                image_url VARCHAR(500) NOT NULL,
                caption VARCHAR(255),
                source_name VARCHAR(255) DEFAULT 'Wikimedia Commons',
                source_url VARCHAR(500),
                license VARCHAR(100) DEFAULT 'CC BY-SA 4.0',
                attribution VARCHAR(255),
                is_primary BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("CREATE INDEX ix_location_images_location_id ON location_images(location_id)")
        print("Created table location_images and index.")
    else:
        print("Table location_images already exists.")

    conn.commit()
    conn.close()
    print("Location images migration completed successfully.")

if __name__ == "__main__":
    migrate()
