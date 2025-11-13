"""
Direct test of email sending function
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from utils.email import send_welcome_email_sync

print("=" * 60)
print("Testing send_welcome_email_sync directly")
print("=" * 60)

# Test with a real email
test_email = "test@example.com"
test_name = "Test User"

print(f"\nAttempting to send welcome email to: {test_email}")
print(f"Name: {test_name}")
print("\n" + "=" * 60)

result = send_welcome_email_sync(test_email, test_name)

print("\n" + "=" * 60)
print(f"Result: {result}")
print("=" * 60)

if result:
    print("\n✅ Email sent successfully!")
else:
    print("\n❌ Email sending failed!")
    print("Check the output above for error details")

