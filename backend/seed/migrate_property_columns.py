import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent.parent / "database" / "app.db"

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cols = [c[1] for c in cursor.execute("PRAGMA table_info(properties)").fetchall()]
    
    if "data_source" not in cols:
        cursor.execute("ALTER TABLE properties ADD COLUMN data_source VARCHAR(255) DEFAULT 'Public Accommodation Directory'")
        print("Added data_source column")
    else:
        print("data_source already exists")
        
    if "source_url" not in cols:
        cursor.execute("ALTER TABLE properties ADD COLUMN source_url VARCHAR(500)")
        print("Added source_url column")
    else:
        print("source_url already exists")
        
    if "verified_at" not in cols:
        cursor.execute("ALTER TABLE properties ADD COLUMN verified_at VARCHAR(50) DEFAULT '2026-09-30'")
        print("Added verified_at column")
    else:
        print("verified_at already exists")
        
    conn.commit()
    conn.close()
    print("Schema migration completed successfully.")

if __name__ == "__main__":
    migrate()
