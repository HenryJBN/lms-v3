# Email System - Quick Reference Guide

## 🎯 Overview

The DCA LMS email system provides a flexible, template-based email solution with support for:

- ✅ Dynamic content using Jinja2 templates
- ✅ File attachments
- ✅ Multiple email providers (SMTP, SendGrid)
- ✅ HTML and plain text versions
- ✅ Bulk email sending

## 🚀 Quick Start

### 1. Configure Email Settings

Add to your `.env` file:

```env
# SMTP Configuration (Recommended for attachments)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
FROM_EMAIL=noreply@DCA.com
FROM_NAME=DCA LMS

# Optional: SendGrid (No attachment support)
USE_SENDGRID=false
SENDGRID_API_KEY=your_sendgrid_api_key
```

### 2. Send Your First Email

```python
from utils.email import send_welcome_email

# Send welcome email after user registration
await send_welcome_email(
    email="user@example.com",
    first_name="John"
)
```

## 📧 Common Use Cases

### Welcome Email (Already Integrated)

The welcome email is automatically sent when a user registers:

<augment_code_snippet path="backend/routers/auth.py" mode="EXCERPT">

```python
# Send welcome email
try:
    await send_welcome_email(user.email, user.first_name)
except Exception as e:
    print(f"Failed to send welcome email to {user.email}: {e}")
```

</augment_code_snippet>

### Send Email with Attachment

```python
from utils.email import send_welcome_email

await send_welcome_email(
    email="user@example.com",
    first_name="Jane",
    include_guide=True,
    guide_path="/path/to/getting_started_guide.pdf"
)
```

### Send Custom Email

```python
from utils.email import send_custom_email

await send_custom_email(
    to_email="user@example.com",
    subject="Your Custom Subject",
    template_name="example_template.html",
    context={
        "first_name": "John",
        "custom_field": "value",
        # ... any dynamic values
    },
    attachments=[
        {
            "path": "/path/to/file.pdf",
            "filename": "document.pdf"
        }
    ]
)
```

## 📝 Available Email Templates

| Template                  | Purpose                  | Required Context Variables                                  |
| ------------------------- | ------------------------ | ----------------------------------------------------------- |
| `welcome.html`            | Basic welcome email      | `first_name`, `platform_name`, `login_url`, `support_email` |
| `welcome_with_guide.html` | Welcome with attachment  | Same as above + `welcome_tokens`, `has_attachment`          |
| `password_reset.html`     | Password reset           | `first_name`, `reset_url`, `platform_name`                  |
| `certificate_issued.html` | Certificate notification | `first_name`, `course_title`, `certificate_url`             |
| `example_template.html`   | Flexible template        | See template file for all options                           |

## 🛠️ Creating Custom Templates

### Step 1: Create Template File

Create a new HTML file in `backend/templates/emails/`:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>{{ email_title }}</title>
  </head>
  <body>
    <h1>Hello {{ first_name }}!</h1>
    <p>{{ message }}</p>

    {% if show_button %}
    <a href="{{ button_url }}">{{ button_text }}</a>
    {% endif %}
  </body>
</html>
```

### Step 2: Send Email Using Template

```python
from utils.email import send_custom_email

await send_custom_email(
    to_email="user@example.com",
    subject="Your Subject",
    template_name="your_template.html",
    context={
        "email_title": "Title",
        "first_name": "John",
        "message": "Your message here",
        "show_button": True,
        "button_url": "https://example.com",
        "button_text": "Click Here"
    }
)
```

## 📎 Working with Attachments

### Single Attachment

```python
attachments = [{
    "path": "/absolute/path/to/file.pdf",
    "filename": "display_name.pdf"
}]

