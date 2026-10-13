from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from backend.app.config import settings
from backend.app.database import engine, Base
import backend.app.models  # Ensure all models are registered

# Import routers
from backend.app.routes.auth import router as auth_router
from backend.app.routes.locations import router as locations_router
from backend.app.routes.properties import router as properties_router
from backend.app.routes.activities import router as activities_router
from backend.app.routes.bookings import router as bookings_router
from backend.app.routes.payments import router as payments_router
from backend.app.routes.reviews import router as reviews_router
from backend.app.routes.wishlist import router as wishlist_router
from backend.app.routes.coupons import router as coupons_router
from backend.app.routes.planner import router as planner_router
from backend.app.routes.host import router as host_router
from backend.app.routes.admin import router as admin_router
from backend.app.routes.notifications import router as notifications_router
from backend.app.routes.messages import router as messages_router
from backend.app.routes.contacts import router as contacts_router

# Create SQLite tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Production-grade Gujarat Weekend Stays, Villas, Resorts, Farmhouses & Activities Booking Platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for seamless Next.js local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local uploads directory
upload_path = Path(settings.UPLOAD_PATH)
upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_path)), name="uploads")

# Include API routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(locations_router, prefix=settings.API_V1_STR)
app.include_router(properties_router, prefix=settings.API_V1_STR)
app.include_router(activities_router, prefix=settings.API_V1_STR)
app.include_router(bookings_router, prefix=settings.API_V1_STR)
app.include_router(payments_router, prefix=settings.API_V1_STR)
app.include_router(reviews_router, prefix=settings.API_V1_STR)
app.include_router(wishlist_router, prefix=settings.API_V1_STR)
app.include_router(coupons_router, prefix=settings.API_V1_STR)
app.include_router(planner_router, prefix=settings.API_V1_STR)
app.include_router(host_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(messages_router, prefix=settings.API_V1_STR)
app.include_router(contacts_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "platform": "Gujarat Weekend Experiences API",
        "status": "online",
        "version": "1.0.0",
        "documentation": "/api/docs"
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "database": "SQLite (database/app.db)",
        "mode": "production-ready"
    }
