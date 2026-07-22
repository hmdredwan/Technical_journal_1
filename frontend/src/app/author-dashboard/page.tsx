// src/app/author-dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import UserDashboardLayout from '@/components/user/UserDashboardLayout';
import { Clock, AlertCircle, FileText, RefreshCw, GitPullRequest } from 'lucide-react';
import { apiUrl } from '@/utils/api';

export default function AuthorDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [submissionsError, setSubmissionsError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const t = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');

    if (!t || role !== 'author') {
      router.push('/login');
      return;
    }
    setToken(t);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    const fetchSubmissions = async () => {
      try {
        setLoadingSubmissions(true);
        setSubmissionsError('');

        const res = await fetch(apiUrl('author-submissions/'), {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => 'Unknown error');
          throw new Error(`Failed to load manuscripts (${res.status}): ${errText}`);
        }

        const data = await res.json();
        setSubmissions(Array.isArray(data) ? data : data.results || []);
      } catch (err: any) {
        setSubmissionsError(err.message || 'Could not load your manuscript summary.');
      } finally {
        setLoadingSubmissions(false);
      }
    };

    fetchSubmissions();
  }, [token]);

  const totalSubmissions = submissions.length;
  const underReviewCount = submissions.filter(
    (s) => (s.current_status || s.status || '').toLowerCase().includes('review')
  ).length;
  const acceptedCount = submissions.filter(
    (s) => (s.current_status || s.status || '').toLowerCase().includes('accepted')
  ).length;
  const rejectedCount = submissions.filter(
    (s) => (s.current_status || s.status || '').toLowerCase().includes('rejected')
  ).length;

  const revisionRequired = submissions.filter((s) => {
    const decision = (s.final_decision || '').toLowerCase();
    return decision === 'minor_revision' || decision === 'major_revision';
  });

  // ──────────────────────────────────────────────
  // Deadline Countdown Component
  // ──────────────────────────────────────────────
  function DeadlineCountdown() {
    const [deadlineInfo, setDeadlineInfo] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState('');

    useEffect(() => {
      const fetchDeadline = async () => {
        try {
          const res = await fetch(apiUrl('submission-deadline/'));
          if (!res.ok) throw new Error('Failed to fetch deadline');

          const data = await res.json();
          setDeadlineInfo(data);

          if (data.has_deadline && !data.is_expired) {
            const deadlineDate = new Date(data.deadline);
            const updateTimer = () => {
              const now = new Date();
              const diff = deadlineDate.getTime() - now.getTime();

              if (diff <= 0) {
                setTimeLeft(null);
                return;
              }

              setTimeLeft({
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((diff % (1000 * 60)) / 1000),
              });
            };

            updateTimer();
            const interval = setInterval(updateTimer, 1000);
            return () => clearInterval(interval);
          }
        } catch (err: any) {
          console.error('Deadline fetch failed:', err);
          setFetchError('Could not load submission deadline.');
        } finally {
          setLoading(false);
        }
      };

      fetchDeadline();
    }, []);

    if (loading) {
      return (
        <div className="bg-white rounded-xl shadow p-6 text-center animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mx-auto mb-4"></div>
          <div className="flex justify-center gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 w-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      );
    }

    if (fetchError || !deadlineInfo?.has_deadline) {
      return null; // silently hide if no deadline set
    }

    if (deadlineInfo.is_expired) {
      return (
        <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-xl mb-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-3 text-red-600" size={40} />
          <h3 className="text-xl font-bold">Submission Deadline Has Passed</h3>
          <p className="mt-2 text-lg">
            Closed on {new Date(deadlineInfo.deadline).toLocaleString('en-US', {
              dateStyle: 'long',
              timeStyle: 'short',
            })}
          </p>
          <p className="mt-3 text-sm opacity-90">
            Contact the editorial office for late submissions or extensions.
          </p>
        </div>
      );
    }

    return (
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-6 md:p-8 rounded-2xl shadow-2xl mb-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-2xl md:text-3xl font-bold flex items-center justify-center md:justify-start gap-3 mb-2">
              <Clock size={32} className="opacity-90" />
              Submission Deadline
            </h3>
            <p className="text-indigo-100 opacity-90 text-lg">
              Closes on{' '}
              <span className="font-semibold">
                {new Date(deadlineInfo.deadline).toLocaleString('en-US', {
                  dateStyle: 'long',
                  timeStyle: 'short',
                })}
              </span>
            </p>
          </div>

          {timeLeft && (
            <div className="grid grid-cols-4 gap-3 md:gap-5 text-center">
              {Object.entries(timeLeft).map(([unit, value]: [string, any]) => (
                <div
                  key={unit}
                  className="bg-white/15 backdrop-blur-md px-5 py-4 rounded-xl border border-white/20 min-w-[80px]"
                >
                  <div className="text-3xl md:text-4xl font-extrabold">
                    {String(value).padStart(2, '0')}
                  </div>
                  <div className="text-xs md:text-sm uppercase opacity-90 mt-1 tracking-wide">
                    {unit}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {deadlineInfo.note && (
          <div className="mt-6 pt-4 border-t border-white/20 text-center md:text-left">
            <p className="text-sm opacity-90 italic">
              <strong>Note:</strong> {deadlineInfo.note}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <UserDashboardLayout role="author">
      <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
        {/* Countdown – now correctly placed at the top */}
        <DeadlineCountdown />

        {submissionsError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-8">
            {submissionsError}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700">Submitted</h3>
            <p className="text-4xl font-bold text-blue-600 mt-2">
              {loadingSubmissions ? '...' : totalSubmissions}
            </p>
            <p className="text-sm text-gray-500 mt-1">Total manuscripts</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700">Under Review</h3>
            <p className="text-4xl font-bold text-yellow-600 mt-2">
              {loadingSubmissions ? '...' : underReviewCount}
            </p>
            <p className="text-sm text-gray-500 mt-1">In peer review</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700">Accepted</h3>
            <p className="text-4xl font-bold text-green-600 mt-2">
              {loadingSubmissions ? '...' : acceptedCount}
            </p>
            <p className="text-sm text-gray-500 mt-1">Published/accepted</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700">Rejected</h3>
            <p className="text-4xl font-bold text-red-600 mt-2">
              {loadingSubmissions ? '...' : rejectedCount}
            </p>
            <p className="text-sm text-gray-500 mt-1">Total rejections</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-6 mb-10">
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Manuscript Formatting Templates</h3>
          <p className="text-sm text-gray-600 mb-4">
            Download the latest author manuscript format template before submitting your manuscript.
          </p>
          <Link
            href="/author-dashboard/manuscript-format"
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition"
          >
            View Template
          </Link>
        </div>

        {/* Revision Required Section */}
        <div className="bg-white rounded-xl shadow-md p-8 mb-10 border border-amber-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <GitPullRequest size={24} className="text-amber-600" />
                Revision Required Manuscripts
              </h2>
              <p className="text-gray-600 mt-1">
                Manuscripts with editor decision as minor or major revision.
              </p>
            </div>
            <Link
              href="/author-dashboard/revisions"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition font-medium"
            >
              <FileText size={18} />
              Open Revision Submission
            </Link>
          </div>

          {loadingSubmissions ? (
            <div className="flex items-center gap-3 text-gray-600">
              <RefreshCw size={18} className="animate-spin" />
              Loading manuscripts needing revision...
            </div>
          ) : revisionRequired.length === 0 ? (
            <p className="text-gray-600">No manuscripts currently marked for revision.</p>
          ) : (
            <div className="space-y-4">
              {revisionRequired.slice(0, 5).map((sub) => (
                <div key={sub.id} className="p-4 rounded-lg border bg-amber-50/40">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{sub.title || 'Untitled manuscript'}</h3>
                      <p className="text-sm text-gray-700 mt-1">
                        Decision: {(sub.final_decision || 'pending').replace('_', ' ').toUpperCase()}
                      </p>
                      {sub.decision_remarks && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{sub.decision_remarks}</p>
                      )}
                    </div>
                    <Link
                      href={`/author-dashboard/revisions?submissionId=${sub.id}`}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition text-sm font-medium"
                    >
                      Submit Revision
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-md p-8 mb-10">
          <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link
              href="/author-dashboard/submit"
              className="bg-blue-600 text-white py-6 px-8 rounded-xl hover:bg-blue-700 transition text-center font-medium shadow-md flex items-center justify-center gap-2"
            >
              <FileText size={20} />
              Submit New Manuscript
            </Link>
            <Link
              href="/author-dashboard/my-submissions"
              className="bg-gray-100 text-gray-800 py-6 px-8 rounded-xl hover:bg-gray-200 transition text-center font-medium shadow-md flex items-center justify-center gap-2"
            >
              <Clock size={20} />
              Track My Submissions
            </Link>
            <Link
              href="/author-dashboard/revisions"
              className="bg-gray-100 text-gray-800 py-6 px-8 rounded-xl hover:bg-gray-200 transition text-center font-medium shadow-md flex items-center justify-center gap-2"
            >
              <GitPullRequest size={20} />
              Submit Revision
            </Link>
          </div>
        </div>

        {/* Recent Submissions Placeholder */}
        <div className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
          <p className="text-gray-600">
            You have no recent submissions yet. Start by submitting your first manuscript!
          </p>
        </div>
      </div>
    </UserDashboardLayout>
  );
}