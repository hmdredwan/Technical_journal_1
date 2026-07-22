// src/app/editor-dashboard/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, X } from 'lucide-react';
import { apiUrl } from '@/utils/api';

export default function EditorSettingsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<string | null>(null);
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

  const applyTheme = (isDark: boolean) => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  };

  useEffect(() => {
    setMounted(true);

    const token = localStorage.getItem('access_token');
    const userRole = localStorage.getItem('user_role')?.toLowerCase();

    if (!token || !userRole) {
      router.push('/login');
      return;
    }

    setRole(userRole);

    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    applyTheme(isDarkMode);
  }, [router]);

  if (!mounted || !role) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const getDashboardLink = () => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return '/dashboard';
      case 'editor':
      case 'editor_in_chief':
      case 'managing_editor':
      case 'associate_editor':
        return '/editor-dashboard';
      case 'author':
        return '/author-dashboard';
      default:
        return '/user-dashboard';
    }
  };

  const handleBackToDashboard = () => {
    const dashboardPath = getDashboardLink();
    const separator = dashboardPath.includes('?') ? '&' : '?';
    router.push(`${dashboardPath}${separator}tab=overview`);
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
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
      setError('Authentication token not found. Please login again.');
      router.push('/login');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const res = await fetch(apiUrl('change-password/'), {
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

      const text = await res.text();
      let data: Record<string, unknown> | null = null;
      try {
        data = JSON.parse(text);
      } catch {
        // not JSON
      }

      const getFirstString = (value: unknown): string | undefined => {
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
          return value[0];
        }
        return undefined;
      };

      if (!res.ok) {
        if (res.status === 401) {
          setError('Your session has expired. Please login again.');
          localStorage.clear();
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        const errMsg =
          data?.detail as string | undefined ||
          data?.message as string | undefined ||
          getFirstString(data?.non_field_errors) ||
          getFirstString((data as Record<string, unknown>)?.current_password) ||
          `Failed to change password (${res.status})`;

        throw new Error(errMsg);
      }

      setSuccess('Password changed successfully!');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setShowPasswordForm(false);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change password. Please try again.';
      setError(message);
      console.error('Password change error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        type="button"
        onClick={handleBackToDashboard}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
      >
        <ArrowLeft size={20} />
        Back to Dashboard
      </button>

      {/* Settings Card */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">Settings</h1>

        {/* Dark Mode Toggle */}
        {/* <div className="mb-8 pb-8 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {darkMode ? (
                <Moon size={24} className="text-gray-700" />
              ) : (
                <Sun size={24} className="text-yellow-500" />
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Dark Mode</h3>
                <p className="text-sm text-gray-500">
                  {darkMode ? 'Currently enabled' : 'Currently disabled'}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleDarkModeToggle(!darkMode)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
                darkMode ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
                  darkMode ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div> */}

        {/* Change Password Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
              <p className="text-sm text-gray-500">
                Update your password to keep your account secure
              </p>
            </div>
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                showPasswordForm
                  ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="current_password"
                    value={passwordForm.current_password}
                    onChange={handlePasswordInputChange}
                    placeholder="Enter your current password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={loading}
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
                    placeholder="Enter your new password (minimum 8 characters)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    minLength={8}
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-2">Minimum 8 characters</p>
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
                    placeholder="Confirm your new password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowPasswordForm(false)}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-100 transition font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <X size={20} />
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition font-medium shadow-sm disabled:bg-blue-400 disabled:cursor-not-allowed min-w-[160px]"
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