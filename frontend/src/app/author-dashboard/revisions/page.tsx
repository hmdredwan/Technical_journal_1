'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import UserDashboardLayout from '@/components/user/UserDashboardLayout';
import { apiUrl } from '@/utils/api';
import { AlertCircle, FileText, GitPullRequest } from 'lucide-react';

export default function AuthorRevisionsPage() {
  return (
    <Suspense
      fallback={
        <UserDashboardLayout role="author">
          <div className="bg-white rounded-2xl shadow border p-8">
            <div className="flex items-center gap-3 text-gray-600">Loading...</div>
          </div>
        </UserDashboardLayout>
      }
    >
      <AuthorRevisionsInner />
    </Suspense>
  );
}

function AuthorRevisionsInner() {
  const searchParams = useSearchParams();
  const preselectedSubmissionId = searchParams.get('submissionId');

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>('');
  const [revisionNote, setRevisionNote] = useState('');
  const [revisionFile, setRevisionFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [extensionSubmitting, setExtensionSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [requestedDueDate, setRequestedDueDate] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('access_token');
    setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(apiUrl('author-submissions/'), {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => 'Unknown server error');
          throw new Error(`Failed to load manuscripts (${res.status}): ${errText}`);
        }
        const data = await res.json();
        setSubmissions(Array.isArray(data) ? data : data.results || []);
      } catch (err: any) {
        setError(err.message || 'Could not load manuscripts for revision submission.');
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [token]);

  const revisionEligibleSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const decision = (sub.final_decision || '').toLowerCase();
      return decision === 'minor_revision' || decision === 'major_revision';
    });
  }, [submissions]);

  useEffect(() => {
    if (preselectedSubmissionId) {
      setSelectedSubmissionId(preselectedSubmissionId);
    }
  }, [preselectedSubmissionId]);

  const refreshSubmissions = async () => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl('author-submissions/'), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to refresh manuscripts');
      const data = await res.json();
      setSubmissions(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Refresh submissions error:', err);
    }
  };

  const handleRequestExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedSubmissionId) {
      setError('Please select a manuscript first.');
      return;
    }
    if (!requestedDueDate) {
      setError('Please choose the new revision due date.');
      return;
    }

    setExtensionSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(apiUrl(`submissions/${selectedSubmissionId}/revision-extension-request/`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          revision_due_date: requestedDueDate,
          revision_extension_reason: extensionReason.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.message || 'Failed to request revision extension.');

      setSuccess('Revision extension request submitted successfully.');
      setExtensionReason('');
      setRequestedDueDate('');
      await refreshSubmissions();
    } catch (err: any) {
      setError(err.message || 'Failed to request revision extension.');
    } finally {
      setExtensionSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Please login first.');
      return;
    }
    if (!selectedSubmissionId) {
      setError('Please select a manuscript.');
      return;
    }
    if (!revisionFile) {
      setError('Please upload a revised manuscript file.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('submission', selectedSubmissionId);
      formData.append('revision_note', revisionNote.trim());
      formData.append('file', revisionFile);

      const res = await fetch(apiUrl('submission-versions/'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errText = errJson?.detail || errJson?.message || 'Failed to submit revision.';
        throw new Error(errText);
      }

      setSuccess('Revised manuscript submitted successfully.');
      setRevisionFile(null);
      setRevisionNote('');
      await refreshSubmissions();
    } catch (err: any) {
      setError(
        err.message ||
          'Revision endpoint is not available yet. Backend versioning API setup is in progress.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UserDashboardLayout role="author">
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Revision Submissions</h2>
          <p className="text-gray-600 mt-2">
            Submit revised versions only for manuscripts marked as minor or major revision.
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow p-8">Loading manuscripts...</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={18} />
              <span className="font-semibold">Error</span>
            </div>
            <p>{error}</p>
          </div>
        ) : revisionEligibleSubmissions.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-10 text-center">
            <GitPullRequest size={46} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No revision needed right now</h3>
            <p className="text-gray-600">You currently have no manuscripts requiring revision submission.</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Eligible Manuscripts</h3>
              <div className="space-y-3">
                {revisionEligibleSubmissions.map((sub) => (
                  <div key={sub.id} className="p-4 rounded-lg border bg-gray-50">
                    <p className="font-medium text-gray-900">{sub.title || 'Untitled manuscript'}</p>
                    <p className="text-sm text-gray-700 mt-1">
                      Decision: {(sub.final_decision || '').replace('_', ' ').toUpperCase()}
                    </p>
                    {sub.revision_due_date && (
                      <p className="text-sm text-indigo-700 mt-1 font-semibold">
                        Revision due date: {new Date(sub.revision_due_date).toLocaleString('en-GB')}
                      </p>
                    )}
                    {sub.revision_extension_status && sub.revision_extension_status !== 'none' && (
                      <p className="text-sm text-amber-700 mt-1">
                        Extension status: {sub.revision_extension_status}
                      </p>
                    )}
                    {sub.decision_remarks && (
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{sub.decision_remarks}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleRequestExtension} className="bg-white rounded-xl shadow border p-6 space-y-5">
              <h3 className="font-semibold text-gray-900">Request Revision Deadline Extension</h3>
              <p className="text-sm text-gray-600">If you need extra time for a revised submission, request a new deadline here. The editor can approve it after review.</p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Manuscript *</label>
                <select
                  value={selectedSubmissionId}
                  onChange={(e) => setSelectedSubmissionId(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg"
                  required
                >
                  <option value="">Choose manuscript...</option>
                  {revisionEligibleSubmissions.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Requested New Revision Due Date *</label>
                <input
                  type="datetime-local"
                  value={requestedDueDate}
                  onChange={(e) => setRequestedDueDate(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Extension</label>
                <textarea
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border rounded-lg"
                  placeholder="Explain why you need more time to submit the revised manuscript..."
                />
              </div>

              <button
                type="submit"
                disabled={extensionSubmitting}
                className="px-6 py-3 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition disabled:opacity-60"
              >
                {extensionSubmitting ? 'Submitting request...' : 'Request Extension'}
              </button>
            </form>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow border p-6 space-y-5">
              <h3 className="font-semibold text-gray-900">Submit Revised Manuscript</h3>

              {success && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded">{success}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Manuscript *</label>
                <select
                  value={selectedSubmissionId}
                  onChange={(e) => setSelectedSubmissionId(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg"
                  required
                >
                  <option value="">Choose manuscript...</option>
                  {revisionEligibleSubmissions.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Revision Note</label>
                <textarea
                  value={revisionNote}
                  onChange={(e) => setRevisionNote(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border rounded-lg"
                  placeholder="Summarize what was revised in response to reviewer/editor comments..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Revised File *</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.zip,.tex"
                  onChange={(e) => setRevisionFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-3 border rounded-lg"
                  required
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-60"
                >
                  {submitting ? 'Submitting...' : 'Submit Revised Version'}
                </button>
                <Link
                  href="/author-dashboard/my-submissions"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                >
                  <FileText size={17} />
                  View My Submissions
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </UserDashboardLayout>
  );
}
