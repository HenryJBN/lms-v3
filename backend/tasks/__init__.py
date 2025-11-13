# Tasks package
# Import all tasks to ensure they're registered with Celery
from tasks.email_tasks import (
    send_welcome_email_task,
    send_custom_email_task,
    send_course_enrollment_email_task,
    send_certificate_email_task,
    send_bulk_emails_task,
    send_password_reset_email_task,
    send_email_verification_task,
    send_two_factor_auth_email_task,
)

__all__ = [
    'send_welcome_email_task',
    'send_custom_email_task',
    'send_course_enrollment_email_task',
    'send_certificate_email_task',
    'send_bulk_emails_task',
    'send_password_reset_email_task',
    'send_email_verification_task',
    'send_two_factor_auth_email_task',
]
