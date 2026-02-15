"""
Admin Email Configuration Router

Endpoints for testing and managing email configuration.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

from database.session import get_session, AsyncSession
from dependencies import get_current_site
from models.site import Site
from models.user import User
from middleware.auth import require_admin
from utils.email import email_service

router = APIRouter()


class EmailTestRequest(BaseModel):
    """Request body for testing email configuration"""
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[EmailStr] = None
    smtp_from_name: Optional[str] = None
    test_recipient: Optional[EmailStr] = None  # If not provided, uses admin's email


class EmailTestResponse(BaseModel):
    """Response for email test"""
    success: bool
    message: str
    details: Optional[str] = None


@router.post("/test", response_model=EmailTestResponse)
async def test_email_configuration(
    request: EmailTestRequest,
    current_user: User = Depends(require_admin),
    current_site: Site = Depends(get_current_site),
    session: AsyncSession = Depends(get_session)
):
    """
    Test email configuration by sending a test email.
    
    Can test with:
    1. Provided SMTP credentials in request body (before saving)
    2. Currently saved site credentials (if no credentials in request)
    3. Global credentials (fallback)
    """
    try:
        # Determine recipient
        recipient = request.test_recipient or current_user.email
        
        # Build SMTP config from request or use site config
        smtp_config = None
        if request.smtp_host and request.smtp_username and request.smtp_password:
            # Test with provided credentials (before saving)
            smtp_config = {
                'host': request.smtp_host,
                'port': request.smtp_port or 587,
                'username': request.smtp_username,
                'password': request.smtp_password,
                'from_email': request.smtp_from_email or request.smtp_username,
                'from_name': request.smtp_from_name or current_site.name
            }
            print(f"[EMAIL_TEST] Testing with provided credentials for {current_site.name}")
        else:
            # Test with site's saved credentials
            smtp_config = email_service.get_smtp_config(current_site)
            print(f"[EMAIL_TEST] Testing with saved credentials for {current_site.name}")
        
        # Prepare test email content
        subject = f"Test Email from {current_site.name}"
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #333;">Email Configuration Test</h2>
                <p>This is a test email from <strong>{current_site.name}</strong>.</p>
                <p>If you're reading this, your email configuration is working correctly! ✅</p>
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
                <p style="color: #666; font-size: 12px;">
                    Sent at: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC<br>
                    Site: {current_site.name}<br>
                    Recipient: {recipient}
                </p>
            </body>
        </html>
        """
        
        text_content = f"""
        Email Configuration Test
        
        This is a test email from {current_site.name}.
        If you're reading this, your email configuration is working correctly!
        
        Sent at: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC
        Site: {current_site.name}
        Recipient: {recipient}
        """
        
        # Send test email
        success = email_service.send_smtp_email(
            to_email=recipient,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
            smtp_config=smtp_config
        )
        
        if success:
            return EmailTestResponse(
                success=True,
                message=f"Test email sent successfully to {recipient}",
                details="Please check your inbox (and spam folder) for the test email."
            )
        else:
            return EmailTestResponse(
                success=False,
                message="Failed to send test email",
                details="Please check your SMTP credentials and server settings. See server logs for more details."
            )
            
    except Exception as e:
        print(f"[EMAIL_TEST] Error testing email: {e}")
        import traceback
        traceback.print_exc()
        
        return EmailTestResponse(
            success=False,
            message="Email test failed with error",
            details=str(e)
        )

