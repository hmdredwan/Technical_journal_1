// src/components/admin/SettingsTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { apiUrl } from '@/utils/api';
import { Sun, Moon, Save, X } from 'lucide-react';

export default function SettingsTab() {
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password form
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    // Load dark mode preference
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const handleDarkModeToggle = (enabled: boolean) => {
    setDarkMode(enabled);
    localStorage.setItem('darkMode', enabled ? 'true' : 'false');
    document.documentElement.classList.toggle('dark', enabled);
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordForm.current_password) {
      setError('Current password is required');
      return;
    }
    if (!passwordForm.new_password) {
      setError('New password is required');
      return;
    }
    if (passwordForm.new_password.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (passwordForm.new_password === passwordForm.current_password) {
      setError('New password must be different from the current password');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('New passwords do not match');
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      setError('Session expired. Please login again.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(apiUrl('change-password/'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = {};
      }

      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expired. Please login again.');
          localStorage.clear();
          setTimeout(() => window.location.href = '/login', 2000);
          return;
        }
        throw new Error(data.message || data.error || `Failed (${response.status})`);
      }

      setSuccess('Password changed successfully!');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setShowPasswordForm(false);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Settings</h1> */}

      {/* Success / Error Messages */}
      {/* Success / Error Messages are now shown inside the password form */}

      {/* Dark Mode */}
      {/* <div className="bg-white rounded-xl shadow border p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {darkMode ? (
              <Moon size={28} className="text-gray-700" />
            ) : (
              <Sun size={28} className="text-yellow-500" />
            )}
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Dark Mode</h3>
              <p className="text-gray-600">
                {darkMode ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleDarkModeToggle(!darkMode)}
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
              darkMode ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-7 w-7 transform rounded-full bg-white shadow transition-transform ${
                darkMode ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div> */}

      {/* Change Password */}
      <div className="bg-white rounded-xl shadow border p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Change Password</h3>
            <p className="text-gray-600">Update your password for better security</p>
          </div>
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              showPasswordForm
                ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {showPasswordForm ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {showPasswordForm && (
          <form onSubmit={handleChangePassword} className="mt-6 space-y-6">
            {(error || success) && (
              <div className={`relative rounded-2xl border px-4 py-3 text-sm shadow-sm ${success ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <div className="flex items-start justify-between gap-4">
                  <p className="flex-1">{success || error}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setSuccess('');
                    }}
                    className="text-gray-500 hover:text-gray-800"
                    aria-label="Close alert"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="current_password"
                value={passwordForm.current_password}
                onChange={handlePasswordInputChange}
                placeholder="Enter current password"
                className="w-full px-5 py-3 border border-gray-300 rounded-2xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="new_password"
                value={passwordForm.new_password}
                onChange={handlePasswordInputChange}
                placeholder="At least 8 characters"
                className="w-full px-5 py-3 border border-gray-300 rounded-2xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="confirm_password"
                value={passwordForm.confirm_password}
                onChange={handlePasswordInputChange}
                placeholder="Confirm new password"
                className="w-full px-5 py-3 border border-gray-300 rounded-2xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                required
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setShowPasswordForm(false)}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                <Save size={18} />
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}