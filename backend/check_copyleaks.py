#!/usr/bin/env python3
"""
Test script to check if copyleaks SDK is installed
"""
import sys
print(f"Python executable: {sys.executable}")
print(f"Python path: {sys.path}")

try:
    from copyleaks import Copyleaks
    print("✅ SUCCESS: Copyleaks SDK imported successfully")
    print(f"Copyleaks version: {Copyleaks.__version__ if hasattr(Copyleaks, '__version__') else 'unknown'}")
except ImportError as e:
    print(f"❌ ERROR: Failed to import copyleaks: {e}")
    print("The copyleaks package is not installed in this Python environment")
except Exception as e:
    print(f"❌ ERROR: Unexpected error: {e}")