await send_custom_email(
    to_email="user@example.com",
    subject="Document Attached",
    template_name="template.html",
    context={...},
    attachments=attachments
)
```

### Multiple Attachments

```python
attachments = [
    {
        "path": "/path/to/file1.pdf",
        "filename": "Document_1.pdf"
    },
    {
        "path": "/path/to/file2.pdf",
        "filename": "Document_2.pdf"
    }
]
```

**Important Notes:**

- ✅ Use absolute file paths
- ✅ Verify files exist before sending
- ✅ Keep file sizes reasonable (< 10MB)
- ⚠️ Attachments only work with SMTP (not SendGrid)

## 🔧 Available Functions

### Pre-built Email Functions

```python
from utils.email import (
    send_welcome_email,
    send_password_reset_email,
    send_email_verification,
    send_course_enrollment_email,
    send_certificate_email,
    send_custom_email,
    send_bulk_email
)
```

### Function Signatures

#### `send_welcome_email()`

```python
await send_welcome_email(
    email: str,
    first_name: str,
    include_guide: bool = False,
    guide_path: Optional[str] = None
) -> bool
```

#### `send_custom_email()`

```python
await send_custom_email(
    to_email: str,
    subject: str,
    template_name: str,
    context: Dict[str, Any],
    attachments: Optional[List[Dict[str, Any]]] = None
) -> bool
```

#### `send_bulk_email()`

```python
await send_bulk_email(
    recipients: List[str],
    subject: str,
    template_name: str,
    context: Dict[str, Any]
) -> Dict[str, int]  # Returns {"sent": 5, "failed": 2}
```

## 🎨 Template Variables (Jinja2)

### Basic Variables

```html
{{ variable_name }}
```

### Conditionals

```html
{% if condition %} Content shown if true {% else %} Content shown if false {% endif %}
```

### Loops

```html
{% for item in items %}
<li>{{ item }}</li>
{% endfor %}
```

### Filters

```html
{{ name|upper }} {{ date|date_format }}
```

## 🧪 Testing

### Test Email Configuration

```python
# Test basic email sending
from utils.email import send_custom_email

await send_custom_email(
    to_email="your_test_email@example.com",
    subject="Test Email",
    template_name="welcome.html",
    context={
        "first_name": "Test",
        "platform_name": "DCA LMS",
        "login_url": "https://DCA.com/login",
        "support_email": "support@DCA.com"
    }
)
```

## 🔍 Troubleshooting

### Email Not Sending?

1. **Check SMTP credentials**

   ```bash
   # Verify .env file has correct values
   SMTP_USERNAME=your_email@gmail.com
   SMTP_PASSWORD=your_app_password
   ```

2. **Gmail Users**: Enable App Passwords
   - Go to: https://myaccount.google.com/apppasswords
   - Generate app password
   - Use app password in `SMTP_PASSWORD`

3. **Check logs**
   ```python
   # Email errors are printed to console
   print(f"Failed to send email: {error}")
   ```

### Template Not Found?

- Verify template exists in `backend/templates/emails/`
- Check template name spelling
- Ensure `.html` extension is included

### Attachments Not Working?

- ✅ Verify file path is absolute
- ✅ Check file exists: `os.path.exists(file_path)`
- ✅ Ensure using SMTP (not SendGrid)
- ✅ Check file permissions

## 📚 Examples

See complete examples in:

- `backend/examples/email_usage_examples.py`
- `backend/templates/emails/README.md`

## 🔐 Security Best Practices

1. **Never commit credentials** - Use environment variables
2. **Validate email addresses** - Before sending
3. **Rate limiting** - Implement for bulk emails
4. **Unsubscribe links** - Required for marketing emails
5. **Error handling** - Don't expose email errors to users

## 📊 Monitoring

Track email sending success:

```python
success = await send_welcome_email(email, first_name)

if success:
    # Log success
    logger.info(f"Welcome email sent to {email}")
else:
    # Log failure
    logger.error(f"Failed to send welcome email to {email}")
```

## 🎯 Integration Points

The email system is currently integrated at:

1. **User Registration** (`backend/routers/auth.py`)
   - Sends welcome email automatically
   - Non-blocking (registration succeeds even if email fails)

2. **Password Reset** (`backend/routers/auth.py`)
   - Sends reset link via email

3. **Email Verification** (if implemented)
   - Sends verification link

## 🚀 Next Steps

1. Configure your SMTP settings in `.env`
2. Test with a simple welcome email
3. Create custom templates for your use cases
4. Integrate into your application workflows
5. Monitor email delivery success rates

---

**Need Help?** Check the detailed documentation in `backend/templates/emails/README.md`
