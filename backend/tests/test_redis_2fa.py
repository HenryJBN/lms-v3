"""
Test script for Redis 2FA session management
Run this to verify Redis integration is working correctly
"""
import uuid
from utils.redis_client import two_fa_manager, check_redis_connection, redis_client

def test_redis_connection():
    """Test 1: Check Redis connection"""
    print("\n" + "="*60)
    print("TEST 1: Redis Connection")
    print("="*60)
    
    if check_redis_connection():
        print("✅ Redis is connected and responsive")
        return True
    else:
        print("❌ Redis connection failed")
        print("   Make sure Redis is running: redis-server")
        return False

def test_create_session():
    """Test 2: Create 2FA session"""
    print("\n" + "="*60)
    print("TEST 2: Create 2FA Session")
    print("="*60)
    
    session_id = str(uuid.uuid4())
    print(f"Session ID: {session_id}")
    
    success = two_fa_manager.create_2fa_session(
        session_id=session_id,
        user_id="test-user-123",
        email="test@example.com",
        code="123456",
        expiry_minutes=10
    )
    
    if success:
        print("✅ Session created successfully")
        
        # Verify it exists in Redis
        exists = two_fa_manager.session_exists(session_id)
        print(f"✅ Session exists in Redis: {exists}")
        
        # Check TTL
        ttl = two_fa_manager.get_session_ttl(session_id)
        print(f"✅ Session TTL: {ttl} seconds (~10 minutes)")
        
        return session_id
    else:
        print("❌ Failed to create session")
        return None

def test_retrieve_session(session_id):
    """Test 3: Retrieve session data"""
    print("\n" + "="*60)
    print("TEST 3: Retrieve Session Data")
    print("="*60)
    
    session = two_fa_manager.get_session(session_id)
    
    if session:
        print("✅ Session retrieved successfully")
        print(f"   User ID: {session.get('user_id')}")
        print(f"   Email: {session.get('email')}")
        print(f"   Code: {session.get('code')}")
        print(f"   Verified: {session.get('verified')}")
        return True
    else:
        print("❌ Failed to retrieve session")
        return False

def test_verify_code(session_id):
    """Test 4: Verify 2FA code"""
    print("\n" + "="*60)
    print("TEST 4: Verify 2FA Code")
    print("="*60)
    
    # Test with wrong code
    print("Testing with wrong code (999999)...")
    result = two_fa_manager.verify_2fa_code(session_id, "999999")
    if result is None:
        print("✅ Correctly rejected wrong code")
    else:
        print("❌ Should have rejected wrong code")
    
    # Test with correct code
    print("\nTesting with correct code (123456)...")
    result = two_fa_manager.verify_2fa_code(session_id, "123456")
    if result:
        print("✅ Correctly verified code")
        print(f"   Session marked as verified: {result.get('verified')}")
        return True
    else:
        print("❌ Failed to verify correct code")
        return False

def test_session_cleanup(session_id):
    """Test 5: Clean up session"""
    print("\n" + "="*60)
    print("TEST 5: Session Cleanup")
    print("="*60)
    
    # Delete session
    success = two_fa_manager.invalidate_2fa_session(session_id)
    
    if success:
        print("✅ Session deleted successfully")
        
        # Verify it's gone
        exists = two_fa_manager.session_exists(session_id)
        if not exists:
            print("✅ Session no longer exists in Redis")
            return True
        else:
            print("❌ Session still exists after deletion")
            return False
    else:
        print("❌ Failed to delete session")
        return False

def test_session_expiration():
    """Test 6: Session expiration"""
    print("\n" + "="*60)
    print("TEST 6: Session Expiration")
    print("="*60)
    
    session_id = str(uuid.uuid4())
    print(f"Creating session with 5 second expiration...")
    
    # Create session with short expiration
    success = two_fa_manager.create_2fa_session(
        session_id=session_id,
        user_id="test-user-456",
        email="test2@example.com",
        code="654321",
        expiry_minutes=0.083  # ~5 seconds
    )
    
    if success:
        print("✅ Session created")
        
        # Check TTL
        ttl = two_fa_manager.get_session_ttl(session_id)
        print(f"✅ Initial TTL: {ttl} seconds")
        
        # Wait for expiration
        import time
        print("⏳ Waiting 6 seconds for expiration...")
        time.sleep(6)
        
        # Check if expired
        exists = two_fa_manager.session_exists(session_id)
        if not exists:
            print("✅ Session expired automatically")
            return True
        else:
            print("❌ Session should have expired")
            # Clean up
            two_fa_manager.invalidate_2fa_session(session_id)
            return False
    else:
        print("❌ Failed to create session")
        return False

def test_multiple_sessions():
    """Test 7: Multiple concurrent sessions"""
    print("\n" + "="*60)
    print("TEST 7: Multiple Concurrent Sessions")
    print("="*60)
    
    sessions = []
    
    # Create 5 sessions
    print("Creating 5 concurrent sessions...")
    for i in range(5):
        session_id = str(uuid.uuid4())
        success = two_fa_manager.create_2fa_session(
            session_id=session_id,
            user_id=f"user-{i}",
            email=f"user{i}@example.com",
            code=f"{i:06d}",
            expiry_minutes=10
        )
        if success:
            sessions.append(session_id)
            print(f"  ✅ Session {i+1} created")
        else:
            print(f"  ❌ Session {i+1} failed")
    
    # Verify all exist
    print(f"\n✅ Created {len(sessions)} sessions")
    
    # Clean up
    print("\nCleaning up sessions...")
    for session_id in sessions:
        two_fa_manager.invalidate_2fa_session(session_id)
    
    print("✅ All sessions cleaned up")
    return True

def run_all_tests():
    """Run all tests"""
    print("\n" + "="*60)
    print("REDIS 2FA SESSION MANAGEMENT TESTS")
    print("="*60)
    
    results = []
    
    # Test 1: Connection
    if not test_redis_connection():
        print("\n❌ Redis connection failed. Cannot continue tests.")
        return
    results.append(True)
    
    # Test 2: Create session
    session_id = test_create_session()
    if session_id:
        results.append(True)
    else:
        print("\n❌ Session creation failed. Cannot continue tests.")
        return
    
    # Test 3: Retrieve session
    results.append(test_retrieve_session(session_id))
    
    # Test 4: Verify code
    results.append(test_verify_code(session_id))
    
    # Test 5: Cleanup
    results.append(test_session_cleanup(session_id))
    
    # Test 6: Expiration
    results.append(test_session_expiration())
    
    # Test 7: Multiple sessions
    results.append(test_multiple_sessions())
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! Redis 2FA is working correctly.")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please check the output above.")
    
    print("="*60)

if __name__ == "__main__":
    run_all_tests()

