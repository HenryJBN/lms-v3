# Email Templates Guide

This directory contains email templates for the DCA LMS platform. Templates use Jinja2 templating engine for dynamic content.

## 📁 Directory Structure

```
backend/templates/emails/
├── README.md                           # This file
├── welcome.html                        # Basic welcome email
├── welcome.txt                         # Plain text version
├── welcome_with_guide.html            # Welcome email with attachment support
├── password_reset.html                # Password reset email
├── certificate_issued.html            # Certificate notification
└── [other templates]
```

## 🚀 Quick Start

### Sending a Welcome Email (Basic)

```python
from utils.email import send_welcome_email

# Send basic welcome email
await send_welcome_email(
    email="user@example.com",
    first_name="John"
)
```

### Sending a Welcome Email with Attachment

```python
from utils.email import send_welcome_email

# Send welcome email with getting started guide
await send_welcome_email(
    email="user@example.com",
    first_name="John",
    include_guide=True,
    guide_path="/path/to/getting_started_guide.pdf"
)
```

### Sending a Custom Email

```python
from utils.email import send_custom_email

# Send any custom email with dynamic values and attachments
await send_custom_email(
    to_email="user@example.com",
    subject="Your Course Certificate",
    template_name="certificate_issued.html",
    context={
        "first_name": "John",
        "course_title": "Python Mastery",
        "certificate_url": "https://DCA.com/certificates/123",
        "platform_name": "DCA LMS"
    },
    attachments=[
        {
            "path": "/path/to/certificate.pdf",
            "filename": "Python_Mastery_Certificate.pdf"
        }
    ]
)
```

## 📧 Available Email Functions

### 1. `send_welcome_email()`

Sends a welcome email to new users.

**Parameters:**

- `email` (str): User's email address
- `first_name` (str): User's first name
- `include_guide` (bool, optional): Include getting started guide
- `guide_path` (str, optional): Path to guide PDF file

### 2. `send_password_reset_email()`

Sends password reset instructions.

**Parameters:**

- `email` (str): User's email address
- `first_name` (str): User's first name
- `reset_token` (str): Password reset token

### 3. `send_email_verification()`

Sends email verification link.

**Parameters:**

- `email` (str): User's email address
- `first_name` (str): User's first name
- `verification_token` (str): Email verification token

### 4. `send_course_enrollment_email()`

Confirms course enrollment.

**Parameters:**

- `email` (str): User's email address
- `first_name` (str): User's first name
- `course_title` (str): Name of the course
- `course_url` (str): URL to access the course

### 5. `send_certificate_email()`

Notifies user of certificate issuance.

**Parameters:**

- `email` (str): User's email address
- `first_name` (str): User's first name
- `course_title` (str): Name of the course
- `certificate_url` (str): URL to view/download certificate

### 6. `send_custom_email()`

Send any custom email with full control.

**Parameters:**

- `to_email` (str): Recipient's email
- `subject` (str): Email subject
- `template_name` (str): Template file name
- `context` (dict): Dynamic values for template
- `attachments` (list, optional): List of file attachments

## 🎨 Creating New Templates

### Template Structure

Create an HTML file in `backend/templates/emails/` with Jinja2 syntax:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>{{ email_title }}</title>
    <style>
      /* Your styles here */
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Hello {{ first_name }}!</h1>
      <p>{{ custom_message }}</p>

      <!-- Use conditional blocks -->
      {% if show_button %}
      <a href="{{ button_url }}" class="button">{{ button_text }}</a>
      {% endif %}

      <!-- Use loops -->
      {% for item in items %}
      <li>{{ item }}</li>
      {% endfor %}
    </div>
  </body>
</html>
```

### Dynamic Variables

Templates support any variables passed in the `context` dictionary:

```python
context = {
    "first_name": "John",
    "custom_message": "Welcome to our platform!",
    "show_button": True,
    "button_url": "https://example.com",
    "button_text": "Get Started",
    "items": ["Feature 1", "Feature 2", "Feature 3"]
}
```

### Jinja2 Features Supported

- **Variables**: `{{ variable_name }}`
- **Conditionals**: `{% if condition %} ... {% endif %}`
- **Loops**: `{% for item in items %} ... {% endfor %}`
- **Filters**: `{{ name|upper }}`, `{{ date|date_format }}`

## 📎 Working with Attachments

### Attachment Format

Attachments should be provided as a list of dictionaries:

```python
attachments = [
    {
        "path": "/absolute/path/to/file.pdf",
        "filename": "display_name.pdf"
    },
    {
        "path": "/path/to/another/file.docx",
        "filename": "document.docx"
    }
]
```

### Example: Sending Email with Multiple Attachments

```python
from utils.email import send_custom_email

await send_custom_email(
    to_email="student@example.com",
    subject="Course Materials",
    template_name="course_materials.html",
    context={
        "first_name": "Jane",
        "course_title": "Web Development Bootcamp"
    },
    attachments=[
        {
            "path": "/uploads/syllabus.pdf",
            "filename": "Course_Syllabus.pdf"
        },
        {
            "path": "/uploads/resources.pdf",
            "filename": "Additional_Resources.pdf"
        }
    ]
)
```

## ⚙️ Configuration

Email settings are configured via environment variables in `.env`:

```env
# SMTP Configuration (Default)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
FROM_EMAIL=noreply@DCA.com
FROM_NAME=DCA LMS

# SendGrid Configuration (Alternative)
USE_SENDGRID=false
SENDGRID_API_KEY=your_sendgrid_api_key
```

### Using Gmail SMTP

1. Enable 2-factor authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password as `SMTP_PASSWORD`

### Using SendGrid

1. Set `USE_SENDGRID=true`
2. Add your SendGrid API key to `SENDGRID_API_KEY`
3. Note: Attachments are only supported with SMTP, not SendGrid

## 🧪 Testing Emails

### Test Email Sending

```python
from utils.email import send_custom_email

# Test with a simple template
await send_custom_email(
    to_email="test@example.com",
    subject="Test Email",
    template_name="welcome.html",
    context={
        "first_name": "Test User",
        "platform_name": "DCA LMS",
        "login_url": "https://DCA.com/login",
        "support_email": "support@DCA.com"
    }
)
```

## 📝 Best Practices

1. **Always provide plain text versions** - Create `.txt` versions of templates for email clients that don't support HTML
2. **Keep templates responsive** - Use inline CSS and mobile-friendly designs
3. **Test across email clients** - Gmail, Outlook, Apple Mail, etc.
4. **Use meaningful subject lines** - Clear and concise
5. **Include unsubscribe links** - For marketing emails (required by law)
6. **Optimize images** - Use external hosting for images when possible
7. **Handle errors gracefully** - Email sending should not break user flows

## 🔍 Troubleshooting

### Email not sending?

1. Check SMTP credentials in `.env`
2. Verify SMTP server and port
3. Check firewall/network settings
4. Review application logs for error messages
5. Test with a simple email first

### Template not rendering?

1. Verify template file exists in `backend/templates/emails/`
2. Check template syntax (Jinja2)
3. Ensure all variables in template are provided in context
4. Check for typos in variable names

### Attachments not working?

1. Verify file paths are absolute and files exist
2. Check file permissions
3. Ensure using SMTP (not SendGrid) for attachments
4. Verify file size is reasonable (< 10MB recommended)

## 📚 Additional Resources

- [Jinja2 Documentation](https://jinja.palletsprojects.com/)
- [Email Best Practices](https://www.campaignmonitor.com/resources/guides/email-marketing-best-practices/)
- [SMTP Configuration Guide](https://support.google.com/mail/answer/7126229)
