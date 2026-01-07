from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta, datetime
import uuid
import random
import string
from typing import Optional, Dict

from database.connection import database
from models.schemas import (
    Token, RefreshTokenResponse, UserCreate, UserResponse, LoginRequest,
    PasswordResetRequest, PasswordReset, UserRole
)
from models.auth_schemas import TwoFactorAuthResponse, TwoFactorVerifyRequest
from middleware.auth import (
    authenticate_user, create_access_token, create_refresh_token,
    verify_refresh_token, get_password_hash,
    ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS, get_user_by_email
)
from utils.email import send_password_reset_email, send_welcome_email
from utils.email_async import send_welcome_email_async, send_two_factor_auth_email_async  # Celery background tasks
from utils.validation import validate_email
from utils.redis_client import two_fa_manager, check_redis_connection

router = APIRouter()

@router.post("/register")
async def register(user: UserCreate):
    # Check if user already exists
    existing_user = await get_user_by_email(user.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if username is taken
    query = "SELECT id FROM users WHERE username = :username"
    existing_username = await database.fetch_one(query, values={"username": user.username})
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Hash password and create user
    hashed_password = get_password_hash(user.password)
    user_id = uuid.uuid4()

    query = """
        INSERT INTO users (id, email, username, password_hash, first_name, last_name, role, status)
        VALUES (:id, :email, :username, :password_hash, :first_name, :last_name, :role, 'pending')
        RETURNING *
    """

    values = {
        "id": user_id,
        "email": user.email,
        "username": user.username,
        "password_hash": hashed_password,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role
    }

    new_user = await database.fetch_one(query, values=values)

    # Create user profile
    profile_query = """
        INSERT INTO user_profiles (user_id)
        VALUES (:user_id)
    """
    await database.execute(profile_query, values={"user_id": user_id})

    # Generate 6-digit verification code
    verification_code = ''.join(random.choices(string.digits, k=6))

    # Store verification code in database (expires in 24 hours)
    verification_query = """
        INSERT INTO email_verification_tokens (user_id, token, expires_at)
        VALUES (:user_id, :token, NOW() + INTERVAL '24 hours')
    """
    await database.execute(verification_query, values={
        "user_id": user_id,
        "token": verification_code
    })

    # Send verification email asynchronously via Celery (non-blocking)
    try:
        from utils.email_async import send_email_verification_async
        task_id = send_email_verification_async(user.email, user.first_name, verification_code)
        print(f"Email verification queued for {user.email} (Task ID: {task_id})")
    except Exception as e:
        # Log the error but don't fail registration if email queueing fails
        print(f"Failed to queue verification email for {user.email}: {e}")
        # Fallback to synchronous email if Celery is not available
        try:
            from utils.email import send_email_verification
            await send_email_verification(user.email, user.first_name, verification_code)
        except Exception as e2:
            print(f"Fallback email also failed: {e2}")

    return {
        "message": "Registration successful. Please check your email for verification code.",
        "user_id": str(user_id),
        "email": user.email,
        "requires_verification": True
    }

@router.post("/login")
async def login(login_data: LoginRequest, request: Request, response: Response):
    # Mock credentials check
    is_mock_login = (
        login_data.email == "admin@dcalms.com" and
        login_data.password == "admin123"
    )

    if is_mock_login:
        # Create a mock admin user for demo purposes
        user = type('User', (), {
            'id': uuid.uuid4(),
            'email': 'admin@dcalms.com',
            'username': 'admin',
            'first_name': 'Admin',
            'last_name': 'User',
            'role': 'admin',
            'status': 'active'
        })()
    else:
        # Authenticate against database
        user = await authenticate_user(login_data.email, login_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # Check if user is admin and requires 2FA
    if user.role == UserRole.admin or user.role == 'admin':
        # Generate 6-digit code
        auth_code = ''.join(random.choices(string.digits, k=6))

        # Create session in Redis
        session_id = str(uuid.uuid4())
        session_created = two_fa_manager.create_2fa_session(
            session_id=session_id,
            user_id=str(user.id),
            email=user.email,
            code=auth_code,
            expiry_minutes=10
        )

        if not session_created:
            print(f"[Auth] Failed to create 2FA session in Redis")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to create authentication session. Please try again."
            )

        # Get client IP
        client_ip = request.client.host if request.client else "Unknown"

        # Send 2FA code via email asynchronously using Celery
        try:
            task_id = send_two_factor_auth_email_async(
                user.email,
                user.first_name,
                auth_code,
                client_ip
            )
            print(f"[Auth] 2FA email queued with task ID: {task_id}")
        except Exception as e:
            print(f"[Auth] Failed to queue 2FA email: {e}")
            # Continue anyway for demo purposes

        return TwoFactorAuthResponse(
            requires_2fa=True,
            session_id=session_id,
            message="A verification code has been sent to your email"
        )

    # For non-admin users, proceed with normal login
    if not is_mock_login:
        # Update last login
        update_query = "UPDATE users SET last_login_at = NOW() WHERE id = :user_id"
        await database.execute(update_query, values={"user_id": user.id})

    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )

    # Create refresh token
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    # Set refresh token as HTTP-only cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,  # Only send over HTTPS in production
        samesite="lax",  # CSRF protection
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,  # Convert days to seconds
        path="/api/auth"  # Available site-wide for refresh mechanism
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": UserResponse(**user) if not is_mock_login else {
            "id": str(user.id),
            "email": user.email,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "status": user.status
        }
    }

