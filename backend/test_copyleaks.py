#!/usr/bin/env python3
"""
Test script for Copyleaks API integration
"""
import base64
import requests
import os

def test_copyleaks_api():
    # Copyleaks credentials
    email = 'mdredwanhossain9999@gmail.com'
    api_key = '878aa6f5-e4ab-4856-9257-8d035c3d16df'

    # Create a simple test text file
    test_content = b"This is a test document for plagiarism checking. It contains some sample text that can be used to verify the API integration works correctly."

    # Encode to base64
    base64_content = base64.b64encode(test_content).decode('utf-8')

    # Prepare submission payload
    submission_payload = {
        'base64': base64_content,
        'filename': 'test_document.txt',
        'properties': {
            'webhookUrl': None,
            'customHeaders': None
        }
    }

    # Submit to Copyleaks API
    submit_url = 'https://api.copyleaks.com/v3/submit/file'
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }

    try:
        print("Submitting test file to Copyleaks API...")
        response = requests.post(
            submit_url,
            json=submission_payload,
            headers=headers,
            timeout=60
        )

        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")

        if response.status_code in [200, 201]:
            result = response.json()
            print("✅ Success! API response:")
            print(f"Scan ID: {result.get('scanId', 'N/A')}")
            print(f"Process ID: {result.get('processId', 'N/A')}")
            print(f"Status: {result.get('status', {}).get('code', 'N/A')}")
            return True
        else:
            print("❌ API Error:")
            try:
                error_data = response.json()
                print(f"Error message: {error_data}")
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
    print("Testing Copyleaks API integration...")
    success = test_copyleaks_api()
    if success:
        print("\n🎉 Copyleaks API integration test passed!")
    else:
        print("\n💥 Copyleaks API integration test failed!")