import asyncio
import os
import sys
from sqlmodel import select
from datetime import datetime
from database.session import async_session_factory
from models.user import User
from models.enums import UserStatus
from models.gamification import TokenTransaction
from models.site import Site
from utils.tokens import award_tokens
from utils.site_settings import get_signup_token_reward, are_token_rewards_enabled
from dependencies import SiteData

async def award_missing_signup_tokens():
    print("--- Starting Missing Signup Tokens Award ---")
    
    async with async_session_factory() as session:
        # Get all active users with a site_id
        res = await session.exec(select(User).where(User.status == UserStatus.active).where(User.site_id != None))
        users = res.all()
        
        awarded_count = 0
        for user in users:
            # Refresh user in each loop iteration because award_tokens commits and expires objects
            user_id = user.id
            user_email = user.email
            site_id = user.site_id
            
            # Check if user already has a signup bonus transaction
            tx_res = await session.exec(
                select(TokenTransaction).where(
                    TokenTransaction.user_id == user_id,
                    TokenTransaction.reference_type == "signup_bonus"
                )
            )
            if tx_res.first():
                continue
                
            print(f"User {user_email} (Site: {site_id}) is missing signup bonus.")
            
            # Fetch site
            site_db = await session.get(Site, site_id)
            if not site_db:
                print(f"  ⚠️ Site {site_id} not found for user {user_email}")
                continue
                
            # Construct SiteData
            site_data = SiteData(
                id=site_db.id,
                subdomain=site_db.subdomain,
                custom_domain=site_db.custom_domain,
                name=site_db.name,
                logo_url=site_db.logo_url,
                theme_config=site_db.theme_config,
                owner_id=site_db.owner_id,
                is_active=site_db.is_active
            )
            
            if are_token_rewards_enabled(site_data):
                amount = float(get_signup_token_reward(site_data))
                if amount > 0:
                    print(f"  Attempting to award {amount} tokens...")
                    try:
                        result = await award_tokens(
                            user_id=user_id,
                            amount=amount,
                            description="Welcome bonus (Backfilled)",
                            session=session,
                            site_id=site_id,
                            reference_type="signup_bonus"
                        )
                        
                        if result.get("success"):
                            awarded_count += 1
                            print(f"  ✅ Awarded {amount} tokens to {user_email}")
                        else:
                            print(f"  ❌ Failed to award tokens: {result.get('error')}")
                    except Exception as e:
                        print(f"  ❌ Exception during award: {e}")
                else:
                    print(f"  - Signup reward is 0 for site {site_db.subdomain}")
            else:
                print(f"  - Token rewards disabled for site {site_db.subdomain}")
        
        print(f"\nFinalized. Total awarded in this run: {awarded_count}")

if __name__ == "__main__":
    # Ensure backend directory is in sys.path
    backend_path = os.path.dirname(os.path.abspath(__file__))
    if backend_path not in sys.path:
        sys.path.append(backend_path)
    # Also add root path
    root_path = os.path.dirname(backend_path)
    if root_path not in sys.path:
        sys.path.append(root_path)
        
    asyncio.run(award_missing_signup_tokens())