@router.post("/verify-2fa")
async def verify_two_factor(verify_data: TwoFactorVerifyRequest, response: Response):
    # Verify 2FA code using Redis
    session = two_fa_manager.verify_2fa_code(
        session_id=verify_data.session_id,
        code=verify_data.code
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired verification code"
        )

    # Get user info from session
    user_id = session['user_id']
    user_email = session['email']

    # Check if this is the mock admin
    if user_email == "admin@dcalms.com":
        # Create mock user response
        user_data = {
            "id": user_id,
            "email": "admin@dcalms.com",
            "username": "admin",
            "first_name": "Admin",
            "last_name": "User",
            "role": "admin",
            "status": "active"
        }
    else:
        # Get user from database
        user = await get_user_by_email(user_email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Update last login
        update_query = "UPDATE users SET last_login_at = NOW() WHERE id = :user_id"
        await database.execute(update_query, values={"user_id": user.id})

        user_data = UserResponse(**user)

    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_id}, expires_delta=access_token_expires
    )

    # Create refresh token
    refresh_token = create_refresh_token(data={"sub": user_id})

    # Set refresh token as HTTP-only cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,  # Only send over HTTPS in production
        samesite="lax",  # CSRF protection
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,  # Convert days to seconds
        path="/api/auth"  # Available site-wide for refresh mechanism
    )

    # Clean up session from Redis
    two_fa_manager.invalidate_2fa_session(verify_data.session_id)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user_data
    }

@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token(request: Request, response: Response):
    """
    Refresh access token using HTTP-only refresh token cookie
    """
    # Get refresh token from HTTP-only cookie
    refresh_token = request.cookies.get("refresh_token")

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found"
        )

    # Verify refresh token
    user_id = verify_refresh_token(refresh_token)

    if not user_id:
        # Clear invalid refresh token cookie
        response.delete_cookie(key="refresh_token", path="/")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    # Create new access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_id}, expires_delta=access_token_expires
    )

    # Optionally rotate refresh token (create new one)
    new_refresh_token = create_refresh_token(data={"sub": user_id})
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/auth"
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@router.post("/logout")
async def logout(response: Response):
    """
    Logout user by clearing the HTTP-only refresh token cookie
    """
    # Clear refresh token cookie
    response.delete_cookie(key="refresh_token", path="/")

    return {"message": "Logged out successfully"}

@router.post("/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    user = await get_user_by_email(request.email)
    if not user:
        # Don't reveal if email exists or not
        return {"message": "If the email exists, a password reset link has been sent"}
    
    # Generate reset token
    reset_token = str(uuid.uuid4())
    
    # Store reset token in database
    query = """
        INSERT INTO password_reset_tokens (user_id, token, expires_at)
        VALUES (:user_id, :token, NOW() + INTERVAL '1 hour')
    """
    await database.execute(query, values={"user_id": user.id, "token": reset_token})
    
    # Send reset email
    await send_password_reset_email(user.email, user.first_name, reset_token)
    
    return {"message": "If the email exists, a password reset link has been sent"}

@router.post("/reset-password")
async def reset_password(reset_data: PasswordReset):
    # Verify reset token
    query = """
        SELECT prt.*, u.id as user_id
        FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        WHERE prt.token = :token AND prt.expires_at > NOW() AND prt.used_at IS NULL
    """
    token_record = await database.fetch_one(query, values={"token": reset_data.token})
    
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Hash new password
    hashed_password = get_password_hash(reset_data.new_password)
    
    # Update user password
    update_query = "UPDATE users SET password_hash = :password_hash WHERE id = :user_id"
    await database.execute(update_query, values={
        "password_hash": hashed_password,
        "user_id": token_record.user_id
    })
    
    # Mark token as used
    mark_used_query = "UPDATE password_reset_tokens SET used_at = NOW() WHERE token = :token"
    await database.execute(mark_used_query, values={"token": reset_data.token})
    
    return {"message": "Password reset successfully"}

@router.post("/verify-email/{token}")
async def verify_email(token: str):
    # Verify email token
    query = """
        SELECT evt.*, u.id as user_id
        FROM email_verification_tokens evt
        JOIN users u ON evt.user_id = u.id
        WHERE evt.token = :token AND evt.expires_at > NOW() AND evt.verified_at IS NULL
    """
    token_record = await database.fetch_one(query, values={"token": token})

    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )

    # Update user as verified
    update_user_query = """
        UPDATE users SET email_verified = TRUE, email_verified_at = NOW()
        WHERE id = :user_id
    """
    await database.execute(update_user_query, values={"user_id": token_record.user_id})

    # Mark token as verified
    mark_verified_query = """
        UPDATE email_verification_tokens SET verified_at = NOW()
        WHERE token = :token
    """
    await database.execute(mark_verified_query, values={"token": token})

    return {"message": "Email verified successfully"}

