"""
Async email wrapper for Celery tasks
Use this module to send emails asynchronously via Celery
"""
from typing import Optional, List, Dict, Any
from tasks.email_tasks import (
    send_welcome_email_task,
    send_custom_email_task,
    send_course_enrollment_email_task,
    send_certificate_email_task,
    send_bulk_emails_task,
    send_password_reset_email_task,
    send_email_verification_task,
    send_two_factor_auth_email_task
)


def send_welcome_email_async(
    email: str,
    first_name: str,
    include_guide: bool = False,
    guide_path: Optional[str] = None
) -> str:
    """
    Queue welcome email to be sent in background
    
    Args:
        email: User's email address
        first_name: User's first name
        include_guide: Whether to include getting started guide
        guide_path: Path to the guide PDF
    
    Returns:
        str: Task ID for tracking
    """
    task = send_welcome_email_task.delay(email, first_name, include_guide, guide_path)
    return task.id


def send_custom_email_async(
    to_email: str,
    subject: str,
    template_name: str,
    context: Dict[str, Any],
    attachments: Optional[List[Dict[str, Any]]] = None
) -> str:
    """
    Queue custom email to be sent in background
    
    Args:
        to_email: Recipient email
        subject: Email subject
        template_name: Name of the template file
        context: Template context variables
        attachments: Optional list of attachments
    
    Returns:
        str: Task ID for tracking
    """
    task = send_custom_email_task.delay(to_email, subject, template_name, context, attachments)
    return task.id


def send_course_enrollment_email_async(
    email: str,
    first_name: str,
    course_title: str,
    course_url: str
) -> str:
    """
    Queue course enrollment email to be sent in background
    
    Returns:
        str: Task ID for tracking
    """
    task = send_course_enrollment_email_task.delay(email, first_name, course_title, course_url)
    return task.id


def send_certificate_email_async(
    email: str,
    first_name: str,
    course_title: str,
    certificate_url: str
) -> str:
    """
    Queue certificate email to be sent in background
    
    Returns:
        str: Task ID for tracking
    """
    task = send_certificate_email_task.delay(email, first_name, course_title, certificate_url)
    return task.id


def send_bulk_emails_async(
    recipients: List[str],
    subject: str,
    template_name: str,
    context: Dict[str, Any]
) -> str:
    """
    Queue bulk emails to be sent in background

    Returns:
        str: Task ID for tracking
    """
    task = send_bulk_emails_task.delay(recipients, subject, template_name, context)
    return task.id


def send_password_reset_email_async(
    email: str,
    first_name: str,
    reset_token: str
) -> str:
    """
    Queue password reset email to be sent in background

    Returns:
        str: Task ID for tracking
    """
    task = send_password_reset_email_task.delay(email, first_name, reset_token)
    return task.id


def send_email_verification_async(
    email: str,
    first_name: str,
    verification_token: str
) -> str:
    """
    Queue email verification to be sent in background

    Returns:
        str: Task ID for tracking
    """
    task = send_email_verification_task.delay(email, first_name, verification_token)
    return task.id


def send_two_factor_auth_email_async(
    email: str,
    first_name: str,
    auth_code: str,
    ip_address: str = "Unknown"
) -> str:
    """
    Queue two-factor authentication email to be sent in background

    Args:
        email: User's email address
        first_name: User's first name
        auth_code: 6-digit authentication code
        ip_address: IP address of the login attempt

    Returns:
        str: Task ID for tracking
    """
    task = send_two_factor_auth_email_task.delay(email, first_name, auth_code, ip_address)
    return task.id


def get_task_status(task_id: str) -> Dict[str, Any]:
    """
    Get the status of a Celery task
    
    Args:
        task_id: The task ID returned from async email functions
    
    Returns:
        dict: Task status information
    """
    from celery.result import AsyncResult
    from celery_app import celery_app
    
    result = AsyncResult(task_id, app=celery_app)
    
    return {
        "task_id": task_id,
        "status": result.status,
        "result": result.result if result.ready() else None,
        "successful": result.successful() if result.ready() else None,
        "failed": result.failed() if result.ready() else None
    }

