from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import SQLModel
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://henry:Greaterworks!@localhost:5432/lms_db")

# Determine if we're in production
is_production = os.getenv("APP_ENV") == "production"

# Async engine for FastAPI endpoints
# Optimized connection pool settings for better performance
engine = create_async_engine(
    DATABASE_URL,
    echo=not is_production,  # Disable query logging in production
    future=True,
    # Connection pool settings
    pool_size=5,           # Maintain 5 warm connections
    max_overflow=10,       # Allow 10 additional connections under load
    pool_pre_ping=True,    # Verify connections before use (handles stale connections)
    pool_recycle=3600,     # Recycle connections after 1 hour
)

# Synchronous engine for Celery tasks and background jobs
# Convert asyncpg URL to psycopg2 URL for sync engine
SYNC_DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
sync_engine = create_engine(
    SYNC_DATABASE_URL,
    echo=False,
    future=True,
    pool_size=5,
    max_overflow=10,
    pool_recycle=3600,
)

async def init_db():
    async with engine.begin() as conn:
        # await conn.run_sync(SQLModel.metadata.drop_all)
        await conn.run_sync(SQLModel.metadata.create_all)

async def warmup_connections():
    """Pre-warm database connections on startup"""
    try:
        async with engine.begin() as conn:
            # Test the connection with a simple query
            await conn.execute(text("SELECT 1"))
        print("✅ Database connection pool warmed up successfully")
    except Exception as e:
        print(f"⚠️  Database warmup warning: {e}")

async def get_session() -> AsyncSession:
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session
