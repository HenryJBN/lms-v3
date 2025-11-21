"""
Test script for HTTP-only refresh token implementation
Run this after starting the backend server
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def print_section(title):
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def print_cookies(response):
    print("\n📦 Cookies received:")
    for cookie in response.cookies:
        is_httponly = "HttpOnly" in response.headers.get("Set-Cookie", "")
        print(f"  - {cookie.name}: {cookie.value[:20]}... (HttpOnly: {is_httponly})")

def test_login():
    print_section("TEST 1: Login Flow")
    
    # Test login with mock credentials
    login_data = {
        "email": "admin@dcalms.com",
        "password": "admin123"
    }
    
    print(f"\n📤 POST {BASE_URL}/api/auth/login")
    print(f"   Body: {json.dumps(login_data, indent=2)}")
    
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=login_data
    )
    
    print(f"\n📥 Response Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ Login successful!")
        print(f"   Access Token: {data.get('access_token', '')[:30]}...")
        print(f"   User: {data.get('user', {}).get('email')}")
        
        # Check for Set-Cookie header
        set_cookie_header = response.headers.get('Set-Cookie', '')
        if 'refresh_token' in set_cookie_header:
            print(f"\n✅ Refresh token cookie set!")
            if 'HttpOnly' in set_cookie_header:
                print(f"   ✅ Cookie is HttpOnly (secure)")
            else:
                print(f"   ❌ Cookie is NOT HttpOnly (insecure!)")
            if 'SameSite=lax' in set_cookie_header or 'SameSite=Lax' in set_cookie_header:
                print(f"   ✅ SameSite=lax set (CSRF protection)")
        else:
            print(f"\n❌ No refresh_token cookie found!")
            
        print_cookies(response)
        return response.cookies
    else:
        print(f"❌ Login failed: {response.text}")
        return None

def test_refresh(cookies):
    print_section("TEST 2: Token Refresh")
    
    if not cookies:
        print("❌ No cookies available, skipping refresh test")
        return None
    
    print(f"\n📤 POST {BASE_URL}/api/auth/refresh")
    print(f"   Sending cookies: {list(cookies.keys())}")
    
    response = requests.post(
        f"{BASE_URL}/api/auth/refresh",
        cookies=cookies
    )
    
    print(f"\n📥 Response Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ Token refresh successful!")
        print(f"   New Access Token: {data.get('access_token', '')[:30]}...")
        print(f"   Token Type: {data.get('token_type')}")
        print(f"   Expires In: {data.get('expires_in')} seconds")
        
        # Check if new refresh token was rotated
        set_cookie_header = response.headers.get('Set-Cookie', '')
        if 'refresh_token' in set_cookie_header:
            print(f"\n✅ Refresh token rotated (new token issued)")
        
        return response.cookies
    else:
        print(f"❌ Refresh failed: {response.text}")
        return None

def test_refresh_without_cookie():
    print_section("TEST 3: Refresh Without Cookie (Should Fail)")
    
    print(f"\n📤 POST {BASE_URL}/api/auth/refresh")
    print(f"   Sending NO cookies")
    
    response = requests.post(f"{BASE_URL}/api/auth/refresh")
    
    print(f"\n📥 Response Status: {response.status_code}")
    
    if response.status_code == 401:
        print(f"\n✅ Correctly rejected (401 Unauthorized)")
        print(f"   Error: {response.json().get('detail')}")
    else:
        print(f"❌ Should have returned 401, got {response.status_code}")

def test_logout(cookies):
    print_section("TEST 4: Logout")
    
    if not cookies:
        print("❌ No cookies available, skipping logout test")
        return
    
    print(f"\n📤 POST {BASE_URL}/api/auth/logout")
    
    response = requests.post(
        f"{BASE_URL}/api/auth/logout",
        cookies=cookies
    )
    
    print(f"\n📥 Response Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ Logout successful!")
        print(f"   Message: {data.get('message')}")
        
        # Check if cookie was cleared
        set_cookie_header = response.headers.get('Set-Cookie', '')
        if 'refresh_token' in set_cookie_header and ('Max-Age=0' in set_cookie_header or 'expires=' in set_cookie_header):
            print(f"   ✅ Refresh token cookie cleared")
        else:
            print(f"   ⚠️  Cookie clearing not detected in headers")
    else:
        print(f"❌ Logout failed: {response.text}")

if __name__ == "__main__":
    print("\n🧪 Testing HTTP-only Refresh Token Implementation")
    print(f"   Backend URL: {BASE_URL}")
    
    # Run tests
    cookies = test_login()
    
    if cookies:
        test_refresh(cookies)
        test_refresh_without_cookie()
        test_logout(cookies)
    
    print("\n" + "="*60)
    print("  Tests Complete!")
    print("="*60 + "\n")

