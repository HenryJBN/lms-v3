from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt, ExpiredSignatureError
import bcrypt
from datetime import datetime, timedelta, UTC
from typing import Optional
import os
from dotenv import load_dotenv

from database.connection import database
from models.schemas import UserResponse, UserRole

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

security = HTTPBearer()

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
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now((UTC)) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    """Create a JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.now(UTC) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_user_by_email(email: str):
    """Get user by email from database"""
    query = """
        SELECT u.*, up.title, up.company, up.website, up.linkedin_url, 
               up.twitter_url, up.github_url, up.location, up.interests, 
               up.skills, up.experience_level, up.learning_goals
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE u.email = :email
    """
    return await database.fetch_one(query, values={"email": email})

async def get_user_by_id(user_id: str):
    """Get user by ID from database"""
    query = """
        SELECT u.*, up.title, up.company, up.website, up.linkedin_url, 
               up.twitter_url, up.github_url, up.location, up.interests, 
               up.skills, up.experience_level, up.learning_goals
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE u.id = :user_id
    """
    return await database.fetch_one(query, values={"user_id": user_id})

async def authenticate_user(email: str, password: str):
    """Authenticate a user by email and password"""
    user = await get_user_by_email(email)
    if not user:
        return False
    if not verify_password(password, user.password_hash):
        return False
    return user

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get the current authenticated user from JWT token"""
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
    
    user = await get_user_by_id(user_id)
    if user is None:
        raise credentials_exception
    
    return user

async def get_current_active_user(current_user = Depends(get_current_user)):
    """Get the current active user"""
    if current_user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

async def require_role(required_roles: list):
    """Require specific roles for access"""
    def role_checker(current_user = Depends(get_current_active_user)):
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    return role_checker

# Role-specific dependencies
async def require_admin(current_user = Depends(get_current_active_user)):
    """Require admin role"""
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

async def require_instructor_or_admin(current_user = Depends(get_current_active_user)):
    """Require instructor or admin role"""
    if current_user.role not in [UserRole.instructor, UserRole.admin]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Instructor or admin access required"
        )
    return current_user

def verify_refresh_token(token: str) -> Optional[str]:
    """
    Verify a refresh token and return the user ID.
    Returns None if token is invalid, expired, or not a refresh token.
    """
    try:
        # jwt.decode automatically validates expiration (exp claim)
        # and raises ExpiredSignatureError if token is expired
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")

        # Verify this is a refresh token (not an access token)
        if user_id is None or token_type != "refresh":
            return None

        return user_id
    except ExpiredSignatureError:
        # Token has expired
        return None
    except JWTError:
        # Token is invalid (malformed, wrong signature, etc.)
        return None
