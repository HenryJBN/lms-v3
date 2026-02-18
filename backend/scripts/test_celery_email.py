"""
Test Celery email task with tenant awareness
"""
import sys
sys.path.insert(0, '/Users/macbook/Documents/jsproject/lms-v3/backend')

from tasks.email_tasks import send_email_verification_task

print("=" * 80)
print("TESTING CELERY EMAIL TASK WITH TENANT AWARENESS")
print("=" * 80)
print()

print("Queueing email verification task for Yappi tenant...")
print("  Email: john@yappi.com")
print("  Site ID: 45683d86-c1dd-400a-b82c-dae4a18b01e1 (Yappi)")
print()

# Queue the task
task = send_email_verification_task.delay(
    'john@yappi.com',
    'John',
    'TEST999',
    '45683d86-c1dd-400a-b82c-dae4a18b01e1'  # Yappi site ID
)

print(f"✓ Task queued with ID: {task.id}")
print()
print("Check Celery worker logs for:")
print("  1. '[EMAIL] Successfully fetched site: Yappi (subdomain: yappi)'")
print("  2. '[EMAIL] Using tenant-specific SMTP config for site: Yappi'")
print("  3. '[EMAIL] Tenant SMTP: Yappi <contact@yappi.com> via smtp.mailmug.net:2525'")
print("  4. 'subject: Verify Your Email - Yappi' (NOT 'DCA LMS')")
print()
print("=" * 80)

