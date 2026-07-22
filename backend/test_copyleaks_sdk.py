#!/usr/bin/env python3
"""
Test script for Copyleaks SDK integration
"""
import base64

def test_copyleaks_sdk():
    # Copyleaks credentials
    email = 'mdredwanhossain9999@gmail.com'
    api_key = '878aa6f5-e4ab-4856-9257-8d035c3d16df'

    try:
        # Try SDK approach
        from copyleaks import Copyleaks
        from copyleaks.models.submit.document import FileDocument
        from copyleaks.models.submit.properties.scan_properties import ScanProperties

        print("🔐 Authenticating with Copyleaks SDK...")
        auth_token = Copyleaks.login(email, api_key)
        print("✅ Authentication successful!")
        print(f"Auth token contains: {list(auth_token.keys())}")

        # Create test file
        test_content = b"This is a test document for plagiarism checking. It contains some sample text that can be used to verify the API integration works correctly with proper authentication."
        base64_content = base64.b64encode(test_content).decode('utf-8')

        # Create scan properties
        scan_properties = ScanProperties()
        scan_properties.set_sandbox(True)  # Use sandbox for testing

        # Create file document
        file_submission = FileDocument(base64_content, 'test_document.txt')
        file_submission.set_properties(scan_properties)

        # Generate scan ID
        import uuid
        scan_id = str(uuid.uuid4())

        print("📤 Submitting test file using SDK...")
        Copyleaks.submit_file(auth_token, scan_id, file_submission)
        print("✅ File submission successful!")
        print(f"Scan ID: {scan_id}")
        print("🎉 Copyleaks SDK integration test passed!")
        return True

    except Exception as e:
        print(f"❌ SDK Error: {e}")
        print(f"Error type: {type(e).__name__}")
        return False

if __name__ == "__main__":
    print("Testing Copyleaks SDK integration...")
    success = test_copyleaks_sdk()
    if not success:
        print("\n💥 Copyleaks SDK integration test failed!")
        print("The credentials might be invalid or the SDK might not be properly installed.")