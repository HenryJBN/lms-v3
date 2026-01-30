import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_subdomain_availability():
    print("\n--- Testing Subdomain Availability ---")
    
    # Test reserved
    resp = requests.post(f"{BASE_URL}/onboarding/check-subdomain", json={"subdomain": "admin", "available": False})
    print(f"Checking 'admin' (Reserved): {resp.json().get('available')} - {resp.json().get('message')}")
    
    # Test new
    import uuid
    new_sub = f"test-{uuid.uuid4().hex[:6]}"
    resp = requests.post(f"{BASE_URL}/onboarding/check-subdomain", json={"subdomain": new_sub, "available": False})
    print(f"Checking '{new_sub}' (New): {resp.json().get('available')} - {resp.json().get('message')}")
    return new_sub

def test_tenant_registration(subdomain):
    print("\n--- Testing Tenant Registration ---")
    payload = {
        "school_name": f"Academy for {subdomain}",
        "subdomain": subdomain,
        "admin_email": f"admin@{subdomain}.com",
        "admin_password": "securepassword123",
        "admin_first_name": "John",
        "admin_last_name": "Doe"
    }
    
    resp = requests.post(f"{BASE_URL}/onboarding/register-tenant", json=payload)
    if resp.status_code == 201:
        print(f"Success! Registered {subdomain}")
        print(json.dumps(resp.json(), indent=2))
    else:
        print(f"Failed: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    try:
        sub = test_subdomain_availability()
        test_tenant_registration(sub)
    except Exception as e:
        print(f"Error: {e}")
