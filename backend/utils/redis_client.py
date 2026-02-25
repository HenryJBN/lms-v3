"""
Redis client for session management and caching
"""
import redis.asyncio as redis
import json
import os
from typing import Optional, Dict, Any
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

# Get Redis URL from environment
REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")

# Create async Redis client
redis_client = redis.from_url(
    REDIS_URL,
    decode_responses=True,  # Automatically decode responses to strings
    socket_connect_timeout=5,
    socket_timeout=5,
    retry_on_timeout=True,
    health_check_interval=30
)


class RedisSessionManager:
    """Manager for Redis-based session storage"""
    
    def __init__(self, client: redis.Redis):
        self.client = client
    
    async def set_session(
        self,
        session_id: str,
        data: Dict[str, Any],
        expiry_seconds: int = 600  # Default 10 minutes
    ) -> bool:
        try:
            json_data = json.dumps(data)
            await self.client.setex(
                name=f"session:{session_id}",
                time=expiry_seconds,
                value=json_data
            )
            return True
        except Exception as e:
            print(f"[Redis] Error setting session {session_id}: {e}")
            return False
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        try:
            json_data = await self.client.get(f"session:{session_id}")
            if json_data is None:
                return None
            return json.loads(json_data)
        except Exception as e:
            print(f"[Redis] Error getting session {session_id}: {e}")
            return None
    
    async def delete_session(self, session_id: str) -> bool:
        try:
            result = await self.client.delete(f"session:{session_id}")
            return result > 0
        except Exception as e:
            print(f"[Redis] Error deleting session {session_id}: {e}")
            return False
    
    async def update_session(
        self,
        session_id: str,
        data: Dict[str, Any],
        keep_ttl: bool = True
    ) -> bool:
        try:
            key = f"session:{session_id}"
            if keep_ttl:
                ttl = await self.client.ttl(key)
                if ttl <= 0:
                    return False
                json_data = json.dumps(data)
                await self.client.setex(name=key, time=ttl, value=json_data)
            else:
                json_data = json.dumps(data)
                await self.client.set(key, json_data)
            return True
        except Exception as e:
            print(f"[Redis] Error updating session {session_id}: {e}")
            return False
    
    async def session_exists(self, session_id: str) -> bool:
        try:
            return await self.client.exists(f"session:{session_id}") > 0
        except Exception as e:
            print(f"[Redis] Error checking session {session_id}: {e}")
            return False
    
    async def get_session_ttl(self, session_id: str) -> int:
        try:
            return await self.client.ttl(f"session:{session_id}")
        except Exception as e:
            print(f"[Redis] Error getting TTL for session {session_id}: {e}")
            return -2
    
    async def extend_session(self, session_id: str, additional_seconds: int) -> bool:
        try:
            key = f"session:{session_id}"
            current_ttl = await self.client.ttl(key)
            if current_ttl <= 0:
                return False
            new_ttl = current_ttl + additional_seconds
            await self.client.expire(key, new_ttl)
            return True
        except Exception as e:
            print(f"[Redis] Error extending session {session_id}: {e}")
            return False


class TwoFactorSessionManager(RedisSessionManager):
    """Specialized manager for 2FA sessions"""
    
    async def create_2fa_session(
        self,
        session_id: str,
        user_id: str,
        email: str,
        code: str,
        expiry_minutes: int = 10
    ) -> bool:
        data = {
            'user_id': user_id,
            'email': email,
            'code': code,
            'verified': False,
            'created_at': str(timedelta(seconds=0))
        }
        return await self.set_session(
            session_id=session_id,
            data=data,
            expiry_seconds=expiry_minutes * 60
        )
    
    async def verify_2fa_code(self, session_id: str, code: str) -> Optional[Dict[str, Any]]:
        session = await self.get_session(session_id)
        if session is None:
            return None
        if session.get('code') != code:
            return None
        if session.get('verified'):
            return None
        session['verified'] = True
        await self.update_session(session_id, session)
        return session
    
    async def invalidate_2fa_session(self, session_id: str) -> bool:
        return await self.delete_session(session_id)


# Initialize managers
session_manager = RedisSessionManager(redis_client)
two_fa_manager = TwoFactorSessionManager(redis_client)


# Health check function
async def check_redis_connection() -> bool:
    try:
        return await redis_client.ping()
    except Exception as e:
        print(f"[Redis] Connection check failed: {e}")
        return False


# Cache utilities for API responses
class CacheManager:
    """Manager for caching API responses"""
    
    def __init__(self, client):
        self.client = client
    
    async def get(self, key: str) -> Optional[str]:
        try:
            return await self.client.get(f"cache:{key}")
        except Exception as e:
            print(f"[Cache] Error getting key {key}: {e}")
            return None
    
    async def set(self, key: str, value: str, expiry_seconds: int = 300) -> bool:
        try:
            await self.client.setex(f"cache:{key}", expiry_seconds, value)
            return True
        except Exception as e:
            print(f"[Cache] Error setting key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        try:
            await self.client.delete(f"cache:{key}")
            return True
        except Exception as e:
            print(f"[Cache] Error deleting key {key}: {e}")
            return False
    
    async def get_json(self, key: str) -> Optional[Dict[str, Any]]:
        try:
            data = await self.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            print(f"[Cache] Error getting JSON key {key}: {e}")
            return None
    
    async def set_json(self, key: str, value: Dict[str, Any], expiry_seconds: int = 300) -> bool:
        try:
            json_data = json.dumps(value)
            return await self.set(key, json_data, expiry_seconds)
        except Exception as e:
            print(f"[Cache] Error setting JSON key {key}: {e}")
            return False


# Initialize cache manager
cache_manager = CacheManager(redis_client)

