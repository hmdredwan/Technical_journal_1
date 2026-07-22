// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { apiUrl } from '@/utils/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const nextParam =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('next')
          : null;

      const response = await fetch(apiUrl('login/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Invalid email or password');
      }

      // Save tokens
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('user_name', data.user?.full_name || data.user?.email || 'User');

      // Get role (case-insensitive)
      // const userRole = (data.user?.role?.name || '').toLowerCase();
      const userRole = data.user?.role?.toLowerCase?.() || 'visitor';

      localStorage.setItem('user_role', userRole);

      // Dispatch auth change event for same-tab updates
      window.dispatchEvent(new Event('auth-change'));

      // Role-based redirection
      if (nextParam && nextParam.startsWith('/')) {
        router.push(nextParam);
        return;
      }
      if (userRole === 'admin') {
        router.push('/dashboard');
      } else if (userRole === 'author') {
        router.push('/author-dashboard');
      } else if (userRole === 'editor') {
        router.push('/editor-dashboard');
      } else if (userRole === 'reviewer') {
        router.push('/reviewer-dashboard');
      } else if (
        userRole.includes('editorial') || 
        userRole === 'editorial_board' || 
        userRole === 'editor_in_chief' || 
        userRole === 'managing_editor' || 
        userRole === 'associate_editor'
      ) {
        router.push('/editorial-dashboard');
      } else {
        router.push('/user-dashboard'); // fallback for other/visitor roles
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 w-full max-w-md transform hover:scale-[1.02] transition-transform duration-300">
        <div className="text-center mb-8">
          <Link href="/" className="flex items-center justify-center gap-3 mb-4 group">
            <Image
              src="/images/journal_logo_1.jpeg"
              alt="Journal Logo"
              width={48}
              height={48}
              className="object-contain group-hover:scale-105 transition-transform"
            />
            <h2 className="text-lg font-serif font-bold text-blue-600 group-hover:underline">Technical Journal</h2>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Login to your Technical Journal account</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Email Address"
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Password"
              className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <div className="text-right -mt-2">
            <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn className="h-5 w-5" />
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/register" className="text-blue-600 hover:underline font-medium ml-1">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}