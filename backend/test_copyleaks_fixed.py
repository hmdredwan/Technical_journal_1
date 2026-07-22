#!/usr/bin/env python3
"""
Test script for Copyleaks API authentication and file submission
"""
import base64
import requests
import os

def test_copyleaks_auth_and_submit():
    # Copyleaks credentials
    email = 'mdredwanhossain9999@gmail.com'
    api_key = '878aa6f5-e4ab-4856-9257-8d035c3d16df'

    try:
        # Step 1: Authenticate with Copyleaks
        print("🔐 Authenticating with Copyleaks API...")
        login_url = 'https://id.copyleaks.com/v3/account/login/api'
        login_payload = {
            'email': email,
            'key': api_key
        }

        login_response = requests.post(
            login_url,
            json=login_payload,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )

        print(f"Login response status: {login_response.status_code}")

        if login_response.status_code != 200:
            print("❌ Authentication failed!")
            print(f"Response: {login_response.text}")
            return False

        auth_data = login_response.json()
        access_token = auth_data.get('access_token')

        if not access_token:
            print("❌ No access token received!")
            print(f"Response data: {auth_data}")
            return False

        print("✅ Authentication successful! Got access token.")

        # Step 2: Submit a test file
        print("\n📤 Submitting test file...")

        # Create a simple test text file
        test_content = b"This is a test document for plagiarism checking. It contains some sample text that can be used to verify the API integration works correctly with proper authentication."

        # Encode to base64
        base64_content = base64.b64encode(test_content).decode('utf-8')

        # Prepare the submission payload
        submission_payload = {
            'base64': base64_content,
            'filename': 'test_document.txt',
            'properties': {
                'webhookUrl': None,
                'customHeaders': None
            }
        }

        # Submit to Copyleaks API
        submit_url = 'https://api.copyleaks.com/v3/scans/submit/file'
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

        response = requests.post(
            submit_url,
            json=submission_payload,
            headers=headers,
            timeout=60
        )

        print(f"Submit response status: {response.status_code}")

        if response.status_code in [200, 201]:
            result = response.json()
            print("✅ File submission successful!")
            print(f"Scan ID: {result.get('id', 'N/A')}")
            print(f"Status: {result.get('status', {}).get('code', 'N/A') if isinstance(result.get('status'), dict) else 'N/A'}")
            return True
        else:
            print("❌ File submission failed!")
            try:
                error_data = response.json()
                print(f"Error: {error_data}")
            except:
                print(f"Raw response: {response.text}")
            return False

    except requests.exceptions.Timeout:
        print("❌ Request timed out")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    print("Testing Copyleaks API authentication and file submission...")
    success = test_copyleaks_auth_and_submit()
    if success:
        print("\n🎉 Copyleaks API integration test passed!")
        print("The plagiarism check feature should now work correctly.")
    else:
        print("\n💥 Copyleaks API integration test failed!")
        print("Please check your API credentials and network connection.")