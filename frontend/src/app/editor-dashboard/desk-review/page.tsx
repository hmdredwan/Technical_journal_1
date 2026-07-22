'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl } from '@/utils/api';
import { AlertCircle, CheckCircle, FileSearch, Save, X, RefreshCw } from 'lucide-react';

// Optional: Define expected shape of error responses from your API
interface ApiErrorResponse {
  detail?: string;
  message?: string;
  [key: string]: any;
}

export default function DeskReviewContent() {
  const router = useRouter();

  // Token + mount state (prevents server crash)
  const [token, setToken] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [deskStatus, setDeskStatus] = useState('pending');
  const [remarks, setRemarks] = useState('');
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  // Safely read token only on client
  useEffect(() => {
    setIsMounted(true);

    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('access_token');
      setToken(t);

      // Early redirect if no token
      if (!t) {
        setError('Please log in to perform desk reviews.');
        setTimeout(() => router.replace('/login'), 1500);
      }
    }
  }, [router]);

  // Fetch only after client is ready and token exists
  useEffect(() => {
    if (!isMounted || !token) return;
    fetchPendingSubmissions();
  }, [isMounted, token]);

  const fetchPendingSubmissions = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const res = await fetch(apiUrl('editor-submissions/?status=desk_review'), {
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
    } catch (err: any) {
      console.error('Submissions fetch error:', err);
      setError(err.message || 'Failed to load submissions for desk review.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeskReview = async (submissionId: number) => {
    if (!token) {
      setError('Authentication token missing. Please log in again.');
      return;
    }

    setError('');
    setSuccess('');
    setSubmittingId(submissionId);

    try {
      const res = await fetch(apiUrl(`submissions/${submissionId}/desk-review/`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          desk_review_status: deskStatus,
          desk_review_remarks: remarks.trim(),
        }),
      });

      if (!res.ok) {
        let errorMessage = `Failed to submit desk review (${res.status})`;

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

      setSuccess('Desk review submitted successfully!');
      setTimeout(() => setSuccess(''), 4000);

      fetchPendingSubmissions();
      setSelected(null);
      setRemarks('');
      setDeskStatus('pending');
    } catch (err: any) {
      setError(err.message || 'Failed to submit desk review. Please try again.');
      console.error('Desk review error:', err);
    } finally {
      setSubmittingId(null);
    }
  };

  // Show loading until client is mounted and data is fetched
  if (!isMounted || loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
        <p className="ml-4 text-gray-600 font-medium">Loading submissions for desk review...</p>
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
            fetchPendingSubmissions();
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
        <h2 className="text-3xl font-bold mb-8 text-gray-900">Initial Screening (Desk Review)</h2>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-2xl mb-8 text-center">
            <p className="font-medium">{success}</p>
          </div>
        )}

        {submissions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-10 text-center">
            <p className="text-gray-600 text-lg">
              No submissions for desk review at the moment.
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
                        Submitted: {new Date(sub.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-4 py-2 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      Pending Screening
                    </span>
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
                      <FileSearch size={18} />
                      {isSelected ? 'Close Form' : 'Perform Desk Review'}
                    </button>
                  </div>

                  {isSelected && (
                    <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-200">
                      <h4 className="font-semibold text-lg mb-6 text-gray-900">Desk Review Decision</h4>

                      {error && (
                        <p className="text-red-600 mb-4 bg-red-50 p-3 rounded-lg border border-red-200">
                          {error}
                        </p>
                      )}

                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700">Decision <span className="text-red-500">*</span></label>
                          <select
                            value={deskStatus}
                            onChange={(e) => setDeskStatus(e.target.value)}
                            disabled={isSubmitting}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:opacity-60"
                          >
                            <option value="pending">Pending (No Decision Yet)</option>
                            <option value="passed">Pass to Peer Review</option>
                            <option value="desk_rejected">Desk Reject</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700">
                            Remarks / Reason
                            <span className="text-gray-400 font-normal"> (optional)</span>
                          </label>
                          <textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            disabled={isSubmitting}
                            rows={5}
                            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:opacity-60"
                            placeholder="e.g., Out of scope, formatting issues, low novelty, plagiarism concerns..."
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 mt-8">
                          <button
                            onClick={() => handleDeskReview(sub.id)}
                            disabled={isSubmitting}
                            className={`px-8 py-3 text-white rounded-xl transition font-medium shadow-sm flex items-center justify-center gap-2 min-w-[220px] ${
                              isSubmitting
                                ? 'bg-blue-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            <Save size={18} />
                            {isSubmitting ? 'Submitting...' : 'Submit Desk Review'}
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