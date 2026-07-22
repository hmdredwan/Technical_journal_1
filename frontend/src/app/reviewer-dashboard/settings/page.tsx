'use client';

import { useEffect, useState } from 'react';
import { Save, X, Sun, Moon } from 'lucide-react';
import { apiUrl } from '@/utils/api';

export default function ReviewerSettingsPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const applyTheme = (isDark: boolean) => {
    const html = document.documentElement;
    if (isDark) html.classList.add('dark');
    else html.classList.remove('dark');
  };

  useEffect(() => {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDarkMode);
    applyTheme(isDarkMode);
  }, []);

  const handleDarkModeToggle = (enabled: boolean) => {
    setDarkMode(enabled);
    localStorage.setItem('darkMode', enabled ? 'true' : 'false');
    applyTheme(enabled);
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!passwordForm.current_password) return setError('Current password is required');
    if (!passwordForm.new_password) return setError('New password is required');
    if (passwordForm.new_password.length < 8) return setError('New password must be at least 8 characters');
    if (passwordForm.new_password === passwordForm.current_password) return setError('New password must be different from the current password');
    if (passwordForm.new_password !== passwordForm.confirm_password) return setError('New passwords do not match');

    const token = localStorage.getItem('access_token');
    if (!token) return setError('Authentication token missing. Please login again.');

    try {
      setLoading(true);
      const response = await fetch(apiUrl('change-password/'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errMsg =
          data?.message ||
          data?.error ||
          data?.detail ||
          data?.non_field_errors?.[0] ||
          `Failed to change password (${response.status})`;
        throw new Error(errMsg);
      }

      setSuccess('Password changed successfully!');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setShowPasswordForm(false);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] relative">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">Settings</h1>

        {/* <div className="mb-8 pb-8 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {darkMode ? <Moon size={24} className="text-gray-700" /> : <Sun size={24} className="text-yellow-500" />}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Dark Mode</h3>
                <p className="text-sm text-gray-500">{darkMode ? 'Currently enabled' : 'Currently disabled'}</p>
              </div>
            </div>
            <button
              onClick={() => handleDarkModeToggle(!darkMode)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${darkMode ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${darkMode ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
        </div> */}

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
              <p className="text-sm text-gray-500">Update your password to keep your account secure</p>
            </div>
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                showPasswordForm ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {showPasswordForm ? 'Cancel' : 'Change Password'}
            </button>
          </div>

          {showPasswordForm && (
            <form onSubmit={handleChangePassword} className="mt-6 p-6 bg-gray-50 rounded-lg space-y-6">
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

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Password <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    name="current_password"
                    value={passwordForm.current_password}
                    onChange={handlePasswordInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    name="new_password"
                    value={passwordForm.new_password}
                    onChange={handlePasswordInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">Minimum 8 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    name="confirm_password"
                    value={passwordForm.confirm_password}
                    onChange={handlePasswordInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowPasswordForm(false)}
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-100 transition font-medium"
                >
                  <X size={20} />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:bg-blue-400 transition font-medium min-w-[160px]"
                >
                  <Save size={20} />
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
