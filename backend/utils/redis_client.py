"""
Redis client for session management and caching
"""
import redis
import json
import os
from typing import Optional, Dict, Any
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

# Get Redis URL from environment
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Create Redis client
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
    
    def set_session(
        self,
        session_id: str,
        data: Dict[str, Any],
        expiry_seconds: int = 600  # Default 10 minutes
    ) -> bool:
        """
        Store session data in Redis with expiration
        
        Args:
            session_id: Unique session identifier
            data: Session data to store
            expiry_seconds: Time to live in seconds (default: 600 = 10 minutes)
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Serialize data to JSON
            json_data = json.dumps(data)
            
            # Store with expiration
            self.client.setex(
                name=f"session:{session_id}",
                time=expiry_seconds,
                value=json_data
            )
            return True
        except Exception as e:
            print(f"[Redis] Error setting session {session_id}: {e}")
            return False
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve session data from Redis
        
        Args:
            session_id: Unique session identifier
        
        Returns:
            dict: Session data if found, None otherwise
        """
        try:
            # Get data from Redis
            json_data = self.client.get(f"session:{session_id}")
            
            if json_data is None:
                return None
            
            # Deserialize JSON
            return json.loads(json_data)
        except Exception as e:
            print(f"[Redis] Error getting session {session_id}: {e}")
            return None
    
    def delete_session(self, session_id: str) -> bool:
        """
        Delete session from Redis
        
        Args:
            session_id: Unique session identifier
        
        Returns:
            bool: True if deleted, False otherwise
        """
        try:
            result = self.client.delete(f"session:{session_id}")
            return result > 0
        except Exception as e:
            print(f"[Redis] Error deleting session {session_id}: {e}")
            return False
    
    def update_session(
        self,
        session_id: str,
        data: Dict[str, Any],
        keep_ttl: bool = True
    ) -> bool:
        """
        Update session data while preserving TTL
        
        Args:
            session_id: Unique session identifier
            data: New session data
            keep_ttl: Whether to preserve existing TTL (default: True)
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            key = f"session:{session_id}"
            
            if keep_ttl:
                # Get remaining TTL
                ttl = self.client.ttl(key)
                if ttl <= 0:
                    # Session expired or doesn't exist
                    return False
                
                # Update with same TTL
                json_data = json.dumps(data)
                self.client.setex(name=key, time=ttl, value=json_data)
            else:
                # Update without TTL (will persist)
                json_data = json.dumps(data)
                self.client.set(key, json_data)
            
            return True
        except Exception as e:
            print(f"[Redis] Error updating session {session_id}: {e}")
            return False
    
    def session_exists(self, session_id: str) -> bool:
        """
        Check if session exists in Redis
        
        Args:
            session_id: Unique session identifier
        
        Returns:
            bool: True if exists, False otherwise
        """
        try:
            return self.client.exists(f"session:{session_id}") > 0
        except Exception as e:
            print(f"[Redis] Error checking session {session_id}: {e}")
            return False
    
    def get_session_ttl(self, session_id: str) -> int:
        """
        Get remaining time to live for session
        
        Args:
            session_id: Unique session identifier
        
        Returns:
            int: Remaining seconds (-1 if no expiry, -2 if doesn't exist)
        """
        try:
            return self.client.ttl(f"session:{session_id}")
        except Exception as e:
            print(f"[Redis] Error getting TTL for session {session_id}: {e}")
            return -2
    
    def extend_session(self, session_id: str, additional_seconds: int) -> bool:
        """
        Extend session expiration time
        
        Args:
            session_id: Unique session identifier
            additional_seconds: Seconds to add to current TTL
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            key = f"session:{session_id}"
            current_ttl = self.client.ttl(key)
            
            if current_ttl <= 0:
                return False
            
            new_ttl = current_ttl + additional_seconds
            self.client.expire(key, new_ttl)
            return True
        except Exception as e:
            print(f"[Redis] Error extending session {session_id}: {e}")
            return False


class TwoFactorSessionManager(RedisSessionManager):
    """Specialized manager for 2FA sessions"""
    
    def create_2fa_session(
        self,
        session_id: str,
        user_id: str,
        email: str,
        code: str,
        expiry_minutes: int = 10
    ) -> bool:
        """
        Create a 2FA session
        
        Args:
            session_id: Unique session identifier
            user_id: User ID
            email: User email
            code: 6-digit authentication code
            expiry_minutes: Session expiration in minutes (default: 10)
        
        Returns:
            bool: True if successful, False otherwise
        """
        data = {
            'user_id': user_id,
            'email': email,
            'code': code,
            'verified': False,
            'created_at': str(timedelta(seconds=0))  # Will be replaced by Redis timestamp
        }
        
        return self.set_session(
            session_id=session_id,
            data=data,
            expiry_seconds=expiry_minutes * 60
        )
    
    def verify_2fa_code(self, session_id: str, code: str) -> Optional[Dict[str, Any]]:
        """
        Verify 2FA code and return session data if valid
        
        Args:
            session_id: Unique session identifier
            code: 6-digit code to verify
        
        Returns:
            dict: Session data if code is valid, None otherwise
        """
        session = self.get_session(session_id)
        
        if session is None:
            print(f"[2FA] Session {session_id} not found or expired")
            return None
        
        if session.get('code') != code:
            print(f"[2FA] Invalid code for session {session_id}")
            return None
        
        if session.get('verified'):
            print(f"[2FA] Session {session_id} already verified")
            return None
        
        # Mark as verified
        session['verified'] = True
        self.update_session(session_id, session)
        
        return session
    
    def invalidate_2fa_session(self, session_id: str) -> bool:
        """
        Invalidate (delete) a 2FA session
        
        Args:
            session_id: Unique session identifier
        
        Returns:
            bool: True if deleted, False otherwise
        """
        return self.delete_session(session_id)


# Initialize managers
session_manager = RedisSessionManager(redis_client)
two_fa_manager = TwoFactorSessionManager(redis_client)


# Health check function
def check_redis_connection() -> bool:
    """
    Check if Redis is connected and responsive
    
    Returns:
        bool: True if connected, False otherwise
    """
    try:
        return redis_client.ping()
    except Exception as e:
        print(f"[Redis] Connection check failed: {e}")
        return False

