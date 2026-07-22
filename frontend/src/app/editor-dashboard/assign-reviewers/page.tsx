'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl } from '@/utils/api';
import { Users, AlertCircle, RefreshCw } from 'lucide-react';

// Define types based on your API response structure
interface Submission {
  id: number;
  title: string;
  status: string;
  submission_code?: string | null;
}

interface Reviewer {
  id: number;
  full_name: string;
  email: string;
  designation?: string;
}

export default function AssignReviewersContent() {
  const router = useRouter();

  // Token state + client mount guard
  const [token, setToken] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<number | null>(null);
  const [selectedReviewers, setSelectedReviewers] = useState<number[]>([]);
  const [assigning, setAssigning] = useState(false);

  // Safely read token on client only
  useEffect(() => {
    setIsMounted(true);

    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('access_token');
      setToken(t);

      // Redirect if no token (extra safety)
      if (!t) {
        setError('Please log in to manage reviewer assignments.');
        setTimeout(() => router.replace('/login'), 1500);
      }
    }
  }, [router]);

  // Fetch data only after client is ready and token exists
  useEffect(() => {
    if (!isMounted || !token) return;
    fetchData();
  }, [isMounted, token]);

  const fetchData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // 1. Fetch submissions assigned to this editor
      const subRes = await fetch(apiUrl('editor-submissions/'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!subRes.ok) {
        if (subRes.status === 401 || subRes.status === 403) {
          setError('Session expired or unauthorized. Redirecting to login...');
          localStorage.clear();
          setTimeout(() => router.replace('/login'), 2000);
          return;
        }
        const errData = await subRes.json().catch(() => ({}));
        throw new Error(errData.detail || `Failed to load submissions (${subRes.status})`);
      }

      const subsData = await subRes.json();
      setSubmissions(Array.isArray(subsData) ? subsData : subsData.results || []);

      // 2. Fetch available reviewers
      const revRes = await fetch(apiUrl('users/reviewers/'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!revRes.ok) {
        const errData = await revRes.json().catch(() => ({}));
        throw new Error(errData.detail || `Failed to load reviewers (${revRes.status})`);
      }

      const revData = await revRes.json();
      setReviewers(Array.isArray(revData) ? revData : revData.results || []);
    } catch (err: any) {
      console.error('Data fetch error:', err);
      setError(err.message || 'Failed to load submissions and reviewers.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!token) {
      setError('Authentication token missing. Please log in again.');
      return;
    }

    if (!selectedSubmission || selectedReviewers.length === 0) {
      setError('Please select a submission and at least one reviewer.');
      return;
    }

    setAssigning(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(apiUrl(`submissions/${selectedSubmission}/assign-reviewers/`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reviewer_ids: selectedReviewers }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || 'Failed to assign reviewers');
      }

      setSuccess('Reviewers assigned successfully!');
      setSelectedSubmission(null);
      setSelectedReviewers([]);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to assign reviewers. Please try again.');
      console.error('Assign error:', err);
    } finally {
      setAssigning(false);
    }
  };

  const toggleReviewer = (revId: number) => {
    setSelectedReviewers((prev) =>
      prev.includes(revId) ? prev.filter((id) => id !== revId) : [...prev, revId]
    );
  };

  // Auto-dismiss success message
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Loading state during mount or data fetch
  if (!isMounted || loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
        <p className="ml-4 text-gray-600 font-medium">Loading submissions and reviewers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-8 rounded-2xl text-center max-w-3xl mx-auto mt-10">
        <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
        <h3 className="text-xl font-semibold mb-3">Error</h3>
        <p className="text-lg mb-6">{error}</p>
        <button
          onClick={() => {
            setError('');
            fetchData();
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
        <h2 className="text-3xl font-bold mb-8 text-gray-900">Assign Reviewers to Submissions</h2>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-2xl mb-8 text-center">
            <p className="font-medium">{success}</p>
          </div>
        )}

        {submissions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-10 text-center">
            <p className="text-gray-600 text-lg">
              No submissions currently assigned to you for reviewer assignment.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {submissions.map((sub) => {
              const isSelected = selectedSubmission === sub.id;

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
                        Status: <span className="font-medium">{sub.status || 'Unknown'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={() => setSelectedSubmission(isSelected ? null : sub.id)}
                      className={`px-6 py-3 rounded-xl transition font-medium ${
                        isSelected
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isSelected ? 'Cancel Assignment' : 'Assign Reviewers'}
                    </button>

                    {isSelected && (
                      <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-200">
                        <h4 className="font-semibold text-lg mb-6 text-gray-900">
                          Select Reviewers for "{sub.title || 'Untitled Submission'}"
                        </h4>

                        {reviewers.length === 0 ? (
                          <p className="text-gray-600 text-center py-4">
                            No reviewers available at the moment.
                          </p>
                        ) : (
                          <div className="grid md:grid-cols-2 gap-4 mb-6 max-h-80 overflow-y-auto pr-2">
                            {reviewers.map((rev) => (
                              <label
                                key={rev.id}
                                className="flex items-center gap-3 p-4 bg-white rounded-lg border hover:border-blue-500 transition cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedReviewers.includes(rev.id)}
                                  onChange={() => toggleReviewer(rev.id)}
                                  className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <div>
                                  <p className="font-medium text-gray-900">{rev.full_name}</p>
                                  <p className="text-sm text-gray-600">{rev.email}</p>
                                  {rev.designation && (
                                    <p className="text-xs text-gray-500">{rev.designation}</p>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4 mt-6">
                          <button
                            onClick={handleAssign}
                            disabled={assigning || selectedReviewers.length === 0}
                            className={`flex items-center justify-center gap-2 px-8 py-3 rounded-xl transition font-medium min-w-[220px] ${
                              assigning || selectedReviewers.length === 0
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                            }`}
                          >
                            <Users size={18} />
                            {assigning
                              ? 'Assigning...'
                              : `Assign ${selectedReviewers.length} Reviewer${
                                  selectedReviewers.length !== 1 ? 's' : ''
                                }`}
                          </button>

                          <button
                            onClick={() => setSelectedSubmission(null)}
                            disabled={assigning}
                            className={`px-8 py-3 rounded-xl transition font-medium ${
                              assigning
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}