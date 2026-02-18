"""
Test tenant-aware email sending
"""
import sys
sys.path.insert(0, '/Users/macbook/Documents/jsproject/lms-v3/backend')

from utils.email import send_email_verification_sync, _get_site_by_id

print("=" * 80)
print("TESTING TENANT-AWARE EMAIL SENDING")
print("=" * 80)
print()

# Test 1: Fetch site
print("TEST 1: Fetching Yappi site...")
print("-" * 80)
site_id = '45683d86-c1dd-400a-b82c-dae4a18b01e1'
site = _get_site_by_id(site_id)

if site:
    print(f"✓ Site fetched: {site.name}")
    print(f"  Subdomain: {site.subdomain}")
    
    config = site.theme_config or {}
    print(f"\n  SMTP Config:")
    print(f"    smtp_host: {config.get('smtp_host', 'NOT SET')}")
    print(f"    smtp_port: {config.get('smtp_port', 'NOT SET')}")
    print(f"    smtp_username: {config.get('smtp_username', 'NOT SET')}")
    print(f"    smtp_password: {'SET (encrypted)' if config.get('smtp_password') else 'NOT SET'}")
    print(f"    smtp_from_email: {config.get('smtp_from_email', 'NOT SET')}")
    print(f"    smtp_from_name: {config.get('smtp_from_name', 'NOT SET')}")
    
    print(f"\n  Branding:")
    print(f"    primary_color: {config.get('primary_color', 'NOT SET')}")
    print(f"    secondary_color: {config.get('secondary_color', 'NOT SET')}")
else:
    print("✗ Failed to fetch site")
    sys.exit(1)

print()
print("=" * 80)
print("TEST 2: Sending verification email with tenant config...")
print("-" * 80)
print()

result = send_email_verification_sync(
    email='john@yappi.com',
    first_name='John',
    verification_code='TEST123',
    site_id=site_id
)

print()
print("=" * 80)
if result:
    print("✓ EMAIL SENT SUCCESSFULLY!")
    print()
    print("Check the logs above to verify:")
    print("  1. Site was fetched: 'Yappi (subdomain: yappi)'")
    print("  2. Using tenant-specific SMTP config")
    print("  3. Password was decrypted successfully")
    print("  4. From email is 'Yappi <contact@yappi.com>'")
else:
    print("✗ EMAIL FAILED TO SEND")
print("=" * 80)

