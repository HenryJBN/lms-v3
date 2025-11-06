import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import os
from dotenv import load_dotenv
import jinja2
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, List, Dict, Any
from datetime import datetime
import httpx

load_dotenv()

# Email configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USERNAME)
FROM_NAME = os.getenv("FROM_NAME", "MagikPro LMS")

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
    
    async def send_smtp_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> bool:
        """Send email using SMTP"""
        try:
            if not SMTP_USERNAME or not SMTP_PASSWORD:
                print("SMTP credentials not configured")
                return False
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{FROM_NAME} <{FROM_EMAIL}>"
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
                    with open(attachment['path'], 'rb') as f:
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(f.read())
                        encoders.encode_base64(part)
                        part.add_header(
                            'Content-Disposition',
                            f'attachment; filename= {attachment["filename"]}'
                        )
                        msg.attach(part)
            
            # Send email
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
            
            return True
            
        except Exception as e:
            print(f"SMTP email sending failed: {e}")
            return False
    
    async def send_sendgrid_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send email using SendGrid API"""
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
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    headers=headers,
                    json=data
                )
                
                return response.status_code == 202
                
        except Exception as e:
            print(f"SendGrid email sending failed: {e}")
            return False
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        template_name: str,
        context: Dict[str, Any],
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> bool:
        """Send email using configured service"""
        
        # Render template
        html_content = self.render_template(template_name, context)
        if not html_content:
            return False
        
        # Try to render text version
        text_template_name = template_name.replace('.html', '.txt')
        text_content = self.render_template(text_template_name, context)
        
        # Send email
        if USE_SENDGRID:
            return await self.send_sendgrid_email(to_email, subject, html_content, text_content)
        else:
            return await self.send_smtp_email(to_email, subject, html_content, text_content, attachments)

# Initialize email service
email_service = EmailService()

# Email template functions
async def send_welcome_email(email: str, first_name: str) -> bool:
    """Send welcome email to new user"""
    
    context = {
        "first_name": first_name,
        "platform_name": "MagikPro LMS",
        "login_url": "https://magikpro.com/login",
        "support_email": "support@magikpro.com"
    }
    
    return await email_service.send_email(
        to_email=email,
        subject="Welcome to MagikPro LMS! 🎉",
        template_name="welcome.html",
        context=context
    )

async def send_password_reset_email(email: str, first_name: str, reset_token: str) -> bool:
    """Send password reset email"""
    
    reset_url = f"https://magikpro.com/reset-password?token={reset_token}"
    
    context = {
        "first_name": first_name,
        "reset_url": reset_url,
        "platform_name": "MagikPro LMS",
        "support_email": "support@magikpro.com"
    }
    
    return await email_service.send_email(
        to_email=email,
        subject="Reset Your Password - MagikPro LMS",
        template_name="password_reset.html",
        context=context
    )

async def send_email_verification(email: str, first_name: str, verification_token: str) -> bool:
    """Send email verification"""
    
    verification_url = f"https://magikpro.com/verify-email?token={verification_token}"
    
    context = {
        "first_name": first_name,
        "verification_url": verification_url,
        "platform_name": "MagikPro LMS"
    }
    
    return await email_service.send_email(
        to_email=email,
        subject="Verify Your Email - MagikPro LMS",
        template_name="email_verification.html",
        context=context
    )

async def send_course_enrollment_email(email: str, first_name: str, course_title: str, course_url: str) -> bool:
    """Send course enrollment confirmation email"""
    
    context = {
        "first_name": first_name,
        "course_title": course_title,
        "course_url": course_url,
        "platform_name": "MagikPro LMS"
    }
    
    return await email_service.send_email(
        to_email=email,
        subject=f"Enrollment Confirmed: {course_title}",
        template_name="course_enrollment.html",
        context=context
    )

async def send_certificate_email(email: str, first_name: str, course_title: str, certificate_url: str) -> bool:
    """Send certificate issued email"""
    
    context = {
        "first_name": first_name,
        "course_title": course_title,
        "certificate_url": certificate_url,
        "platform_name": "MagikPro LMS"
    }
    
    return await email_service.send_email(
        to_email=email,
        subject=f"Certificate Issued: {course_title} 🏆",
        template_name="certificate_issued.html",
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
    """Send assignment reminder email"""
    
    context = {
        "first_name": first_name,
        "assignment_title": assignment_title,
        "course_title": course_title,
        "due_date": due_date.strftime("%B %d, %Y at %I:%M %p"),
        "assignment_url": assignment_url,
        "platform_name": "MagikPro LMS"
    }
    
    return await email_service.send_email(
        to_email=email,
        subject=f"Assignment Due Soon: {assignment_title}",
        template_name="assignment_reminder.html",
        context=context
    )

async def send_instructor_application_email(email: str, first_name: str, status: str) -> bool:
    """Send instructor application status email"""
    
    context = {
        "first_name": first_name,
        "status": status,
        "platform_name": "MagikPro LMS",
        "dashboard_url": "https://magikpro.com/dashboard"
    }
    
    template_name = f"instructor_application_{status}.html"
    subject_map = {
        "approved": "Instructor Application Approved! 🎉",
        "rejected": "Instructor Application Update",
        "pending": "Instructor Application Received"
    }
    
    return await email_service.send_email(
        to_email=email,
        subject=subject_map.get(status, "Instructor Application Update"),
        template_name=template_name,
        context=context
    )

async def send_bulk_email(
    recipients: List[str],
    subject: str,
    template_name: str,
    context: Dict[str, Any]
) -> Dict[str, int]:
    """Send bulk email to multiple recipients"""
    
    results = {"sent": 0, "failed": 0}
    
    for email in recipients:
        success = await email_service.send_email(
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
