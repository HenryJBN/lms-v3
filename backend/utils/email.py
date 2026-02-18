import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
import os
from dotenv import load_dotenv
import jinja2
from email import encoders
from typing import Optional, List, Dict, Any
from datetime import datetime
import httpx

load_dotenv()

# Email configuration - Support both naming conventions
SMTP_SERVER = os.getenv("SMTP_SERVER") or os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL") or os.getenv("SMTP_MAIL_FROM", SMTP_USERNAME)
FROM_NAME = os.getenv("SMTP_FROM_NAME", "DCA LMS")

# SMTP timeout settings (in seconds)
SMTP_TIMEOUT = int(os.getenv("SMTP_TIMEOUT", "30"))
SMTP_CONNECTION_TIMEOUT = int(os.getenv("SMTP_CONNECTION_TIMEOUT", "10"))

# SendGrid configuration (alternative)
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
USE_SENDGRID = os.getenv("USE_SENDGRID", "false").lower() == "true"

# Email templates directory
TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "../templates/emails")

class EmailService:
    def __init__(self):
        self.jinja_env = jinja2.Environment(
            loader=jinja2.FileSystemLoader(TEMPLATES_DIR),
            autoescape=jinja2.select_autoescape(['html', 'xml'])
        )

    def render_template(self, template_name: str, context:Dict[str, Any]) -> str:
        """Render email template with context"""
        try:
            template = self.jinja_env.get_template(template_name)
            return template.render(**context)
        except Exception as e:
            print(f"Failed to render template {template_name}: {e}")
            return ""

    def build_tenant_context(self, site, base_context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Build email context with tenant-specific branding and settings.

        Args:
            site: Site model instance (can be None for fallback to defaults)
            base_context: Base context dict to merge with tenant settings

        Returns:
            Dict with tenant-aware context variables for email templates
        """
        context = base_context.copy() if base_context else {}

        if site:
            from utils.site_settings import get_site_setting, get_theme_colors

            # Get theme colors
            theme_colors = get_theme_colors(site)

            # Build tenant-specific context
            context.update({
                # Branding
                "platform_name": site.name,
                "platform_logo": site.logo_url or "",
                "support_email": get_site_setting(site, "support_email", "support@example.com"),

                # Theme colors
                "primary_color": theme_colors.get("primary_color", "#ef4444"),
                "secondary_color": theme_colors.get("secondary_color", "#3b82f6"),
                "accent_color": theme_colors.get("accent_color", "#8b5cf6"),

                # URLs (build from subdomain/custom_domain)
                "base_url": f"https://{site.custom_domain or site.subdomain + '.dcalms.test'}",
                "login_url": f"https://{site.custom_domain or site.subdomain + '.dcalms.test'}/login",
                "dashboard_url": f"https://{site.custom_domain or site.subdomain + '.dcalms.test'}/dashboard",

                # Social links (from theme_config if available)
                "social_twitter": get_site_setting(site, "social_twitter", ""),
                "social_linkedin": get_site_setting(site, "social_linkedin", ""),
                "social_facebook": get_site_setting(site, "social_facebook", ""),

                # Token rewards
                "welcome_tokens": get_site_setting(site, "default_token_reward", 25),
            })
        else:
            # Fallback to default values
            context.update({
                "platform_name": "DCA LMS",
                "platform_logo": "",
                "support_email": "support@dcalms.com",
                "primary_color": "#ef4444",
                "secondary_color": "#3b82f6",
                "accent_color": "#8b5cf6",
                "base_url": "https://dcalms.test",
                "login_url": "https://dcalms.test/login",
                "dashboard_url": "https://dcalms.test/dashboard",
                "social_twitter": "",
                "social_linkedin": "",
                "social_facebook": "",
                "welcome_tokens": 25,
            })

        return context

    def get_smtp_config(self, site=None) -> dict:
        """
        Get SMTP configuration from site settings or fallback to global env vars.

        Args:
            site: Optional Site model instance

        Returns:
            Dict with SMTP configuration (host, port, username, password, from_email, from_name)
        """
        # Try to get tenant-specific configuration
        if site and site.theme_config:
            from utils.encryption import decrypt_credential
            config = site.theme_config

            # Check if site has custom SMTP configuration
            if config.get('smtp_host') and config.get('smtp_username'):
                print(f"[EMAIL] Using tenant-specific SMTP config for site: {site.name}")

                # Decrypt password if present
                password = None
                if config.get('smtp_password'):
                    password = decrypt_credential(config.get('smtp_password'))
                    if password:
                        print(f"[EMAIL] Successfully decrypted SMTP password")
                    else:
                        print(f"[EMAIL] WARNING: Failed to decrypt SMTP password")

                smtp_config = {
                    'host': config.get('smtp_host'),
                    'port': int(config.get('smtp_port', 587)),
                    'username': config.get('smtp_username'),
                    'password': password,
                    'from_email': config.get('smtp_from_email', config.get('smtp_username')),
                    'from_name': config.get('smtp_from_name', site.name)
                }

                print(f"[EMAIL] Tenant SMTP: {smtp_config['from_name']} <{smtp_config['from_email']}> via {smtp_config['host']}:{smtp_config['port']}")
                return smtp_config

        # Fallback to global settings from environment variables
        print(f"[EMAIL] Using global SMTP config from .env (site: {site.name if site else 'None'})")
        return {
            'host': SMTP_SERVER,
            'port': SMTP_PORT,
            'username': SMTP_USERNAME,
            'password': SMTP_PASSWORD,
            'from_email': FROM_EMAIL,
            'from_name': FROM_NAME
        }
    
    def send_smtp_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
        smtp_config: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Send email using SMTP with proper timeout handling (synchronous).

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML email content
            text_content: Plain text email content (optional)
            attachments: List of attachment dicts with 'path' and 'filename' keys
            smtp_config: Optional SMTP configuration dict. If None, uses global config.

        Returns:
            True if email sent successfully, False otherwise
        """
        server = None
        try:
            # Use provided SMTP config or fall back to global settings
            if smtp_config:
                smtp_server = smtp_config.get('host', SMTP_SERVER)
                smtp_port = smtp_config.get('port', SMTP_PORT)
                smtp_username = smtp_config.get('username', SMTP_USERNAME)
                smtp_password = smtp_config.get('password', SMTP_PASSWORD)
                from_email = smtp_config.get('from_email', FROM_EMAIL)
                from_name = smtp_config.get('from_name', FROM_NAME)
            else:
                smtp_server = SMTP_SERVER
                smtp_port = SMTP_PORT
                smtp_username = SMTP_USERNAME
                smtp_password = SMTP_PASSWORD
                from_email = FROM_EMAIL
                from_name = FROM_NAME

            print(f"[SMTP] Starting SMTP send to {to_email}")
            print(f"[SMTP] SMTP_SERVER: {smtp_server}")
            print(f"[SMTP] SMTP_PORT: {smtp_port}")
            print(f"[SMTP] SMTP_USERNAME: {smtp_username}")
            print(f"[SMTP] FROM_EMAIL: {from_email}")

            if not smtp_username or not smtp_password:
                print("[SMTP] ERROR: SMTP credentials not configured")
                return False

            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{from_name} <{from_email}>"
            msg['To'] = to_email
            msg['Subject'] = subject

            # Add text content
            if text_content:
                text_part = MIMEText(text_content, 'plain')
                msg.attach(text_part)

            # Add HTML content
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)

            # Add attachments
            if attachments:
                for attachment in attachments:
                    try:
                        with open(attachment['path'], 'rb') as f:
                            part = MIMEBase('application', 'octet-stream')
                            part.set_payload(f.read())
                            encoders.encode_base64(part)
                            part.add_header(
                                'Content-Disposition',
                                f'attachment; filename= {attachment["filename"]}'
                            )
                            msg.attach(part)
                    except FileNotFoundError:
                        print(f"Attachment file not found: {attachment['path']}")
                        continue

            # Send email with timeout
            print(f"Connecting to SMTP server: {smtp_server}:{smtp_port}")
            server = smtplib.SMTP(smtp_server, smtp_port, timeout=SMTP_CONNECTION_TIMEOUT)
            server.set_debuglevel(0)  # Set to 1 for debugging

            # Try STARTTLS if supported (optional for some servers)
            try:
                if server.has_extn('STARTTLS'):
                    print("Starting TLS...")
                    server.starttls()
                else:
                    print("STARTTLS not supported by server, continuing without TLS...")
            except smtplib.SMTPNotSupportedError:
                print("STARTTLS not supported by server, continuing without TLS...")

            print("Logging in...")
            server.login(smtp_username, smtp_password)

            print(f"Sending email to {to_email}...")
            server.send_message(msg)

            print("Email sent successfully!")
            return True

        except smtplib.SMTPAuthenticationError as e:
            print(f"SMTP Authentication failed: {e}")
            print("Please check your SMTP_USERNAME and SMTP_PASSWORD")
            return False
        except smtplib.SMTPConnectError as e:
            print(f"SMTP Connection failed: {e}")
            print(f"Could not connect to {SMTP_SERVER}:{SMTP_PORT}")
            return False
        except smtplib.SMTPServerDisconnected as e:
            print(f"SMTP Server disconnected: {e}")
            return False
        except TimeoutError as e:
            print(f"SMTP Timeout: {e}")
            print(f"Connection timed out after {SMTP_CONNECTION_TIMEOUT} seconds")
            return False
        except Exception as e:
            print(f"SMTP email sending failed: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            # Always close the connection
            if server:
                try:
                    server.quit()
                except:
                    pass
    
    def send_sendgrid_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send email using SendGrid API (synchronous)"""
        try:
            if not SENDGRID_API_KEY:
                print("SendGrid API key not configured")
                return False
            
            headers = {
                "Authorization": f"Bearer {SENDGRID_API_KEY}",
                "Content-Type": "application/json"
            }
            
            data = {
                "personalizations": [
                    {
                        "to": [{"email": to_email}],
                        "subject": subject
                    }
                ],
                "from": {
                    "email": FROM_EMAIL,
                    "name": FROM_NAME
                },
                "content": [
                    {
                        "type": "text/html",
                        "value": html_content
                    }
                ]
            }
            
            if text_content:
                data["content"].insert(0, {
                    "type": "text/plain",
                    "value": text_content
                })

            with httpx.Client() as client:
                response = client.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    headers=headers,
                    json=data
                )

                return response.status_code == 202
                
        except Exception as e:
            print(f"SendGrid email sending failed: {e}")
            return False
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        template_name: str,
        context: Dict[str, Any],
        attachments: Optional[List[Dict[str, Any]]] = None,
        site=None
    ) -> bool:
        """
        Send email using configured service (synchronous).

        Args:
            to_email: Recipient email address
            subject: Email subject
            template_name: Name of the email template to use
            context: Template context variables
            attachments: Optional list of attachments
            site: Optional Site model instance for tenant-specific SMTP config

        Returns:
            True if email sent successfully, False otherwise
        """

        print(f"[EmailService] send_email called:")
        print(f"  to_email: {to_email}")
        print(f"  subject: {subject}")
        print(f"  template_name: {template_name}")
        print(f"  context keys: {list(context.keys())}")
        print(f"  attachments: {attachments}")
        print(f"  site: {site.name if site else 'None (using global config)'}")

        # Render template
        html_content = self.render_template(template_name, context)
        if not html_content:
            print(f"[EmailService] ERROR: Template rendering failed for {template_name}")
            return False

        print(f"[EmailService] Template rendered successfully ({len(html_content)} chars)")

        # Try to render text version
        text_template_name = template_name.replace('.html', '.txt')
        text_content = self.render_template(text_template_name, context)

        # Get SMTP configuration (tenant-specific or global)
        smtp_config = self.get_smtp_config(site) if site else None

        # Send email
        if USE_SENDGRID:
            return self.send_sendgrid_email(to_email, subject, html_content, text_content)
        else:
            return self.send_smtp_email(to_email, subject, html_content, text_content, attachments, smtp_config)

# Initialize email service
email_service = EmailService()

# Helper function to get site by ID (for Celery tasks)
def _get_site_by_id(site_id: str):
    """Get Site object by ID for email context (synchronous for Celery)"""
    if not site_id:
        return None
    try:
        import uuid
        import sys
        import os

        # Add backend directory to path for Celery workers
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)

        from sqlmodel import Session, select
        from database.session import sync_engine  # Use sync engine for Celery
        from models.site import Site

        with Session(sync_engine) as session:
            statement = select(Site).where(Site.id == uuid.UUID(site_id))
            site = session.exec(statement).first()

            if site:
                print(f"[EMAIL] Successfully fetched site: {site.name} (subdomain: {site.subdomain})")
            else:
                print(f"[EMAIL] Site not found for ID: {site_id}")

            return site
    except Exception as e:
        print(f"[EMAIL] Failed to fetch site {site_id}: {e}")
        import traceback
        traceback.print_exc()
        return None

# Synchronous email functions (used by Celery and can be called directly)
def send_welcome_email_sync(
    email: str,
    first_name: str,
    include_guide: bool = False,
    guide_path: Optional[str] = None,
    site_id: Optional[str] = None
) -> bool:
    """
    Send welcome email to new user (synchronous)

    Args:
        email: User's email address
        first_name: User's first name
        include_guide: Whether to include a getting started guide attachment
        guide_path: Path to the guide file (if include_guide is True)
        site_id: Optional site ID for tenant-specific branding

    Returns:
        bool: True if email was sent successfully
    """

    # Get site for tenant-aware context
    site = _get_site_by_id(site_id) if site_id else None

    # Build tenant-aware context
    context = email_service.build_tenant_context(site, {
        "first_name": first_name,
        "has_attachment": include_guide,
    })

    # Prepare attachments if guide is included
    attachments = None
    if include_guide and guide_path and os.path.exists(guide_path):
        attachments = [{
            "path": guide_path,
            "filename": f"{context['platform_name']}_Getting_Started_Guide.pdf"
        }]

    # Use enhanced template if guide is included
    template_name = "welcome_with_guide.html" if include_guide else "welcome.html"

    # Build subject with platform name
    subject = f"Welcome to {context['platform_name']}! 🎉"

    return email_service.send_email(
        to_email=email,
        subject=subject,
        template_name=template_name,
        context=context,
        attachments=attachments,
        site=site
    )

# Async wrapper for FastAPI compatibility
async def send_welcome_email(
    email: str,
    first_name: str,
    include_guide: bool = False,
    guide_path: Optional[str] = None
) -> bool:
    """Async wrapper for send_welcome_email_sync"""
    return send_welcome_email_sync(email, first_name, include_guide, guide_path)

def send_password_reset_email_sync(email: str, first_name: str, reset_token: str, site_id: Optional[str] = None) -> bool:
    """Send password reset email (synchronous)"""

    # Get site for tenant-aware context
    site = _get_site_by_id(site_id) if site_id else None

    # Build tenant-aware context
    context = email_service.build_tenant_context(site, {
        "first_name": first_name,
    })

    # Build reset URL with tenant's domain
    reset_url = f"{context['base_url']}/reset-password?token={reset_token}"
    context["reset_url"] = reset_url

    return email_service.send_email(
        to_email=email,
        subject=f"Reset Your Password - {context['platform_name']}",
        template_name="password_reset.html",
        context=context,
        site=site
    )

async def send_password_reset_email(email: str, first_name: str, reset_token: str) -> bool:
    """Async wrapper for send_password_reset_email_sync"""
    return send_password_reset_email_sync(email, first_name, reset_token)

def send_email_verification_sync(email: str, first_name: str, verification_code: str, site_id: Optional[str] = None) -> bool:
    """Send email verification with code (synchronous)"""

    # Get site for tenant-aware context
    site = _get_site_by_id(site_id) if site_id else None

    # Build tenant-aware context
    context = email_service.build_tenant_context(site, {
        "first_name": first_name,
        "verification_code": verification_code,
    })

    return email_service.send_email(
        to_email=email,
        subject=f"Verify Your Email - {context['platform_name']}",
        template_name="email_verification_code.html",
        context=context,
        site=site
    )

async def send_email_verification(email: str, first_name: str, verification_code: str) -> bool:
    """Async wrapper for send_email_verification_sync"""
    return send_email_verification_sync(email, first_name, verification_code)

def send_course_enrollment_email_sync(email: str, first_name: str, course_title: str, course_url: str, site_id: Optional[str] = None) -> bool:
    """Send course enrollment confirmation email (synchronous)"""

    # Get site for tenant-aware context
    site = _get_site_by_id(site_id) if site_id else None

    # Build tenant-aware context
    context = email_service.build_tenant_context(site, {
        "first_name": first_name,
        "course_title": course_title,
        "course_url": course_url,
    })

    return email_service.send_email(
        to_email=email,
        subject=f"Enrollment Confirmed: {course_title}",
        template_name="course_enrollment.html",
        context=context,
        site=site
    )

async def send_course_enrollment_email(email: str, first_name: str, course_title: str, course_url: str) -> bool:
    """Async wrapper for send_course_enrollment_email_sync"""
    return send_course_enrollment_email_sync(email, first_name, course_title, course_url)

def send_two_factor_auth_email_sync(email: str, first_name: str, auth_code: str, ip_address: str = "Unknown", site_id: Optional[str] = None) -> bool:
    """Send two-factor authentication code email (synchronous)"""

    # Get site for tenant-aware context
    site = _get_site_by_id(site_id) if site_id else None

    # Build tenant-aware context
    context = email_service.build_tenant_context(site, {
        "first_name": first_name,
        "auth_code": auth_code,
        "expiry_minutes": 10,
        "login_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"),
        "ip_address": ip_address,
    })

    return email_service.send_email(
        to_email=email,
        subject=f"Your Two-Factor Authentication Code - {context['platform_name']}",
        template_name="two_factor_auth.html",
        context=context,
        site=site
    )

async def send_two_factor_auth_email(email: str, first_name: str, auth_code: str, ip_address: str = "Unknown") -> bool:
    """Async wrapper for send_two_factor_auth_email_sync"""
    return send_two_factor_auth_email_sync(email, first_name, auth_code, ip_address)

def send_certificate_email_sync(email: str, first_name: str, course_title: str, certificate_url: str, site_id: Optional[str] = None) -> bool:
    """Send certificate issued email (synchronous)"""

    # Get site for tenant-aware context
    site = _get_site_by_id(site_id) if site_id else None

    # Build tenant-aware context
    context = email_service.build_tenant_context(site, {
        "first_name": first_name,
        "course_title": course_title,
        "certificate_url": certificate_url,
    })

    return email_service.send_email(
        to_email=email,
        subject=f"Certificate Issued: {course_title} 🏆",
        template_name="certificate_issued.html",
        context=context,
        site=site
    )

async def send_certificate_email(email: str, first_name: str, course_title: str, certificate_url: str) -> bool:
    """Async wrapper for send_certificate_email_sync"""
    return send_certificate_email_sync(email, first_name, course_title, certificate_url)

def send_assignment_reminder_email_sync(
    email: str,
    first_name: str,
    assignment_title: str,
    course_title: str,
    due_date: datetime,
    assignment_url: str
) -> bool:
    """Send assignment reminder email (synchronous)"""

    context = {
        "first_name": first_name,
        "assignment_title": assignment_title,
        "course_title": course_title,
        "due_date": due_date.strftime("%B %d, %Y at %I:%M %p"),
        "assignment_url": assignment_url,
        "platform_name": "DCA LMS"
    }

    return email_service.send_email(
        to_email=email,
        subject=f"Assignment Due Soon: {assignment_title}",
        template_name="assignment_reminder.html",
        context=context
    )

async def send_assignment_reminder_email(
    email: str,
    first_name: str,
    assignment_title: str,
    course_title: str,
    due_date: datetime,
    assignment_url: str
) -> bool:
    """Async wrapper for send_assignment_reminder_email_sync"""
    return send_assignment_reminder_email_sync(email, first_name, assignment_title, course_title, due_date, assignment_url)

def send_admin_created_user_email_sync(email: str, first_name: str, username: str, password: str, site_id: Optional[str] = None) -> bool:
    """Send email to admin-created user with login credentials (synchronous)"""

    # Get site for tenant-aware context
    site = _get_site_by_id(site_id) if site_id else None

    # Build tenant-aware context
    context = email_service.build_tenant_context(site, {
        "first_name": first_name,
        "username": username,
        "password": password,
        "welcome_tokens": 10,
    })

    return email_service.send_email(
        to_email=email,
        subject=f"Welcome to {context['platform_name']} - Your Account Has Been Created! 🎉",
        template_name="admin_created_user.html",
        context=context,
        site=site
    )

async def send_admin_created_user_email(email: str, first_name: str, username: str, password: str) -> bool:
    """Async wrapper for send_admin_created_user_email_sync"""
    return send_admin_created_user_email_sync(email, first_name, username, password)

def send_instructor_application_email_sync(email: str, first_name: str, status: str) -> bool:
    """Send instructor application status email (synchronous)"""

    context = {
        "first_name": first_name,
        "status": status,
        "platform_name": "DCA LMS",
        "dashboard_url": "https://DCA.com/dashboard"
    }

    template_name = f"instructor_application_{status}.html"
    subject_map = {
        "approved": "Instructor Application Approved! 🎉",
        "rejected": "Instructor Application Update",
        "pending": "Instructor Application Received"
    }

    return email_service.send_email(
        to_email=email,
        subject=subject_map.get(status, "Instructor Application Update"),
        template_name=template_name,
        context=context
    )

async def send_instructor_application_email(email: str, first_name: str, status: str) -> bool:
    """Async wrapper for send_instructor_application_email_sync"""
    return send_instructor_application_email_sync(email, first_name, status)

def send_bulk_email_sync(
    recipients: List[str],
    subject: str,
    template_name: str,
    context: Dict[str, Any]
) -> Dict[str, int]:
    """Send bulk email to multiple recipients (synchronous)"""

    results = {"sent": 0, "failed": 0}

    for email in recipients:
        success = email_service.send_email(
            to_email=email,
            subject=subject,
            template_name=template_name,
            context=context
        )

        if success:
            results["sent"] += 1
        else:
            results["failed"] += 1

    return results

async def send_bulk_email(
    recipients: List[str],
    subject: str,
    template_name: str,
    context: Dict[str, Any]
) -> Dict[str, int]:
    """Async wrapper for send_bulk_email_sync"""
    return send_bulk_email_sync(recipients, subject, template_name, context)

def send_custom_email_sync(
    to_email: str,
    subject: str,
    template_name: str,
    context: Dict[str, Any],
    attachments: Optional[List[Dict[str, Any]]] = None
) -> bool:
    """
    Send a custom email with any template, dynamic values, and optional attachments (synchronous)

    Args:
        to_email: Recipient's email address
        subject: Email subject line
        template_name: Name of the template file (e.g., 'welcome.html')
        context: Dictionary of dynamic values to inject into the template
        attachments: Optional list of attachments, each with 'path' and 'filename' keys
                    Example: [{"path": "/path/to/file.pdf", "filename": "document.pdf"}]

    Returns:
        bool: True if email was sent successfully
    """
    return email_service.send_email(
        to_email=to_email,
        subject=subject,
        template_name=template_name,
        context=context,
        attachments=attachments
    )

async def send_custom_email(
    to_email: str,
    subject: str,
    template_name: str,
    context: Dict[str, Any],
    attachments: Optional[List[Dict[str, Any]]] = None
) -> bool:
    """Async wrapper for send_custom_email_sync"""
    return send_custom_email_sync(to_email, subject, template_name, context, attachments)
