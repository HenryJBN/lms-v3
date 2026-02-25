from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import SQLModel
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://henry:Greaterworks!@127.0.0.1:5432/lms_db")

# Determine if we're in production
is_production = os.getenv("APP_ENV") == "production"

POOL_SIZE = 10

# Async engine for FastAPI endpoints
engine = create_async_engine(
    DATABASE_URL,
    echo=False,             # Disable SQL logging for performance (use logging level instead)
    future=True,
    pool_size=POOL_SIZE,    # Maintain warm connections
    max_overflow=20,        # Allow additional connections under load
    pool_pre_ping=True,     # Verify connections before use (handles stale connections)
    pool_recycle=3600,      # Recycle connections after 1 hour
)

# Synchronous engine for Celery tasks and background jobs
SYNC_DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
sync_engine = create_engine(
    SYNC_DATABASE_URL,
    echo=False,
    future=True,
    pool_size=5,
    max_overflow=10,
    pool_recycle=3600,
)

# Create sessionmaker ONCE at module level (singleton)
async_session_factory = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def init_db():
    """Initialize database tables.
    
    Skipped by default since tables are managed by migrations.
    Set INIT_DB=1 to force table creation (e.g. first-time setup).
    """
    if not os.getenv("INIT_DB"):
        print("⏭️  Skipping init_db (tables managed by migrations). Set INIT_DB=1 to force.")
        return
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    print("✅ Database tables created")

async def warmup_connections():
    """Pre-warm the full connection pool on startup"""
    async def _ping():
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))

    try:
        # Warm POOL_SIZE connections in parallel
        await asyncio.gather(*[_ping() for _ in range(POOL_SIZE)])
        print(f"✅ Database connection pool warmed up ({POOL_SIZE} connections)")
    except Exception as e:
        print(f"⚠️  Database warmup warning: {e}")

async def get_session() -> AsyncSession:
    async with async_session_factory() as session:
        yield session
