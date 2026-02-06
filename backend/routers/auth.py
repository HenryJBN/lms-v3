from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta, datetime
import uuid
import random
import string
from typing import Optional, Dict
from sqlmodel import select, text
from sqlmodel.ext.asyncio.session import AsyncSession

from database.session import get_session
from dependencies import get_current_site
from models.site import Site
from models.user import User
from models.enums import UserRole, UserStatus
from schemas.user import UserCreate, UserResponse
from schemas.auth import (
    Token, RefreshTokenResponse, LoginRequest,
    PasswordResetRequest, PasswordReset,
    TwoFactorAuthResponse, TwoFactorVerifyRequest
)
from models.auth_tokens import PasswordResetToken, EmailVerificationToken
from middleware.auth import (
    authenticate_user, create_access_token, create_refresh_token,
    verify_refresh_token, get_password_hash,
    ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS, get_user_by_email
)
from utils.email import send_password_reset_email
from utils.email_async import send_welcome_email_async, send_two_factor_auth_email_async, send_email_verification_async
from utils.validation import validate_email
from utils.redis_client import two_fa_manager

router = APIRouter()

@router.post("/register")
async def register(
    user_in: UserCreate,
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    # Check if user already exists IN THIS SITE
    existing_user = await get_user_by_email(user_in.email, session, str(current_site.id))
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if username is taken IN THIS SITE
    query = select(User).where(User.username == user_in.username, User.site_id == current_site.id)
    result = await session.exec(query)
    existing_username = result.first()
    
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Create new user
    new_user = User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=get_password_hash(user_in.password),
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        role=user_in.role,
        site_id=current_site.id,
        status=UserStatus.pending
    )
    
    session.add(new_user)
    # We commit here to get the ID
    await session.commit()
    await session.refresh(new_user)

    # Generate verification code
    verification_code = ''.join(random.choices(string.digits, k=6))
    
    # Use ORM for tokens
    verification_token = EmailVerificationToken(
        user_id=new_user.id,
        token=verification_code,
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )
    session.add(verification_token)
    await session.commit()

    # Send email
    try:
        send_email_verification_async(new_user.email, new_user.first_name, verification_code)
    except Exception as e:
        print(f"Failed to queue verification email: {e}")

    return {
        "message": "Registration successful. Please check your email for verification code.",
        "user_id": str(new_user.id),
        "email": new_user.email,
        "requires_verification": True
    }

@router.post("/login")
async def login(
    login_data: LoginRequest, 
    request: Request, 
    response: Response,
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    # Authenticate against database and site
    user = await authenticate_user(login_data.email, login_data.password, session, str(current_site.id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    user.last_login_at = datetime.utcnow()
    session.add(user)
    await session.commit()

    # Create tokens
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    response.set_cookie(
        key="refresh_token", value=refresh_token, 
        httponly=True, secure=False, samesite="lax", 
        domain=".dcalms.test" if "dcalms.test" in request.url.hostname else None,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400, path="/api/auth"
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            status=user.status,
            site_id=user.site_id,
            email_verified=user.email_verified if hasattr(user, 'email_verified') else False,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
    }

@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token_endpoint(request: Request, response: Response):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token not found")

    user_id = verify_refresh_token(refresh_token)
    if not user_id:
        response.delete_cookie(key="refresh_token", path="/api/auth")
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    access_token = create_access_token(data={"sub": user_id})
    new_refresh_token = create_refresh_token(data={"sub": user_id})
    
    response.set_cookie(
        key="refresh_token", value=new_refresh_token, 
        httponly=True, secure=False, samesite="lax", 
        domain=".dcalms.test" if "dcalms.test" in request.url.hostname else None,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400, path="/api/auth"
    )

    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="refresh_token", path="/api/auth")
    return {"message": "Logged out successfully"}

@router.post("/forgot-password")
async def forgot_password(
    request: PasswordResetRequest,
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    user = await get_user_by_email(request.email, session, str(current_site.id))
    if not user:
        return {"message": "If the email exists, a password reset link has been sent"}
    
    reset_token_str = str(uuid.uuid4())
    
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=reset_token_str,
        expires_at=datetime.utcnow() + timedelta(hours=1)
    )
    session.add(reset_token)
    await session.commit()
    
    await send_password_reset_email(user.email, user.first_name, reset_token_str)
    return {"message": "If the email exists, a password reset link has been sent"}

@router.post("/reset-password")
async def reset_password(
    reset_data: PasswordReset,
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    # Verify reset token
    query = select(PasswordResetToken, User).join(User, PasswordResetToken.user_id == User.id).where(
        PasswordResetToken.token == reset_data.token,
        PasswordResetToken.expires_at > datetime.utcnow(),
        PasswordResetToken.used_at == None,
        User.site_id == current_site.id
    )
    result = await session.exec(query)
    token_record_pair = result.first()
    
    if not token_record_pair:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    token_record, user = token_record_pair
    
    hashed_password = get_password_hash(reset_data.new_password)
    user.hashed_password = hashed_password
    session.add(user)
    
    # Mark token as used
    token_record.used_at = datetime.utcnow()
    session.add(token_record)
    await session.commit()
    return {"message": "Password reset successfully"}

@router.post("/verify-email-code")
async def verify_email_code(
    verification_data: dict, 
    response: Response,
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    code = verification_data.get("code")
    email = verification_data.get("email")
    
    if not code or not email:
        raise HTTPException(status_code=400, detail="Code and email are required")
        
    # Find token and user
    query = select(EmailVerificationToken, User).join(User, EmailVerificationToken.user_id == User.id).where(
        EmailVerificationToken.token == code,
        User.email == email,
        EmailVerificationToken.expires_at > datetime.utcnow(),
        EmailVerificationToken.verified_at == None,
        User.site_id == current_site.id
    )
    result = await session.exec(query)
    record_pair = result.first()
    
    if not record_pair:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")
        
    record, user = record_pair
    
    # Update user
    user.status = UserStatus.active
    session.add(user)
    
    # Mark token verified
    record.verified_at = datetime.utcnow()
    session.add(record)
    await session.commit()
        
    # Issue tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    response.set_cookie(
        key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", domain=".dcalms.test" if "dcalms.test" in request.url.hostname else None, max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400, path="/api/auth"
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            status=user.status,
            site_id=user.site_id,
            email_verified=True,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
    }