@router.post("/verify-email-code")
async def verify_email_code(verification_data: dict, response: Response):
    """
    Verify email using verification code and activate user account
    """
    code = verification_data.get("code")
    email = verification_data.get("email")

    if not code or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code and email are required"
        )

    # Find the verification token
    query = """
        SELECT evt.*, u.*
        FROM email_verification_tokens evt
        JOIN users u ON evt.user_id = u.id
        WHERE evt.token = :token AND u.email = :email AND evt.expires_at > NOW() AND evt.verified_at IS NULL
    """
    record = await database.fetch_one(query, values={"token": code, "email": email})

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )

    user_id = str(record["user_id"])

    # Update user as verified and active
    update_user_query = """
        UPDATE users SET email_verified = TRUE, email_verified_at = NOW(), status = 'active'
        WHERE id = :user_id
    """
    await database.execute(update_user_query, values={"user_id": user_id})

    # Mark token as verified
    mark_verified_query = """
        UPDATE email_verification_tokens SET verified_at = NOW()
        WHERE token = :token
    """
    await database.execute(mark_verified_query, values={"token": code})

    # Initialize L-Tokens balance for verified user
    token_query = """
        INSERT INTO l_tokens (user_id, balance, total_earned, total_spent)
        VALUES (:user_id, 25.0, 25.0, 0.0)
        ON CONFLICT (user_id) DO NOTHING
    """
    await database.execute(token_query, values={"user_id": user_id})

    # Create welcome token transaction
    transaction_query = """
        INSERT INTO token_transactions (user_id, type, amount, balance_after, description, reference_type)
        VALUES (:user_id, 'bonus', 25.0, 25.0, 'Welcome bonus for joining DCA LMS', 'registration')
        ON CONFLICT DO NOTHING
    """
    await database.execute(transaction_query, values={"user_id": user_id})

    # Create access token for the verified user
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_id}, expires_delta=access_token_expires
    )

    # Create refresh token
    refresh_token = create_refresh_token(data={"sub": user_id})

    # Set refresh token as HTTP-only cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,  # Only send over HTTPS in production
        samesite="lax",  # CSRF protection
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,  # Convert days to seconds
        path="/api/auth"  # Available site-wide for refresh mechanism
    )

    # Create user response without conflicting 'id' field
    user_response_data = {
        "id": user_id,
        "email": record["email"],
        "username": record["username"],
        "first_name": record["first_name"],
        "last_name": record["last_name"],
        "role": record["role"],
        "status": "active"
    }

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user_response_data
    }

@router.post("/resend-verification-code")
async def resend_verification_code(request_data: dict):
    """
    Resend verification code to user's email
    """
    email = request_data.get("email")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required"
        )

    # Check if user exists (regardless of status)
    user_query = """
        SELECT id, first_name, status
        FROM users
        WHERE email = :email
    """
    user = await database.fetch_one(user_query, values={"email": email})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found"
        )

    # If user is already active, they don't need verification
    if user["status"] == "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already verified"
        )

    # Check if there's already an active verification token created within the last minute
    token_query = """
        SELECT id, created_at
        FROM email_verification_tokens
        WHERE user_id = :user_id AND expires_at > NOW() AND verified_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
    """
    existing_token = await database.fetch_one(token_query, values={"user_id": user["id"]})

    # Rate limiting: don't allow resending more than once per minute
    if existing_token:
        from datetime import datetime, timedelta
        token_created = existing_token["created_at"]
        if isinstance(token_created, str):
            token_created = datetime.fromisoformat(token_created.replace('Z', '+00:00'))

        if token_created > datetime.utcnow() - timedelta(minutes=1):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Please wait before requesting another verification code"
            )

    # Generate new 6-digit verification code
    verification_code = ''.join(random.choices(string.digits, k=6))

    # Delete any existing unverified tokens for this user
    delete_query = """
        DELETE FROM email_verification_tokens
        WHERE user_id = :user_id AND verified_at IS NULL
    """
    await database.execute(delete_query, values={"user_id": user["id"]})

    # Store new verification code in database (expires in 24 hours)
    verification_query = """
        INSERT INTO email_verification_tokens (user_id, token, expires_at)
        VALUES (:user_id, :token, NOW() + INTERVAL '24 hours')
    """
    await database.execute(verification_query, values={
        "user_id": user["id"],
        "token": verification_code
    })

    # Send verification email asynchronously via Celery (non-blocking)
    try:
        from utils.email_async import send_email_verification_async
        task_id = send_email_verification_async(email, user["first_name"], verification_code)
        print(f"Email verification resent for {email} (Task ID: {task_id})")
    except Exception as e:
        # Log the error but don't fail resend if email queueing fails
        print(f"Failed to queue verification email resend for {email}: {e}")
        # Fallback to synchronous email if Celery is not available
        try:
            from utils.email import send_email_verification
            await send_email_verification(email, user["first_name"], verification_code)
        except Exception as e2:
            print(f"Fallback email also failed: {e2}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send verification email"
            )

    return {
        "message": "Verification code sent successfully. Please check your email.",
        "email": email
    }
