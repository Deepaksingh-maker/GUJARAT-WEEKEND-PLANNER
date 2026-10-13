import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_DIR = BASE_DIR / "database"
DB_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "Gujarat Weekend Bookings"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "gujarat_super_secret_weekend_jwt_key_2026_change_in_prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # SQLite Database location
    DATABASE_URL: str = f"sqlite:///{DB_DIR / 'app.db'}"
    
    # Upload paths
    UPLOAD_PATH: str = str(UPLOAD_DIR)
    
    # Razorpay (sandbox/simulation keys)
    RAZORPAY_KEY_ID: str = "rzp_test_gujarat_weekend"
    RAZORPAY_KEY_SECRET: str = "secret_gujarat_key_simulation"
    RAZORPAY_SIMULATION_MODE: bool = True  # Allows full verifiable mock checkouts
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()

