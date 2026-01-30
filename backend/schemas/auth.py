from pydantic import EmailStr
from schemas.common import BaseSchema
from schemas.user import UserResponse

class Token(BaseSchema):
    access_token: str
    token_type: str
    expires_in: int
    user: UserResponse

class RefreshTokenResponse(BaseSchema):
    access_token: str
    token_type: str
    expires_in: int

class LoginRequest(BaseSchema):
    email: EmailStr
    password: str

class PasswordResetRequest(BaseSchema):
    email: EmailStr

class PasswordReset(BaseSchema):
    token: str
    new_password: str

class TwoFactorAuthResponse(BaseSchema):
    requires_2fa: bool
    session_id: str
    message: str

class TwoFactorVerifyRequest(BaseSchema):
    session_id: str
    code: str
