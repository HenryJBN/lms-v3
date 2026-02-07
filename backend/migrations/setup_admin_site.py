import asyncio
import uuid
from sqlalchemy import text
from database.session import get_session

async def main():
    user_id = "0b25d751-ecae-48f2-9bce-29dbc48823d4"
    site_id = str(uuid.uuid4())
    
    async for session in get_session():
        try:
            # 1. Create the site
            await session.execute(text(f"""
                INSERT INTO site (id, subdomain, name, owner_id, theme_config)
                VALUES ('{site_id}', 'admin', 'System Admin', '{user_id}', '{{}}')
            """))
            
            # 2. Update the user
            await session.execute(text(f"""
                UPDATE users 
                SET site_id = '{site_id}', role = 'admin'
                WHERE id = '{user_id}'
            """))
            
            await session.commit()
            print(f"Success: Created site 'admin' ({site_id}) and assigned user {user_id}")
        except Exception as e:
            await session.rollback()
            print(f"Error: {e}")
        break

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
