"""
Clear email verification tokens for a user
Usage: python3 clear_verification_tokens.py <email> [subdomain]
Example: python3 clear_verification_tokens.py john@yappi.com yappi
"""
import sys
sys.path.insert(0, '/Users/macbook/Documents/jsproject/lms-v3/backend')

from sqlmodel import Session, select, delete
from database.session import sync_engine
from models.auth_tokens import EmailVerificationToken
from models.user import User
from models.site import Site

def clear_tokens(email: str, subdomain: str = 'yappi'):
    """Clear all verification tokens for a user"""
    
    print("=" * 80)
    print("CLEARING EMAIL VERIFICATION TOKENS")
    print("=" * 80)
    print()
    
    with Session(sync_engine) as session:
        # Find site
        site_query = select(Site).where(Site.subdomain == subdomain)
        site = session.exec(site_query).first()
        
        if not site:
            print(f"✗ Site '{subdomain}' not found")
            return False
        
        print(f"✓ Found site: {site.name} (ID: {site.id})")
        
        # Find user
        user_query = select(User).where(
            User.email == email,
            User.site_id == site.id
        )
        user = session.exec(user_query).first()
        
        if not user:
            print(f"✗ User {email} not found in site {subdomain}")
            return False
        
        print(f"✓ Found user: {user.email} (ID: {user.id})")
        print()
        
        # Get all verification tokens for this user
        token_query = select(EmailVerificationToken).where(
            EmailVerificationToken.user_id == user.id
        )
        tokens = session.exec(token_query).all()
        
        print(f"Found {len(tokens)} verification token(s):")
        for token in tokens:
            status = "VERIFIED" if token.verified_at else "PENDING"
            print(f"  - Token: {token.token} | Status: {status} | Expires: {token.expires_at}")
        
        if tokens:
            print()
            print("Deleting all verification tokens...")
            
            delete_query = delete(EmailVerificationToken).where(
                EmailVerificationToken.user_id == user.id
            )
            session.exec(delete_query)
            session.commit()
            
            print(f"✓ Deleted {len(tokens)} token(s)")
        else:
            print("\nNo tokens to delete")
        
        print()
        print("=" * 80)
        print("✓ DONE - You can now request a new verification code")
        print("=" * 80)
        return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 clear_verification_tokens.py <email> [subdomain]")
        print("Example: python3 clear_verification_tokens.py john@yappi.com yappi")
        sys.exit(1)
    
    email = sys.argv[1]
    subdomain = sys.argv[2] if len(sys.argv) > 2 else 'yappi'
    
    clear_tokens(email, subdomain)

