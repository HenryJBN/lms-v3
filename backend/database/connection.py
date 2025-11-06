# backend/database/connection.py

import os
from dotenv import load_dotenv
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import databases

# -----------------------------------------------------------------------------
# Load environment variables
# -----------------------------------------------------------------------------
load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://henry:Greaterworks!@localhost:5432/lms_db"
)

# -----------------------------------------------------------------------------
# SQLAlchemy Base and Metadata
# -----------------------------------------------------------------------------
Base = declarative_base()
metadata = Base.metadata  # Export metadata for migrations, Alembic, etc.

# -----------------------------------------------------------------------------
# Async SQLAlchemy Engine
# -----------------------------------------------------------------------------
engine = create_async_engine(
    DATABASE_URL,
    echo=False,            # Set True for debugging
    future=True,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# -----------------------------------------------------------------------------
# Async Session Factory
# -----------------------------------------------------------------------------
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

# -----------------------------------------------------------------------------
# Databases wrapper (optional, simpler async queries)
# -----------------------------------------------------------------------------
database = databases.Database(DATABASE_URL)

# -----------------------------------------------------------------------------
# FastAPI Dependency for async session
# -----------------------------------------------------------------------------
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# -----------------------------------------------------------------------------
# Optional FastAPI dependency for `databases.Database`
# -----------------------------------------------------------------------------
async def get_database() -> databases.Database:
    if not database.is_connected:
        await database.connect()
    return database
