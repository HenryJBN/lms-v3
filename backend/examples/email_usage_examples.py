"""
Email System Usage Examples

This file demonstrates how to use the email system with templates,
dynamic values, and file attachments.
"""

from utils.email import (
    send_welcome_email,
    send_custom_email,
    send_password_reset_email,
    send_course_enrollment_email,
    send_certificate_email,
    send_bulk_email
)


# ============================================================================
# Example 1: Send Basic Welcome Email
# ============================================================================

async def example_basic_welcome_email():
    """Send a basic welcome email to a new user"""
    
    success = await send_welcome_email(
        email="newuser@example.com",
        first_name="John"
    )
    
    if success:
        print("Welcome email sent successfully!")
    else:
        print("Failed to send welcome email")


# ============================================================================
# Example 2: Send Welcome Email with Attachment
# ============================================================================

async def example_welcome_email_with_guide():
    """Send welcome email with a getting started guide PDF"""
    
    success = await send_welcome_email(
        email="newuser@example.com",
        first_name="Jane",
        include_guide=True,
        guide_path="/path/to/getting_started_guide.pdf"
    )
    
    if success:
        print("Welcome email with guide sent successfully!")
    else:
        print("Failed to send welcome email with guide")


# ============================================================================
# Example 3: Send Custom Email with Dynamic Values
# ============================================================================

async def example_custom_email():
    """Send a custom email using the example template"""
    
    context = {
        "email_title": "Important Update",
        "header_title": "Platform Update",
        "header_subtitle": "New Features Available",
        "first_name": "Alex",
        "main_message": "We're excited to announce new features on our platform!",
        "show_info_box": True,
        "info_box_title": "What's New?",
        "info_box_content": "Check out our latest course recommendations and improved dashboard.",
        "list_title": "New Features:",
        "items": [
            "Enhanced course search",
            "Personalized recommendations",
            "Mobile app improvements",
            "New certificate designs"
        ],
        "show_button": True,
        "button_url": "https://DCA.com/whats-new",
        "button_text": "Explore New Features",
        "additional_content": "We hope you enjoy these improvements!",
        "has_attachments": False,
        "sender_name": "The DCA Team",
        "platform_name": "DCA LMS",
        "support_email": "support@DCA.com"
    }
    
    success = await send_custom_email(
        to_email="user@example.com",
        subject="Exciting Platform Updates! 🚀",
        template_name="example_template.html",
        context=context
    )
    
    if success:
        print("Custom email sent successfully!")
    else:
        print("Failed to send custom email")


# ============================================================================
# Example 4: Send Email with Multiple Attachments
# ============================================================================

async def example_email_with_attachments():
    """Send an email with multiple file attachments"""
    
    context = {
        "email_title": "Course Materials",
        "header_title": "Your Course Materials",
        "first_name": "Sarah",
        "main_message": "Here are the materials for your enrolled course.",
        "show_info_box": True,
        "info_box_title": "Course: Python for Beginners",
        "info_box_content": "All materials are attached to this email.",
        "has_attachments": True,
        "sender_name": "Your Instructor",
        "platform_name": "DCA LMS",
        "support_email": "support@DCA.com"
    }
    
    attachments = [
        {
            "path": "/path/to/syllabus.pdf",
            "filename": "Course_Syllabus.pdf"
        },
        {
            "path": "/path/to/chapter1.pdf",
            "filename": "Chapter_1_Introduction.pdf"
        },
        {
            "path": "/path/to/exercises.pdf",
            "filename": "Practice_Exercises.pdf"
        }
    ]
    
    success = await send_custom_email(
        to_email="student@example.com",
        subject="Course Materials - Python for Beginners",
        template_name="example_template.html",
        context=context,
        attachments=attachments
    )
    
    if success:
        print("Email with attachments sent successfully!")
    else:
        print("Failed to send email with attachments")


# ============================================================================
# Example 5: Send Course Enrollment Confirmation
# ============================================================================

async def example_course_enrollment():
    """Send course enrollment confirmation email"""
    
    success = await send_course_enrollment_email(
        email="student@example.com",
        first_name="Michael",
        course_title="Web Development Bootcamp",
        course_url="https://DCA.com/courses/web-dev-bootcamp"
    )
    
    if success:
        print("Enrollment confirmation sent successfully!")
    else:
        print("Failed to send enrollment confirmation")


