'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiUrl } from '@/utils/api';

export default function ReviewInvitationAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="text-gray-600">Loading...</div>
          </div>
        </div>
      }
    >
      <ReviewInvitationAcceptInner />
    </Suspense>
  );
}

function ReviewInvitationAcceptInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState<'idle' | 'working' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const nextUrl = useMemo(() => `/review-invitation/accept?token=${encodeURIComponent(token)}`, [token]);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing invitation token.');
      return;
    }

    const access = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const role = typeof window !== 'undefined' ? localStorage.getItem('user_role') : null;

    if (!access) {
      router.replace(`/login?next=${encodeURIComponent(nextUrl)}`);
      return;
    }

    // Optional: guide user to correct account type
    if (role && role !== 'reviewer') {
      // Still attempt accept (backend enforces token ownership); but show warning.
      setMessage('You are logged in, but not as a reviewer account. If acceptance fails, login with the invited reviewer account.');
    }

    const run = async () => {
      setStatus('working');
      setMessage('');
      try {
        const res = await fetch(apiUrl('review-invitations/accept/'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${access}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.detail || data.error || 'Failed to accept invitation');
        }
        setStatus('ok');
        setMessage('Invitation accepted. You can now view the manuscript in your reviewer dashboard.');
      } catch (e: any) {
        setStatus('error');
        setMessage(e?.message || 'Failed to accept invitation.');
      }
    };

    run();
  }, [router, token, nextUrl]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900">Accept Review Invitation</h1>
        <p className="text-gray-600 mt-2">
          We’re confirming your acceptance for this review assignment.
        </p>

        {status === 'working' && (
          <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800">
            Confirming invitation...
          </div>
        )}

        {(status === 'ok' || status === 'error' || message) && (
          <div
            className={`mt-6 p-4 rounded-xl border ${
              status === 'ok'
                ? 'bg-green-50 border-green-200 text-green-800'
                : status === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-gray-50 border-gray-200 text-gray-800'
            }`}
          >
            {message || (status === 'ok' ? 'Accepted.' : 'Something went wrong.')}
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href="/reviewer-dashboard"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            Go to Reviewer Dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200 transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

