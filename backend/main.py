
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import uvicorn
from typing import Optional
import os
from dotenv import load_dotenv

from database.connection import database, engine, metadata
from routers import (
    auth, users, courses, lessons, categories, enrollments,
    progress, certificates, notifications, admin, analytics, sections, assignments
)
from middleware.auth import get_current_user
from middleware.logging import setup_logging

load_dotenv()

# Setup logging
setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await database.connect()
    yield
    # Shutdown
    await database.disconnect()

app = FastAPI(
    title="DCA LMS API",
    description="Advanced Learning Management System with Blockchain Integration",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "Accept-Ranges", "Content-Length", "Content-Type"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(courses.router, prefix="/api/courses", tags=["Courses"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(enrollments.router, prefix="/api/enrollments", tags=["Enrollments"])
app.include_router(progress.router, prefix="/api/progress", tags=["Progress"])
app.include_router(lessons.router, prefix="/api/lessons", tags=["Lessons"])
app.include_router(certificates.router, prefix="/api/certificates", tags=["Certificates"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(sections.router, prefix="/api/sections", tags=["Sections"])
app.include_router(assignments.router, prefix="/api/assignments", tags=["Assignments"])

# Mount static files directory for uploaded files
from utils.file_upload import LOCAL_UPLOAD_PATH
os.makedirs(LOCAL_UPLOAD_PATH, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=LOCAL_UPLOAD_PATH), name="uploads")


@app.get("/")
async def root():
    return {"message": "DCA LMS API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    from utils.redis_client import check_redis_connection

    health_status = {
        "status": "healthy",
        "database": "unknown",
        "redis": "unknown"
    }

    # Test database connection
    try:
        await database.fetch_one("SELECT 1")
        health_status["database"] = "connected"
    except Exception as e:
        health_status["database"] = "disconnected"
        health_status["status"] = "unhealthy"

    # Test Redis connection
    try:
        if check_redis_connection():
            health_status["redis"] = "connected"
        else:
            health_status["redis"] = "disconnected"
            health_status["status"] = "degraded"  # Redis is optional for some features
    except Exception as e:
        health_status["redis"] = "disconnected"
        health_status["status"] = "degraded"

    # Return appropriate status code
    if health_status["status"] == "unhealthy":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=health_status
        )

    return health_status

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("ENVIRONMENT") == "development"
    )
