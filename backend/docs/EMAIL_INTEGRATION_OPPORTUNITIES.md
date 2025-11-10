# Email Integration Opportunities

This document outlines where email notifications can be integrated into the LMS platform.

## ✅ Already Integrated

### 1. User Registration

**File**: `backend/routers/auth.py`
**Status**: ✅ Implemented
**Email**: Welcome email with platform introduction

```python
# Send welcome email
try:
    await send_welcome_email(user.email, user.first_name)
except Exception as e:
    print(f"Failed to send welcome email to {user.email}: {e}")
```

### 2. Password Reset

**File**: `backend/routers/auth.py`
**Status**: ✅ Implemented
**Email**: Password reset link

```python
await send_password_reset_email(user.email, user.first_name, reset_token)
```

## 🔄 Ready to Integrate

### 3. Course Enrollment

**File**: `backend/routers/enrollments.py` (Line ~100)
**Current**: Only sends in-app notification
**Opportunity**: Add email confirmation

**How to integrate**:

```python
# After line 100 in enrollments.py
from utils.email import send_course_enrollment_email

# Send enrollment notification (already exists)
await send_enrollment_notification(current_user.id, course.title, enrollment.course_id)

# ADD: Send enrollment email
try:
    course_url = f"https://DCA.com/learn/{enrollment.course_id}"
    await send_course_enrollment_email(
        email=current_user.email,
        first_name=current_user.first_name,
        course_title=course.title,
        course_url=course_url
    )
except Exception as e:
    print(f"Failed to send enrollment email: {e}")
```

### 4. Certificate Issuance

**File**: `backend/routers/progress.py` (Line ~378)
**Current**: Issues certificate silently
**Opportunity**: Email notification when certificate is issued

**How to integrate**:

```python
# In the issue_certificate function (around line 423)
from utils.email import send_certificate_email

# After certificate is created
try:
    # Get user info
    user_query = "SELECT email, first_name FROM users WHERE id = :user_id"
    user = await database.fetch_one(user_query, values={"user_id": user_id})

    if user:
        certificate_url = f"https://DCA.com/certificates/{cert_id}"
        await send_certificate_email(
            email=user.email,
            first_name=user.first_name,
            course_title=course.title,
            certificate_url=certificate_url
        )
except Exception as e:
    print(f"Failed to send certificate email: {e}")
```

### 5. Certificate Minting (NFT)

**File**: `backend/routers/certificates.py` (Line ~187)
**Current**: Only sends in-app notification
**Opportunity**: Email notification when NFT is minted

**How to integrate**:

```python
# After line 187 in certificates.py
from utils.email import send_custom_email

# Send notification (already exists)
await send_certificate_notification(
    current_user.id,
    certificate.course_title,
    "minted"
)

# ADD: Send email notification
try:
    context = {
        "first_name": current_user.first_name,
        "course_title": certificate.course_title,
        "header_title": "Certificate Minted as NFT! 🚀",
        "main_message": f"Your certificate for {certificate.course_title} has been successfully minted as an NFT on the blockchain!",
        "show_info_box": True,
        "info_box_title": "Blockchain Details",
        "info_box_content": f"Token ID: {mint_result['token_id']}\nTransaction: {mint_result['transaction_hash']}",
        "show_button": True,
        "button_url": f"https://DCA.com/certificates/{certificate_id}",
        "button_text": "View Certificate",
        "sender_name": "The DCA Team",
        "platform_name": "DCA LMS",
        "support_email": "support@DCA.com"
    }

    await send_custom_email(
        to_email=current_user.email,
        subject=f"Certificate Minted: {certificate.course_title} 🚀",
        template_name="example_template.html",
        context=context
    )
except Exception as e:
    print(f"Failed to send NFT minting email: {e}")
```

### 6. Assignment Reminders

**File**: `backend/utils/notifications.py` (Line ~113)
**Current**: Only in-app notification
**Opportunity**: Email reminder for upcoming assignments

**How to integrate**:

```python
# In send_assignment_reminder function
from utils.email import send_assignment_reminder_email

# After creating notification
try:
    # Get user info
    user_query = "SELECT email, first_name FROM users WHERE id = :user_id"
    user = await database.fetch_one(user_query, values={"user_id": user_id})

    if user:
        assignment_url = f"https://DCA.com/learn/{course_id}"
        await send_assignment_reminder_email(
            email=user.email,
            first_name=user.first_name,
            assignment_title=assignment_title,
            course_title="Course Name",  # Need to fetch this
            due_date=due_date,
            assignment_url=assignment_url
        )
except Exception as e:
    print(f"Failed to send assignment reminder email: {e}")
```

## 💡 Additional Email Opportunities

### 7. Email Verification

**Status**: Endpoint exists but email not sent
**File**: `backend/routers/auth.py` (Line ~166)

**How to integrate**:

```python
# After user registration, generate verification token
from utils.email import send_email_verification

verification_token = str(uuid.uuid4())

# Store token in database
query = """
    INSERT INTO email_verification_tokens (user_id, token, expires_at)
    VALUES (:user_id, :token, NOW() + INTERVAL '24 hours')
"""
await database.execute(query, values={"user_id": user_id, "token": verification_token})

# Send verification email
await send_email_verification(user.email, user.first_name, verification_token)
```

