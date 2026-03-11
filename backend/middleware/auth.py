from fastapi import Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt, ExpiredSignatureError
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, List
import uuid
import os
from dotenv import load_dotenv
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_session
from dependencies import get_current_site, SiteData
from models.user import User, UserSession
from models.enums import UserRole, UserStatus
from sqlalchemy import desc

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

security = HTTPBearer()

# Cached admin site ID — resolved once at startup via init_admin_site_cache()
_admin_site_id: Optional[uuid.UUID] = None


async def init_admin_site_cache():
    """Resolve the admin site ID once and cache it. Called during app lifespan startup."""
    global _admin_site_id
    from database.session import async_session_factory
    from models.site import Site
    async with async_session_factory() as session:
        result = await session.exec(select(Site).where(Site.subdomain == "admin"))
        admin_site = result.first()
        if admin_site:
            _admin_site_id = admin_site.id
            print(f"✅ Admin site ID cached: {_admin_site_id}")
        else:
            print("⚠️  No admin site found — super admin bypass disabled")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash using bcrypt directly"""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'), 
        hashed_password.encode('utf-8')
    )

def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt directly"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    """Create a JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_user_by_email(email: str, session: AsyncSession, site_id: str):
    """Get user by email from database for a specific site"""
    query = select(User).where(User.email == email, User.site_id == site_id)
    result = await session.exec(query)
    return result.first()

async def get_user_by_id(user_id: str, session: AsyncSession):
    """Get user by ID from database"""
    query = select(User).where(User.id == user_id)
    result = await session.exec(query)
    return result.first()

async def authenticate_user(email: str, password: str, session: AsyncSession, site_id: str):
    """Authenticate a user by email and password scoped to the site"""
    user = await get_user_by_email(email, session, site_id)
    if not user:
        return False
    if not verify_password(password, user.password_hash):
        return False
    return user


async def update_session_activity_background(user_id: uuid.UUID, site_id: uuid.UUID):
    """
    Update the last_activity timestamp for the user's most recent active session.
    Called as a background task to avoid blocking the main request flow.
    """
    from database.session import async_session_factory
    async with async_session_factory() as session:
        # Find matches for this user and site, pick the most recent active one
        query = select(UserSession).where(
            UserSession.user_id == user_id,
            UserSession.site_id == site_id,
            UserSession.is_active == True
        ).order_by(desc(UserSession.login_time)).limit(1)
        
        result = await session.exec(query)
        user_session = result.first()
        
        if user_session:
            # Only update if last activity was more than 1 minute ago to save DB writes
            if (datetime.now(timezone.utc) - user_session.last_activity.replace(tzinfo=timezone.utc)).total_seconds() > 60:
                user_session.last_activity = datetime.utcnow()
                session.add(user_session)
                await session.commit()

async def get_current_user(
    background_tasks: BackgroundTasks,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    """Get the current authenticated user ensuring they belong to the current site"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if user_id is None or token_type != "access":
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await get_user_by_id(user_id, session)
    if user is None:
        raise credentials_exception
        
    # Super Admin Bypass: uses cached admin site ID (no DB query per request)
    is_super_admin = (
        _admin_site_id is not None
        and user.site_id == _admin_site_id
        and user.role == UserRole.admin
    )

    if not is_super_admin and str(user.site_id) != str(current_site.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not belong to this site"
        )
    
    if background_tasks and not is_super_admin:
        background_tasks.add_task(update_session_activity_background, user.id, current_site.id)
        
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    """Get the current active user"""
    if current_user.status != UserStatus.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

async def require_admin(current_user: User = Depends(get_current_active_user)):
    """Require admin role"""
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

async def require_instructor_or_admin(current_user: User = Depends(get_current_active_user)):
    """Require instructor or admin role"""
    if current_user.role not in [UserRole.instructor, UserRole.admin]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Instructor or admin access required"
        )
    return current_user

async def require_super_admin(
    current_user: User = Depends(get_current_active_user),
):
    """
    Require Super Admin status.
    Uses cached admin site ID — no DB query needed.
    """
    if (
        _admin_site_id is None
        or current_user.site_id != _admin_site_id
        or current_user.role != UserRole.admin
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required"
        )
    return current_user

def verify_refresh_token(token: str) -> Optional[str]:
    """Verify refresh token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")

        if user_id is None or token_type != "refresh":
            return None

        return user_id
    except ExpiredSignatureError:
        return None
    except JWTError:
        return None
