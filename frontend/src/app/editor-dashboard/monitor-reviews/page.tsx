'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl } from '@/utils/api';
import { Eye, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface Submission {
  id: number;
  title: string;
  created_at: string;
}

export default function MonitorReviewsContent() {
  const router = useRouter();

  // Token + mount state (prevents server-side crash during build)
  const [token, setToken] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Safely read token only on client
  useEffect(() => {
    setIsMounted(true);

    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('access_token');
      setToken(t);

      // Early redirect if no token
      if (!t) {
        setError('Please log in to monitor review progress.');
        setTimeout(() => router.replace('/login'), 1500);
      }
    }
  }, [router]);

  // Fetch data only after client is ready and token exists
  useEffect(() => {
    if (!isMounted || !token) return;
    fetchSubmissionsWithReviews();
  }, [isMounted, token]);

  const fetchSubmissionsWithReviews = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError('');

      const res = await fetch(apiUrl('editor-submissions/?status=under_review'), {
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
      console.error('Monitor reviews fetch error:', err);
      setError(err.message || 'Failed to load submissions under review.');
    } finally {
      setLoading(false);
    }
  };

  // Loading state during mount or fetch
  if (!isMounted || loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
        <p className="ml-4 text-gray-600 font-medium">Loading review progress...</p>
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
            fetchSubmissionsWithReviews();
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
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-gray-900">Monitor Peer Reviews</h2>

        {submissions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-10 text-center">
            <p className="text-gray-600 text-lg">
              No submissions are currently under peer review.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900">
                      {sub.title || 'Untitled Submission'}
                    </h3>
                    <p className="text-gray-600 mt-1">
                      Status: <span className="font-medium text-blue-600">Under Review</span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Submitted: {new Date(sub.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Reviewer Progress Section */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <Clock className="text-yellow-600" size={20} />
                      Review Progress
                    </h4>
                    <div className="space-y-2 text-gray-700">
                      <p>Pending: <strong>2 reviewers</strong></p>
                      <p>Completed: <strong>1 reviewer</strong></p>
                      <p>Overdue: <strong>0</strong></p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <AlertCircle className="text-orange-600" size={20} />
                      Deadlines & Status
                    </h4>
                    <div className="space-y-2 text-gray-700">
                      <p>Next due: <strong>3 days</strong></p>
                      <p>Latest update: <strong>2 days ago</strong></p>
                      <p>Overall progress: <strong>33%</strong></p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => router.push(`/editor-dashboard/review-details?submission=${sub.id}`)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium shadow-sm"
                  >
                    <Eye size={18} />
                    View Detailed Reports
                  </button>

                  <button
                    className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition font-medium"
                  >
                    <Clock size={18} />
                    Send Reminder
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}