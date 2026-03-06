"""
Migration: Recreate user_sessions table with all required columns.

The table was initially created with a minimal schema. Rather than
adding columns one by one, we drop and recreate it since session data
is transient and non-critical.
"""
import asyncio
from sqlalchemy import text
from database.session import engine


async def run_migration():
    print("Recreating user_sessions table with full schema...")
    async with engine.begin() as conn:
        # Drop old table
        await conn.execute(text("DROP TABLE IF EXISTS user_sessions CASCADE"))
        print("  ✓ Dropped old user_sessions table.")

        # Recreate with all columns matching the UserSession model
        await conn.execute(text("""
            CREATE TABLE user_sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id),
                site_id UUID NOT NULL REFERENCES site(id),
                device_type VARCHAR,
                country VARCHAR,
                ip_address VARCHAR,
                user_agent VARCHAR,
                login_time TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
                last_activity TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
                is_active BOOLEAN DEFAULT true
            )
        """))
        print("  ✓ Created user_sessions table with full schema.")

        # Add index on user_id and site_id
        await conn.execute(text("CREATE INDEX ix_user_sessions_user_id ON user_sessions(user_id)"))
        await conn.execute(text("CREATE INDEX ix_user_sessions_site_id ON user_sessions(site_id)"))
        print("  ✓ Created indexes.")

    print("Migration completed successfully.")


if __name__ == "__main__":
    asyncio.run(run_migration())
