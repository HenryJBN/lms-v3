"""
Celery tasks for sending emails in the background

This module provides thin wrappers around the email functions in utils/email.py
All email logic is centralized in email.py - these tasks just handle the Celery integration
"""
from celery_app import celery_app
from typing import Optional, List, Dict, Any

# Import the synchronous email functions from email.py
# We use the _sync versions because Celery tasks must be synchronous
from utils.email import (
    send_welcome_email_sync,
    send_custom_email_sync,
    send_course_enrollment_email_sync,
    send_certificate_email_sync,
    send_bulk_email_sync,
    send_password_reset_email_sync,
    send_email_verification_sync,
    send_two_factor_auth_email_sync
)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_welcome_email_task(self, email: str, first_name: str, include_guide: bool = False, guide_path: Optional[str] = None):
    """
    Celery task to send welcome email to new user

    This is a thin wrapper around send_welcome_email_sync from utils/email.py
    All email logic is in email.py - this just handles Celery retry logic
    """
    try:
        print(f"[Celery] Attempting to send welcome email to {email}")
        print(f"[Celery] Parameters: first_name={first_name}, include_guide={include_guide}, guide_path={guide_path}")

        result = send_welcome_email_sync(email, first_name, include_guide, guide_path)

        print(f"[Celery] send_welcome_email_sync returned: {result}")

        if result:
            return {"status": "success", "to_email": email, "subject": "Welcome to DCA LMS! 🎉"}
        else:
            print(f"[Celery] Email sending failed - result was False")
            raise Exception("Email sending returned False - check email.py logs for details")
    except Exception as e:
        print(f"[Celery] Failed to send welcome email: {e}")
        import traceback
        traceback.print_exc()
        raise self.retry(exc=e)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_custom_email_task(
    self,
    to_email: str,
    subject: str,
    template_name: str,
    context: Dict[str, Any],
    attachments: Optional[List[Dict[str, Any]]] = None
):
    """
    Celery task to send custom email with template

    This is a thin wrapper around send_custom_email_sync from utils/email.py
    """
    try:
        result = send_custom_email_sync(to_email, subject, template_name, context, attachments)
        if result:
            return {"status": "success", "to_email": to_email, "subject": subject}
        else:
            raise Exception("Email sending returned False")
    except Exception as e:
        print(f"[Celery] Failed to send custom email: {e}")
        raise self.retry(exc=e)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_course_enrollment_email_task(self, email: str, first_name: str, course_title: str, course_url: str):
    """
    Celery task to send course enrollment confirmation email

    This is a thin wrapper around send_course_enrollment_email_sync from utils/email.py
    """
    try:
        result = send_course_enrollment_email_sync(email, first_name, course_title, course_url)
        if result:
            return {"status": "success", "to_email": email, "subject": f"Enrollment Confirmed: {course_title}"}
        else:
            raise Exception("Email sending returned False")
    except Exception as e:
        print(f"[Celery] Failed to send enrollment email: {e}")
        raise self.retry(exc=e)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_certificate_email_task(self, email: str, first_name: str, course_title: str, certificate_url: str):
    """
    Celery task to send certificate issued email

    This is a thin wrapper around send_certificate_email_sync from utils/email.py
    """
    try:
        result = send_certificate_email_sync(email, first_name, course_title, certificate_url)
        if result:
            return {"status": "success", "to_email": email, "subject": f"Certificate Issued: {course_title} 🏆"}
        else:
            raise Exception("Email sending returned False")
    except Exception as e:
        print(f"[Celery] Failed to send certificate email: {e}")
        raise self.retry(exc=e)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_bulk_emails_task(self, recipients: List[str], subject: str, template_name: str, context: Dict[str, Any]):
    """
    Celery task to send bulk emails to multiple recipients

    This is a thin wrapper around send_bulk_email_sync from utils/email.py
    """
    try:
        results = send_bulk_email_sync(recipients, subject, template_name, context)
        return results
    except Exception as e:
        print(f"[Celery] Failed to send bulk emails: {e}")
        raise self.retry(exc=e)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_password_reset_email_task(self, email: str, first_name: str, reset_token: str):
    """
    Celery task to send password reset email

    This is a thin wrapper around send_password_reset_email_sync from utils/email.py
    """
    try:
        result = send_password_reset_email_sync(email, first_name, reset_token)
        if result:
            return {"status": "success", "to_email": email, "subject": "Reset Your Password - DCA LMS"}
        else:
            raise Exception("Email sending returned False")
    except Exception as e:
        print(f"[Celery] Failed to send password reset email: {e}")
        raise self.retry(exc=e)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_email_verification_task(self, email: str, first_name: str, verification_token: str):
    """
    Celery task to send email verification

    This is a thin wrapper around send_email_verification_sync from utils/email.py
    """
    try:
        result = send_email_verification_sync(email, first_name, verification_token)
        if result:
            return {"status": "success", "to_email": email, "subject": "Verify Your Email - DCA LMS"}
        else:
            raise Exception("Email sending returned False")
    except Exception as e:
        print(f"[Celery] Failed to send email verification: {e}")
        raise self.retry(exc=e)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_two_factor_auth_email_task(self, email: str, first_name: str, auth_code: str, ip_address: str = "Unknown"):
    """
    Celery task to send two-factor authentication code email

    This is a thin wrapper around send_two_factor_auth_email_sync from utils/email.py
    """
    try:
        print(f"[Celery] Attempting to send 2FA email to {email}")
        print(f"[Celery] Parameters: first_name={first_name}, auth_code={auth_code}, ip_address={ip_address}")

        result = send_two_factor_auth_email_sync(email, first_name, auth_code, ip_address)

        print(f"[Celery] send_two_factor_auth_email_sync returned: {result}")

        if result:
            return {"status": "success", "to_email": email, "subject": "Your Two-Factor Authentication Code - DCA LMS"}
        else:
            print(f"[Celery] 2FA email sending failed - result was False")
            raise Exception("Email sending returned False - check email.py logs for details")
    except Exception as e:
        print(f"[Celery] Failed to send 2FA email: {e}")
        import traceback
        traceback.print_exc()
        raise self.retry(exc=e)
