'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiUrl } from '@/utils/api';
import { CheckCircle, AlertCircle } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email, please wait...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Verification token not found.');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(apiUrl(`verify-email/?token=${encodeURIComponent(token)}`));
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || data.detail || 'Verification failed.');
        }
        setStatus('success');
        setMessage(data.message || 'Email verified successfully. You may now login.');
      } catch (error: any) {
        setStatus('error');
        setMessage(error?.message || 'Verification failed.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-100 flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
        <div className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-sky-100 text-sky-700">
          {status === 'success' ? (
            <CheckCircle size={42} />
          ) : status === 'error' ? (
            <AlertCircle size={42} />
          ) : (
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          )}
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-4">
          {status === 'success' ? 'Email Verified' : status === 'error' ? 'Verification Failed' : 'Verifying...'}
        </h1>
        <p className="text-slate-600 mb-6">{message}</p>

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link href="/login" className="inline-flex justify-center rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700">
            Go to Login
          </Link>
          <Link href="/register" className="inline-flex justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            Back to Register
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-100 flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
        <div className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-sky-100 text-sky-700">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Verifying...</h1>
        <p className="text-slate-600 mb-6">Please wait while we verify your email.</p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
