'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl } from '@/utils/api';
import { Gavel, Save, AlertCircle, X, RefreshCw } from 'lucide-react';

// Optional: Define expected shape of API error responses
interface ApiErrorResponse {
  detail?: string;
  message?: string;
  [key: string]: unknown;
}

interface SubmissionItem {
  id: number;
  title?: string;
  current_status?: string;
  submission_code?: string;
  [key: string]: unknown;
}

export default function FinalDecisionContent() {
  const router = useRouter();

  // Token + mount state (prevents server crash during build)
  const [token, setToken] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selected, setSelected] = useState<SubmissionItem | null>(null);
  const [decision, setDecision] = useState('pending');
  const [remarks, setRemarks] = useState('');
  const [revisionDueDate, setRevisionDueDate] = useState('');
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [extensionActioningId, setExtensionActioningId] = useState<number | null>(null);

  const fetchSubmissionsForDecision = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const res = await fetch(apiUrl('editor-submissions/?status=reviewed'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError('Session expired or unauthorized. Redirecting to login...');
          localStorage.clear();
          setTimeout(() => router.replace('/login'), 2000);
          return;
        }
        const errText = await res.text().catch(() => 'Unknown error');
        throw new Error(`Failed to load submissions (${res.status}): ${errText}`);
      }

      const data = await res.json();
      setSubmissions(Array.isArray(data) ? data : data.results || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load submissions ready for decision.';
      console.error('Final decision fetch error:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [router, token]);

  // Safely read token only on client
  useEffect(() => {
    setIsMounted(true);

    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('access_token');
      setToken(t);

      if (!t) {
        setError('Please log in to make final decisions.');
        setTimeout(() => router.replace('/login'), 1500);
      }
    }
  }, [router]);

  // Fetch data only after client is ready and token exists
  useEffect(() => {
    if (!isMounted || !token) return;
    fetchSubmissionsForDecision();
  }, [fetchSubmissionsForDecision, isMounted, token]);

  const pendingExtensionRequests = useMemo(
    () => submissions.filter((sub) => String(sub.revision_extension_status || '').toLowerCase() === 'requested'),
    [submissions]
  );

  const handleExtensionDecision = async (submissionId: number, decision: 'approved' | 'rejected') => {
    if (!token) {
      setError('Authentication token missing. Please log in again.');
      return;
    }

    setExtensionActioningId(submissionId);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(apiUrl(`submissions/${submissionId}/revision-extension/`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: decision,
          decision_note: decision === 'rejected' ? 'The requested revision extension was rejected by the editor.' : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data?.detail || data?.message || 'Unable to update extension request.'));

      setSuccess(`Extension request ${decision === 'approved' ? 'approved' : 'rejected'} successfully.`);
      await fetchSubmissionsForDecision();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to update extension request.';
      setError(message);
    } finally {
      setExtensionActioningId(null);
    }
  };

  const handleFinalDecision = async (submissionId: number) => {
    if (!token) {
      setError('Authentication token missing. Please log in again.');
      return;
    }

    if (!remarks.trim()) {
      setError('Please provide decision remarks / justification.');
      return;
    }

    if ((decision === 'minor_revision' || decision === 'major_revision') && !revisionDueDate) {
      setError('Please set a revision due date for minor or major revision decisions.');
      return;
    }

    setError('');
    setSuccess('');
    setSubmittingId(submissionId);

    try {
      const res = await fetch(apiUrl(`submissions/${submissionId}/final-decision/`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          final_decision: decision,
          decision_remarks: remarks.trim(),
          revision_due_date: (decision === 'minor_revision' || decision === 'major_revision') ? revisionDueDate : undefined,
        }),
      });

      if (!res.ok) {
        let errorMessage = `Failed to submit decision (${res.status})`;

        try {
          const errData = (await res.json()) as ApiErrorResponse;

          if (errData.detail) {
            errorMessage = errData.detail;
          } else if (errData.message) {
            errorMessage = errData.message;
          } else if (errData && typeof errData === 'object') {
            const values = Object.values(errData);
            if (values.length > 0) {
              const firstValue = values[0];
              if (Array.isArray(firstValue) && firstValue.length > 0) {
                errorMessage = String(firstValue[0]);
              } else if (typeof firstValue === 'string') {
                errorMessage = firstValue;
              }
            }
          }
        } catch {}

        throw new Error(errorMessage);
      }

      setSuccess('Final decision submitted successfully!');
      setTimeout(() => setSuccess(''), 4000);

      fetchSubmissionsForDecision();
      setSelected(null);
      setRemarks('');
      setRevisionDueDate('');
      setDecision('pending');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit final decision. Please try again.';
      setError(message);
      console.error('Final decision error:', err);
    } finally {
      setSubmittingId(null);
    }
  };

  // Show loading until client is mounted and data is fetched
  if (!isMounted || loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
        <p className="ml-4 text-gray-600 font-medium">Loading submissions for final decision...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-8 rounded-2xl text-center max-w-2xl mx-auto mt-10">
        <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
        <h3 className="text-xl font-semibold mb-3">Error</h3>
        <p className="text-lg mb-6">{error}</p>
        <button
          onClick={() => {
            setError('');
            fetchSubmissionsForDecision();
          }}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
        >
          <RefreshCw size={18} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-gray-900">Make Final Decision</h2>

        {pendingExtensionRequests.length > 0 && (
          <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-amber-900 mb-2">Author Extension Requests</h3>
            <p className="text-sm text-amber-800 mb-4">Review extension requests submitted by authors for revision deadlines. Approving them updates the manuscript due date and notifies the author by email.</p>
            <div className="grid gap-4">
              {pendingExtensionRequests.map((sub) => (
                <article key={sub.id} className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{sub.title || 'Untitled manuscript'}</h4>
                      <p className="text-sm text-indigo-700 font-semibold">Manuscript ID: {String(sub.submission_code || `#${sub.id}`)}</p>
                      <p className="text-sm text-gray-700 mt-1">Requested due date: {sub.revision_due_date ? new Date(String(sub.revision_due_date)).toLocaleString('en-GB') : 'Not provided'}</p>
                      <p className="text-sm text-gray-600 mt-1">Reason: {String(sub.revision_extension_reason || 'No reason provided')}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExtensionDecision(sub.id, 'approved')}
                        disabled={extensionActioningId === sub.id}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                      >
                        {extensionActioningId === sub.id ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleExtensionDecision(sub.id, 'rejected')}
                        disabled={extensionActioningId === sub.id}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        {extensionActioningId === sub.id ? 'Processing...' : 'Reject'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {submissions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-10 text-center">
            <p className="text-gray-600 text-lg">
              No submissions ready for final decision (all reviews completed).
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {submissions.map((sub) => {
              const isSelected = selected?.id === sub.id;
              const isSubmitting = submittingId === sub.id;

              return (
                <div
                  key={sub.id}
                  className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-semibold text-gray-900">
                        {sub.title || 'Untitled Submission'}
                      </h3>
                      {sub.submission_code && (
                        <p className="text-sm font-semibold text-indigo-700 mt-1">Manuscript ID: {sub.submission_code}</p>
                      )}
                      <p className="text-gray-600 mt-1">
                        Status: {sub.current_status === 'revision_requested' ? 'Revision Requested' : 'Ready for Final Decision'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-4">
                    <button
                      onClick={() => setSelected(isSelected ? null : sub)}
                      disabled={isSubmitting}
                      className={`flex items-center gap-2 px-6 py-3 rounded-xl transition font-medium ${
                        isSelected
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      } ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <Gavel size={18} />
                      {isSelected ? 'Cancel Decision' : 'Make Final Decision'}
                    </button>
                  </div>

                  {isSelected && (
                    <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-200">
                      <h4 className="font-semibold text-lg mb-6 text-gray-900">Final Editorial Decision</h4>

                      {error && (
                        <p className="text-red-600 mb-4 bg-red-50 p-3 rounded-lg border border-red-200">
                          {error}
                        </p>
                      )}

                      {success && (
                        <p className="text-green-600 mb-4 bg-green-50 p-3 rounded-lg border border-green-200">
                          {success}
                        </p>
                      )}

                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700">Final Decision <span className="text-red-500">*</span></label>
                          <select
                            value={decision}
                            onChange={(e) => setDecision(e.target.value)}
                            disabled={isSubmitting}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:opacity-60"
                          >
                            <option value="pending">Pending (No Decision Yet)</option>
                            <option value="accept">Accept for Publication</option>
                            <option value="minor_revision">Minor Revision Required</option>
                            <option value="major_revision">Major Revision Required</option>
                            <option value="reject">Reject</option>
                          </select>
                        </div>

                        {(decision === 'minor_revision' || decision === 'major_revision') && (
                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700">Revision Due Date <span className="text-red-500">*</span></label>
                            <input
                              type="datetime-local"
                              value={revisionDueDate}
                              onChange={(e) => setRevisionDueDate(e.target.value)}
                              disabled={isSubmitting}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:opacity-60"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700">
                            Decision Remarks / Justification <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            disabled={isSubmitting}
                            rows={5}
                            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:opacity-60"
                            placeholder="Explain your decision, next steps for author, any conditions for acceptance..."
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 mt-8">
                          <button
                            onClick={() => handleFinalDecision(sub.id)}
                            disabled={isSubmitting || !remarks.trim()}
                            className={`px-8 py-3 text-white rounded-xl transition font-medium shadow-sm flex items-center justify-center gap-2 min-w-[220px] ${
                              isSubmitting || !remarks.trim()
                                ? 'bg-green-400 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700'
                            }`}
                          >
                            <Save size={18} />
                            {isSubmitting ? 'Submitting...' : 'Submit Final Decision'}
                          </button>

                          <button
                            onClick={() => setSelected(null)}
                            disabled={isSubmitting}
                            className={`px-8 py-3 rounded-xl transition font-medium ${
                              isSubmitting
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            <X size={18} className="mr-2" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}