# ============================================================================
# Example 6: Send Certificate Notification
# ============================================================================

async def example_certificate_notification():
    """Send certificate issuance notification"""
    
    success = await send_certificate_email(
        email="student@example.com",
        first_name="Emily",
        course_title="Data Science Fundamentals",
        certificate_url="https://DCA.com/certificates/abc123"
    )
    
    if success:
        print("Certificate notification sent successfully!")
    else:
        print("Failed to send certificate notification")


# ============================================================================
# Example 7: Send Bulk Emails
# ============================================================================

async def example_bulk_email():
    """Send the same email to multiple recipients"""
    
    recipients = [
        "user1@example.com",
        "user2@example.com",
        "user3@example.com",
        "user4@example.com"
    ]
    
    context = {
        "email_title": "Platform Announcement",
        "header_title": "Important Announcement",
        "first_name": "Valued User",  # Generic greeting for bulk emails
        "main_message": "We have an important update to share with you.",
        "show_button": True,
        "button_url": "https://DCA.com/announcements",
        "button_text": "Read More",
        "sender_name": "The DCA Team",
        "platform_name": "DCA LMS",
        "support_email": "support@DCA.com"
    }
    
    results = await send_bulk_email(
        recipients=recipients,
        subject="Platform Announcement",
        template_name="example_template.html",
        context=context
    )
    
    print(f"Bulk email results: {results['sent']} sent, {results['failed']} failed")


# ============================================================================
# Example 8: Send Password Reset Email
# ============================================================================

async def example_password_reset():
    """Send password reset email"""
    
    reset_token = "abc123xyz789"  # This would be generated by your system
    
    success = await send_password_reset_email(
        email="user@example.com",
        first_name="David",
        reset_token=reset_token
    )
    
    if success:
        print("Password reset email sent successfully!")
    else:
        print("Failed to send password reset email")


# ============================================================================
# Example 9: Integration with User Registration
# ============================================================================

async def example_registration_flow(user_data):
    """
    Example of integrating email into user registration flow
    This shows how it's used in the actual registration endpoint
    """
    
    # After user is created in database...
    try:
        # Send welcome email
        await send_welcome_email(
            email=user_data["email"],
            first_name=user_data["first_name"]
        )
        print(f"Welcome email sent to {user_data['email']}")
    except Exception as e:
        # Log error but don't fail registration
        print(f"Failed to send welcome email: {e}")
        # Registration continues even if email fails


# ============================================================================
# Example 10: Custom Template with Conditional Content
# ============================================================================

async def example_conditional_content(user_is_premium: bool):
    """Send email with conditional content based on user status"""
    
    context = {
        "email_title": "Your Monthly Report",
        "header_title": "Monthly Learning Report",
        "first_name": "Chris",
        "main_message": "Here's your learning progress for this month.",
        "show_info_box": user_is_premium,  # Only show for premium users
        "info_box_title": "Premium Member Benefits",
        "info_box_content": "As a premium member, you have access to exclusive content!",
        "list_title": "This Month's Achievements:",
        "items": [
            "Completed 3 courses",
            "Earned 2 certificates",
            "Gained 150 L-Tokens"
        ],
        "show_button": True,
        "button_url": "https://DCA.com/dashboard",
        "button_text": "View Full Report",
        "sender_name": "The DCA Team",
        "platform_name": "DCA LMS",
        "support_email": "support@DCA.com"
    }
    
    success = await send_custom_email(
        to_email="user@example.com",
        subject="Your Monthly Learning Report 📊",
        template_name="example_template.html",
        context=context
    )
    
    if success:
        print("Monthly report sent successfully!")
    else:
        print("Failed to send monthly report")


# ============================================================================
# Running Examples
# ============================================================================

if __name__ == "__main__":
    import asyncio
    
    # Run any example function
    # asyncio.run(example_basic_welcome_email())
    # asyncio.run(example_custom_email())
    # asyncio.run(example_email_with_attachments())
    
    print("Email usage examples loaded. Import and run individual functions as needed.")

