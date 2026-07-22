'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiUrl } from '@/utils/api';

type Preview = {
  assignment_id: number;
  invite_response: 'pending' | 'accepted' | 'rejected';
  due_date?: string | null;
  admin_remarks?: string | null;
  submission: { id: number; title: string; keywords?: string; abstract?: string };
  reviewer: { id: number; full_name: string; email: string };
};

const REJECTION_REASONS = [
  { id: 'conflict_of_interest', label: 'Conflict of interest' },
  { id: 'insufficient_expertise', label: 'Not enough expertise on this topic' },
  { id: 'time_constraints', label: 'Not enough time / workload too high' },
  { id: 'unavailable', label: 'Unavailable during the review period' },
  { id: 'paper_out_of_scope', label: 'Manuscript is outside my scope' },
  { id: 'other', label: 'Other' },
] as const;

export default function ReviewInvitationRejectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="text-gray-600">Loading...</div>
          </div>
        </div>
      }
    >
      <ReviewInvitationRejectInner />
    </Suspense>
  );
}

function ReviewInvitationRejectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const previewUrl = useMemo(
    () => apiUrl(`review-invitations/preview/?token=${encodeURIComponent(token)}`),
    [token]
  );

  useEffect(() => {
    if (!token) {
      setError('Missing invitation token.');
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(previewUrl);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || 'Failed to load invitation');
        setPreview(data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load invitation.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [previewUrl, token]);

  const toggle = (id: string) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const submitReject = async () => {
    if (!token) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(apiUrl('review-invitations/reject/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reasons: selected, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Failed to submit rejection');
      setDone(true);
    } catch (e: any) {
      setError(e?.message || 'Failed to submit rejection.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900">Rejection Submitted</h1>
          <p className="text-gray-700 mt-3">
            Thank you. Technical Journal has received your response.
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900">Reject Review Invitation</h1>
          <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800">
            {error || 'Invitation not found.'}
          </div>
          <div className="mt-8">
            <button
              onClick={() => router.refresh()}
              className="px-6 py-3 rounded-xl bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { submission } = preview;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900">Reject Review Invitation</h1>
        <p className="text-gray-600 mt-2">
          Please tell us why you’re unable to review this manuscript. Your response will be sent to Technical Journal.
        </p>

        <div className="mt-6 p-6 rounded-xl bg-gray-50 border border-gray-200">
          <p className="text-sm text-gray-500">Manuscript</p>
          <h2 className="text-xl font-semibold text-gray-900 mt-1">{submission.title}</h2>
          {submission.keywords && (
            <p className="text-sm text-gray-700 mt-2">
              <strong>Keywords:</strong> {submission.keywords}
            </p>
          )}
          {submission.abstract && (
            <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
              <strong>Abstract:</strong>
              <div className="mt-2 p-4 bg-white rounded-lg border border-gray-200">
                {submission.abstract}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Reasons</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {REJECTION_REASONS.map(r => (
              <label
                key={r.id}
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-gray-300 cursor-pointer bg-white"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(r.id)}
                  onChange={() => toggle(r.id)}
                  className="h-5 w-5"
                />
                <span className="text-gray-800">{r.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional note (optional)
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={4}
            className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            placeholder="Any additional details you want to share..."
          />
        </div>

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800">
            {error}
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button
            onClick={submitReject}
            disabled={submitting}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Rejection'}
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200 transition"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}

