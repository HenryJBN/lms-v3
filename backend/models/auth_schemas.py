from pydantic import BaseModel

class TwoFactorAuthResponse(BaseModel):
    requires_2fa: bool
    session_id: str
    message: str

class TwoFactorVerifyRequest(BaseModel):
    session_id: str
    code: str

