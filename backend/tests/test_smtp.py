"""
Test SMTP connection to diagnose timeout issues
"""
import smtplib
import os
from dotenv import load_dotenv

load_dotenv()

# Get SMTP settings
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.mailmug.net")
SMTP_PORT = int(os.getenv("SMTP_PORT", "2525"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_MAIL_FROM = os.getenv("SMTP_MAIL_FROM")

print("=" * 60)
print("SMTP Configuration Test")
print("=" * 60)
print(f"SMTP Host: {SMTP_HOST}")
print(f"SMTP Port: {SMTP_PORT}")
print(f"SMTP Username: {SMTP_USERNAME}")
print(f"SMTP Password: {'*' * len(SMTP_PASSWORD) if SMTP_PASSWORD else 'NOT SET'}")
print(f"From Email: {SMTP_MAIL_FROM}")
print("=" * 60)

if not SMTP_USERNAME or not SMTP_PASSWORD:
    print("\n❌ ERROR: SMTP credentials not configured!")
    print("Please set SMTP_USERNAME and SMTP_PASSWORD in .env file")
    exit(1)

print("\n🔍 Testing SMTP connection...")

try:
    print(f"\n1. Connecting to {SMTP_HOST}:{SMTP_PORT}...")
    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
    print("   ✅ Connection successful!")
    
    print("\n2. Starting TLS encryption...")
    server.starttls()
    print("   ✅ TLS started!")
    
    print("\n3. Authenticating...")
    server.login(SMTP_USERNAME, SMTP_PASSWORD)
    print("   ✅ Authentication successful!")
    
    print("\n4. Closing connection...")
    server.quit()
    print("   ✅ Connection closed!")
    
    print("\n" + "=" * 60)
    print("✅ SMTP CONNECTION TEST PASSED!")
    print("=" * 60)
    print("\nYour SMTP configuration is working correctly.")
    print("You can now send emails through this server.")
    
except smtplib.SMTPAuthenticationError as e:
    print(f"\n❌ Authentication Error: {e}")
    print("\nPossible causes:")
    print("  - Incorrect username or password")
    print("  - Account not activated")
    print("  - Two-factor authentication enabled")
    
except smtplib.SMTPConnectError as e:
    print(f"\n❌ Connection Error: {e}")
    print("\nPossible causes:")
    print("  - Incorrect SMTP host or port")
    print("  - Firewall blocking the connection")
    print("  - SMTP server is down")
    
except TimeoutError as e:
    print(f"\n❌ Timeout Error: {e}")
    print("\nPossible causes:")
    print("  - Network connectivity issues")
    print("  - Firewall blocking the connection")
    print("  - SMTP server is slow or unresponsive")
    print("  - Incorrect port number")
    
except Exception as e:
    print(f"\n❌ Unexpected Error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("Troubleshooting Tips:")
print("=" * 60)
print("1. Verify your SMTP credentials are correct")
print("2. Check if your firewall allows outbound connections on port", SMTP_PORT)
print("3. Try using a different SMTP port (25, 465, 587, 2525)")
print("4. Contact your email provider for SMTP settings")
print("5. Check if your IP is blocked by the SMTP server")
print("=" * 60)