### 8. Course Completion Congratulations

**Trigger**: When user completes 100% of course
**File**: `backend/routers/progress.py` (Line ~355)

**Template needed**: Create `course_completion.html`

```python
from utils.email import send_custom_email

context = {
    "first_name": user.first_name,
    "header_title": "Congratulations! 🎉",
    "main_message": f"You've completed {course.title}!",
    "show_info_box": True,
    "info_box_title": "What's Next?",
    "info_box_content": "Your certificate is being prepared and will be available soon.",
    "show_button": True,
    "button_url": "https://DCA.com/certificates",
    "button_text": "View Certificates",
    "sender_name": "The DCA Team",
    "platform_name": "DCA LMS"
}

await send_custom_email(
    to_email=user.email,
    subject=f"Course Completed: {course.title} 🎉",
    template_name="example_template.html",
    context=context
)
```

### 9. First Course Enrollment Bonus

**Trigger**: When user enrolls in their first course
**File**: `backend/routers/enrollments.py` (Line ~90)

```python
if enrollment_count.count == 1:  # First course enrollment
    await award_tokens(...)

    # ADD: Send congratulations email
    try:
        context = {
            "first_name": current_user.first_name,
            "header_title": "Welcome to Learning! 🎓",
            "main_message": f"You've enrolled in your first course: {course.title}",
            "show_info_box": True,
            "info_box_title": "Bonus Tokens!",
            "info_box_content": "You've earned 25 L-Tokens for enrolling in your first course!",
            "show_button": True,
            "button_url": f"https://DCA.com/learn/{enrollment.course_id}",
            "button_text": "Start Learning",
            "sender_name": "The DCA Team",
            "platform_name": "DCA LMS"
        }

        await send_custom_email(
            to_email=current_user.email,
            subject="Your Learning Journey Begins! 🚀",
            template_name="example_template.html",
            context=context
        )
    except Exception as e:
        print(f"Failed to send first enrollment email: {e}")
```

### 10. Weekly Progress Report

**Trigger**: Scheduled task (weekly)
**Implementation**: Create a scheduled job

```python
from utils.email import send_custom_email

async def send_weekly_progress_report(user_id: uuid.UUID):
    # Fetch user's weekly stats
    user = await get_user(user_id)
    stats = await get_weekly_stats(user_id)

    context = {
        "first_name": user.first_name,
        "header_title": "Your Weekly Progress 📊",
        "main_message": "Here's what you accomplished this week!",
        "list_title": "This Week's Achievements:",
        "items": [
            f"Completed {stats['lessons_completed']} lessons",
            f"Earned {stats['tokens_earned']} L-Tokens",
            f"Spent {stats['time_spent']} hours learning"
        ],
        "show_button": True,
        "button_url": "https://DCA.com/dashboard",
        "button_text": "View Dashboard",
        "sender_name": "The DCA Team",
        "platform_name": "DCA LMS"
    }

    await send_custom_email(
        to_email=user.email,
        subject="Your Weekly Learning Report 📊",
        template_name="example_template.html",
        context=context
    )
```

## 📋 Implementation Checklist

### High Priority

- [ ] Course enrollment confirmation email
- [ ] Certificate issuance email
- [ ] Email verification on registration

### Medium Priority

- [ ] Certificate NFT minting notification
- [ ] Course completion congratulations
- [ ] First enrollment bonus email

### Low Priority

- [ ] Assignment reminders
- [ ] Weekly progress reports
- [ ] Instructor application status

## 🎯 Best Practices

1. **Always use try-except blocks** - Email failures shouldn't break core functionality
2. **Log failures** - Track email delivery issues
3. **Make emails optional** - Users should be able to opt-out
4. **Test thoroughly** - Send test emails before production
5. **Monitor delivery rates** - Track success/failure metrics

## 📝 Template Creation Guide

For each new email type:

1. Create HTML template in `backend/templates/emails/`
2. Create plain text version (`.txt`)
3. Add helper function in `backend/utils/email.py`
4. Document in `backend/templates/emails/README.md`
5. Add example in `backend/examples/email_usage_examples.py`

## 🔧 Quick Integration Template

```python
# Import at top of file
from utils.email import send_custom_email

# In your function, after the main action
try:
    context = {
        "first_name": user.first_name,
        "header_title": "Your Title",
        "main_message": "Your message",
        "show_button": True,
        "button_url": "https://DCA.com/path",
        "button_text": "Button Text",
        "sender_name": "The DCA Team",
        "platform_name": "DCA LMS",
        "support_email": "support@DCA.com"
    }

    await send_custom_email(
        to_email=user.email,
        subject="Your Subject",
        template_name="example_template.html",
        context=context
    )
except Exception as e:
    print(f"Failed to send email: {e}")
```

## 📊 Monitoring

Track email metrics:

- Delivery success rate
- Open rates (if using SendGrid)
- Click-through rates
- Bounce rates
- Unsubscribe rates

## 🚀 Next Steps

1. Choose which emails to implement first
2. Configure SMTP settings in `.env`
3. Test with your email address
4. Integrate into the appropriate endpoints
5. Monitor delivery and user engagement
