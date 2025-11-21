#!/bin/bash

# Test script for HTTP-only refresh token implementation
# Make sure backend is running on http://localhost:8000

BASE_URL="http://localhost:8000"
COOKIE_FILE="test_cookies.txt"

echo ""
echo "=========================================="
echo "  Testing Refresh Token Implementation"
echo "=========================================="
echo ""

# Clean up old cookie file
rm -f $COOKIE_FILE

# Test 1: Login (non-admin user to skip 2FA)
echo "TEST 1: Login Flow (Creating Test User)"
echo "========================================="
echo ""

# First, try to register a test user (student role, no 2FA)
echo "📤 Creating test student user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test_student@example.com",
    "username":"teststudent",
    "password":"testpass123",
    "first_name":"Test",
    "last_name":"Student",
    "role":"student"
  }' 2>&1)

echo "Registration response: $REGISTER_RESPONSE" | head -5
echo ""

# Now login with the test user
echo "📤 POST $BASE_URL/api/auth/login"
echo ""

LOGIN_RESPONSE=$(curl -s -i -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test_student@example.com","password":"testpass123"}' \
  -c $COOKIE_FILE)

echo "$LOGIN_RESPONSE" | head -25

# Check for refresh_token cookie
if echo "$LOGIN_RESPONSE" | grep -qi "set-cookie.*refresh_token"; then
    echo ""
    echo "✅ Refresh token cookie found!"

    if echo "$LOGIN_RESPONSE" | grep -qi "HttpOnly"; then
        echo "✅ Cookie is HttpOnly (secure)"
    else
        echo "❌ Cookie is NOT HttpOnly (insecure!)"
    fi

    if echo "$LOGIN_RESPONSE" | grep -qi "SameSite"; then
        echo "✅ SameSite attribute set"
    fi

    if echo "$LOGIN_RESPONSE" | grep -q "Path=/api/auth"; then
        echo "✅ Cookie path set to /api/auth"
    fi

    if echo "$LOGIN_RESPONSE" | grep -qi "Secure"; then
        echo "✅ Secure flag set"
    fi
else
    echo ""
    echo "❌ No refresh_token cookie found!"
fi

echo ""
echo "Cookie file contents:"
cat $COOKIE_FILE
echo ""

# Test 2: Refresh Token
echo ""
echo "=========================================="
echo "TEST 2: Token Refresh"
echo "=========================================="
echo ""
echo "📤 POST $BASE_URL/api/auth/refresh (with cookie)"
echo ""

REFRESH_RESPONSE=$(curl -s -i -X POST "$BASE_URL/api/auth/refresh" \
  -b $COOKIE_FILE)

echo "$REFRESH_RESPONSE" | head -20

if echo "$REFRESH_RESPONSE" | grep -q "200 OK"; then
    echo ""
    echo "✅ Token refresh successful!"
    
    # Extract access token from response
    ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    if [ ! -z "$ACCESS_TOKEN" ]; then
        echo "✅ New access token received: ${ACCESS_TOKEN:0:30}..."
    fi
else
    echo ""
    echo "❌ Token refresh failed!"
fi

# Test 3: Refresh Without Cookie
echo ""
echo "=========================================="
echo "TEST 3: Refresh Without Cookie"
echo "=========================================="
echo ""
echo "📤 POST $BASE_URL/api/auth/refresh (NO cookie)"
echo ""

NO_COOKIE_RESPONSE=$(curl -s -i -X POST "$BASE_URL/api/auth/refresh")

echo "$NO_COOKIE_RESPONSE" | head -15

if echo "$NO_COOKIE_RESPONSE" | grep -q "401"; then
    echo ""
    echo "✅ Correctly rejected (401 Unauthorized)"
else
    echo ""
    echo "❌ Should have returned 401!"
fi

# Test 4: Logout
echo ""
echo "=========================================="
echo "TEST 4: Logout"
echo "=========================================="
echo ""
echo "📤 POST $BASE_URL/api/auth/logout"
echo ""

LOGOUT_RESPONSE=$(curl -s -i -X POST "$BASE_URL/api/auth/logout" \
  -b $COOKIE_FILE)

echo "$LOGOUT_RESPONSE" | head -15

if echo "$LOGOUT_RESPONSE" | grep -q "200 OK"; then
    echo ""
    echo "✅ Logout successful!"
    
    if echo "$LOGOUT_RESPONSE" | grep -q "Set-Cookie.*refresh_token"; then
        echo "✅ Refresh token cookie cleared"
    fi
else
    echo ""
    echo "❌ Logout failed!"
fi

# Clean up
rm -f $COOKIE_FILE

echo ""
echo "=========================================="
echo "  Tests Complete!"
echo "=========================================="
echo ""

