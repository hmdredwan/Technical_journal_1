// src/app/editor-dashboard/overview/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiUrl } from '@/utils/api';
import {
  FileText,
  Users,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Gavel,
  Calendar,
  Archive,
} from 'lucide-react';

type Submission = {
  id: number;
  current_status?: string;
  status?: string;
  final_decision?: string;
  due_date?: string;
};

type ReviewerApplication = {
  id: number;
  status?: string;
};

export default function OverviewContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [reviewerApplications, setReviewerApplications] = useState<ReviewerApplication[]>([]);
  const [reviewerCount, setReviewerCount] = useState(0);
  const [submissionPeriods, setSubmissionPeriods] = useState<any[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const token = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }, []);

  const computeCounts = useMemo(() => {
    const list = Array.isArray(submissions) ? submissions : [];
    const getStatus = (s: any) => (s || '').toString().toLowerCase();

    const totalSubmissions = list.length;
    const deskReviewPending = list.filter((s) => getStatus(s.current_status) === 'desk_review').length;
    const inPeerReview = list.filter((s) => getStatus(s.current_status) === 'under_review').length;
    const revisionRequested = list.filter((s) => getStatus(s.current_status) === 'revision_requested').length;
    const readyForPublication = list.filter((s) => getStatus(s.current_status) === 'ready_for_publication').length;
    const completed = list.filter((s) => getStatus(s.current_status) === 'completed').length;
    const accepted = list.filter((s) => getStatus(s.current_status) === 'accepted').length;
    const rejected = list.filter((s) => getStatus(s.current_status) === 'rejected').length;

    // "Decisions pending" = final_decision is still pending/empty (best-effort).
    const decisionsPending = list.filter((s) => {
      const status = getStatus(s.current_status);
      return status === 'under_review' || status === 'revision_requested';
    }).length;

    const apps = Array.isArray(reviewerApplications) ? reviewerApplications : [];
    const totalApps = apps.length;
    const appsPending = apps.filter((a) => getStatus(a.status) === 'pending').length;
    const appsApproved = apps.filter((a) => getStatus(a.status) === 'approved').length;
    const appsRejected = apps.filter((a) => getStatus(a.status) === 'rejected').length;

    return {
      totalSubmissions,
      deskReviewPending,
      inPeerReview,
      revisionRequested,
      readyForPublication,
      completed,
      accepted,
      rejected,
      decisionsPending,
      totalApps,
      appsPending,
      appsApproved,
      appsRejected,
    };
  }, [submissions, reviewerApplications]);

  const fetchAll = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [subsRes, appsRes, reviewersRes, periodsRes] = await Promise.all([
        fetch(apiUrl('submissions/'), { headers }),
        fetch(apiUrl('reviewer-applications/'), { headers }),
        fetch(apiUrl('users/reviewers/'), { headers }),
        fetch(apiUrl('admin/submission-periods/'), { headers }),
      ]);

      if (!subsRes.ok) throw new Error('Failed to load submissions.');
      if (!appsRes.ok) throw new Error('Failed to load reviewer applications.');
      if (!reviewersRes.ok) throw new Error('Failed to load reviewers.');
      if (!periodsRes.ok) throw new Error('Failed to load submission periods.');

      const [subsData, appsData, reviewersData, periodsData] = await Promise.all([
        subsRes.json(),
        appsRes.json(),
        reviewersRes.json(),
        periodsRes.json(),
      ]);

      setSubmissions(Array.isArray(subsData) ? subsData : subsData?.results || []);
      setReviewerApplications(Array.isArray(appsData) ? appsData : appsData?.results || []);
      const reviewersList = Array.isArray(reviewersData) ? reviewersData : reviewersData?.results || [];
      setReviewerCount(reviewersList.length);
      setSubmissionPeriods(Array.isArray(periodsData) ? periodsData : periodsData?.results || []);

      setLastUpdatedAt(Date.now());
    } catch (err: any) {
      setError(err?.message || 'Failed to load overview data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch on mount
    fetchAll();
    // Lightweight "real-time" refresh
    const interval = setInterval(() => {
      fetchAll();
    }, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900">Editor Dashboard Overview</h3>
          <p className="text-gray-600 mt-2">
            Real-time workload snapshot for screening, peer review, and decisions.
          </p>
          {lastUpdatedAt && (
            <p className="text-xs text-gray-500 mt-2">
              Updated {new Date(lastUpdatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>

        <button
          onClick={fetchAll}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition disabled:opacity-60"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6 animate-pulse">
              <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
              <div className="h-8 w-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {submissionPeriods.filter((p) => p.is_active).length > 0 && (
            <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6 text-white shadow-2xl ring-1 ring-white/10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs uppercase tracking-[0.35em] text-blue-100">Active Submission Period Details</p>
                  <h3 className="mt-3 text-2xl font-black md:text-3xl">Current editorial window overview</h3>
                  <p className="mt-3 text-sm text-blue-100 md:text-base">
                    These are the live submission periods currently accepting manuscripts. Review the volume, issue, timeline, and status counts at a glance.
                  </p>
                </div>

                <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-[420px]">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs uppercase tracking-[0.25em] text-blue-100">Open periods</p>
                    <p className="mt-2 text-3xl font-black">{submissionPeriods.filter((p) => p.is_active).length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs uppercase tracking-[0.25em] text-blue-100">Total manuscripts</p>
                    <p className="mt-2 text-3xl font-black">{submissionPeriods.filter((p) => p.is_active).reduce((sum, p) => sum + (p.submissions_count || 0), 0)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs uppercase tracking-[0.25em] text-blue-100">Current window</p>
                    <p className="mt-2 text-sm font-semibold text-blue-50">{new Date(submissionPeriods.filter((p) => p.is_active)[0]?.start_date || '').toLocaleDateString('en-GB')} – {new Date(submissionPeriods.filter((p) => p.is_active)[0]?.end_date || '').toLocaleDateString('en-GB')}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                {submissionPeriods.filter((p) => p.is_active).map((period) => (
                  <article key={period.id} className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-lg shadow-black/10 backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/15">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-blue-100">Period</p>
                        <h4 className="mt-1 text-xl font-bold text-white">{period.title}</h4>
                      </div>
                      <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-100">Live</span>
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-2 text-sm text-blue-50">
                      <div className="rounded-xl bg-white/8 px-3 py-2"><dt className="text-[11px] uppercase tracking-[0.25em] text-blue-100">Volume</dt><dd className="mt-1 font-semibold text-white">{period.volume}</dd></div>
                      <div className="rounded-xl bg-white/8 px-3 py-2"><dt className="text-[11px] uppercase tracking-[0.25em] text-blue-100">Issue</dt><dd className="mt-1 font-semibold text-white">{period.issue}</dd></div>
                      <div className="rounded-xl bg-white/8 px-3 py-2"><dt className="text-[11px] uppercase tracking-[0.25em] text-blue-100">Total submissions</dt><dd className="mt-1 font-semibold text-white">{period.submissions_count || 0}</dd></div>
                      <div className="rounded-xl bg-white/8 px-3 py-2"><dt className="text-[11px] uppercase tracking-[0.25em] text-blue-100">Accepted</dt><dd className="mt-1 font-semibold text-emerald-100">{period.accepted_count || 0}</dd></div>
                      <div className="rounded-xl bg-white/8 px-3 py-2"><dt className="text-[11px] uppercase tracking-[0.25em] text-blue-100">Rejected</dt><dd className="mt-1 font-semibold text-rose-100">{period.rejected_count || 0}</dd></div>
                      <div className="rounded-xl bg-white/8 px-3 py-2"><dt className="text-[11px] uppercase tracking-[0.25em] text-blue-100">Under review</dt><dd className="mt-1 font-semibold text-sky-100">{period.under_review_count || 0}</dd></div>
                    </dl>

                    <p className="mt-4 border-t border-white/10 pt-3 text-xs text-blue-100">{new Date(period.start_date).toLocaleDateString('en-GB')} – {new Date(period.end_date).toLocaleDateString('en-GB')}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Submission cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="/editor-dashboard?tab=submissions" className="group block rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6 shadow-lg shadow-blue-100/70 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-200/70">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Submissions</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-2">{computeCounts.totalSubmissions}</p>
                  <p className="text-xs text-blue-600 mt-2 font-medium group-hover:underline">Open submissions view →</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                  <FileText size={20} className="text-blue-700" />
                </div>
              </div>
            </Link>

            <Link href="/editor-dashboard?tab=desk-review" className="group block rounded-3xl border border-purple-100 bg-gradient-to-br from-purple-50 via-white to-fuchsia-50 p-6 shadow-lg shadow-purple-100/70 transition-all duration-300 hover:-translate-y-1 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-200/70">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Desk Review Pending</p>
                  <p className="text-3xl font-extrabold text-purple-700 mt-2">{computeCounts.deskReviewPending}</p>
                  <p className="text-xs text-purple-600 mt-2 font-medium group-hover:underline">View screening queue →</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center">
                  <Clock size={20} className="text-purple-700" />
                </div>
              </div>
            </Link>

            <Link href="/editor-dashboard?tab=peer-review-reports" className="group block rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-6 shadow-lg shadow-sky-100/70 transition-all duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-sky-200/70">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-blue-600 font-medium">In Peer Review</p>
                  <p className="text-3xl font-extrabold text-blue-700 mt-2">{computeCounts.inPeerReview}</p>
                  <p className="text-xs text-blue-600 mt-2 font-medium group-hover:underline">Open review monitor →</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                  <FileText size={20} className="text-blue-700" />
                </div>
              </div>
            </Link>

            <Link href="/editor-dashboard?tab=monitor-reviews" className="group block rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-lg shadow-amber-100/70 transition-all duration-300 hover:-translate-y-1 hover:border-amber-200 hover:shadow-xl hover:shadow-amber-200/70">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-orange-600 font-medium">Revision Requested</p>
                  <p className="text-3xl font-extrabold text-orange-700 mt-2">{computeCounts.revisionRequested}</p>
                  <p className="text-xs text-orange-600 mt-2 font-medium group-hover:underline">Inspect revision flow →</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center">
                  <AlertCircle size={20} className="text-orange-700" />
                </div>
              </div>
            </Link>

            <Link href="/editor-dashboard?tab=ready-for-publication" className="group block rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-green-50 p-6 shadow-lg shadow-emerald-100/70 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-200/70">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-green-700 font-medium">Ready for Publication</p>
                  <p className="text-3xl font-extrabold text-green-700 mt-2">{computeCounts.readyForPublication}</p>
                  <p className="text-xs text-green-700 mt-2 font-medium group-hover:underline">See publication-ready list →</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center">
                  <CheckCircle size={20} className="text-green-700" />
                </div>
              </div>
            </Link>

            <Link href="/editor-dashboard?tab=completed-archive" className="group block rounded-3xl border border-slate-100 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 shadow-lg shadow-slate-100/70 transition-all duration-300 hover:-translate-y-1 hover:border-slate-200 hover:shadow-xl hover:shadow-slate-200/70">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-700 font-medium">Completed</p>
                  <p className="text-3xl font-extrabold text-slate-700 mt-2">{computeCounts.completed}</p>
                  <p className="text-xs text-slate-700 mt-2 font-medium group-hover:underline">Open archive view →</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center">
                  <Archive size={20} className="text-slate-700" />
                </div>
              </div>
            </Link>

            <Link href="/editor-dashboard?tab=final-decision" className="group block rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-pink-50 p-6 shadow-lg shadow-rose-100/70 transition-all duration-300 hover:-translate-y-1 hover:border-rose-200 hover:shadow-xl hover:shadow-rose-200/70">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-red-700 font-medium">Rejected</p>
                  <p className="text-3xl font-extrabold text-red-700 mt-2">{computeCounts.rejected}</p>
                  <p className="text-xs text-red-700 mt-2 font-medium group-hover:underline">Open decision queue →</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center">
                  <XCircle size={20} className="text-red-700" />
                </div>
              </div>
            </Link>

            <Link href="/editor-dashboard?tab=final-decision" className="group block rounded-3xl border border-gray-100 bg-gradient-to-br from-gray-50 via-white to-slate-100 p-6 shadow-lg shadow-gray-100/80 transition-all duration-300 hover:-translate-y-1 hover:border-gray-200 hover:shadow-xl hover:shadow-gray-200/80 lg:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Decisions Pending</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-2">{computeCounts.decisionsPending}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Counts submissions currently in review and ready for a final decision.
                  </p>
                  <p className="text-xs text-gray-600 mt-3 font-medium group-hover:underline">Review pending decisions →</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center">
                  <Gavel size={20} className="text-gray-700" />
                </div>
              </div>
            </Link>
          </div>

          {/* Reviewer application cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="/editor-dashboard?tab=reviewer-applications" className="group block rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6 shadow-lg shadow-indigo-100/70 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-200/70">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Reviewer Applications</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-2">{computeCounts.totalApps}</p>
                  <p className="text-xs text-indigo-600 mt-2 font-medium group-hover:underline">Review applications →</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <UserCheck size={20} className="text-indigo-700" />
                </div>
              </div>
            </Link>

            <Link href="/editor-dashboard?tab=reviewer-applications" className="group block rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-6 shadow-lg shadow-sky-100/70 transition-all duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-sky-200/70">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Pending Applications</p>
                  <p className="text-3xl font-extrabold text-blue-700 mt-2">{computeCounts.appsPending}</p>
                  <p className="text-xs text-blue-600 mt-2 font-medium group-hover:underline">Open pending list →</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Clock size={20} className="text-blue-700" />
                </div>
              </div>
            </Link>

            <Link href="/editor-dashboard?tab=reviewer-applications" className="group block rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-6 shadow-lg shadow-emerald-100/70 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-200/70">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-green-700 font-medium">Approved Applications</p>
                  <p className="text-3xl font-extrabold text-green-700 mt-2">{computeCounts.appsApproved}</p>
                  <p className="text-xs text-green-700 mt-2 font-medium group-hover:underline">See approved reviewers →</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center">
                  <CheckCircle size={20} className="text-green-700" />
                </div>
              </div>
            </Link>

            <Link href="/editor-dashboard?tab=reviewer-applications" className="group block rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-red-50 p-6 shadow-lg shadow-rose-100/70 transition-all duration-300 hover:-translate-y-1 hover:border-rose-200 hover:shadow-xl hover:shadow-rose-200/70">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-red-700 font-medium">Rejected Applications</p>
                  <p className="text-3xl font-extrabold text-red-700 mt-2">{computeCounts.appsRejected}</p>
                  <p className="text-xs text-red-700 mt-2 font-medium group-hover:underline">View rejected records →</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center">
                  <XCircle size={20} className="text-red-700" />
                </div>
              </div>
            </Link>

            <Link href="/editor-dashboard?tab=reviewer-performance" className="group block rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-yellow-50 p-6 shadow-lg shadow-amber-100/70 transition-all duration-300 hover:-translate-y-1 hover:border-amber-200 hover:shadow-xl hover:shadow-amber-200/70 lg:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Reviewers</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-2">{reviewerCount}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Active reviewers registered in the system.
                  </p>
                  <p className="text-xs text-amber-700 mt-3 font-medium group-hover:underline">Open reviewer performance →</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Users size={20} className="text-amber-700" />
                </div>
              </div>
            </Link>
          </div>

          {/* Submission Periods section */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Link href="/editor-dashboard?tab=submission-periods" className="group block rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-cyan-100 p-6 shadow-lg shadow-cyan-100/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-200/70">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-cyan-700 font-medium">Active Submission Periods</p>
                    <p className="text-3xl font-extrabold text-cyan-900 mt-2">
                      {submissionPeriods.filter((p) => p.is_active).length}
                    </p>
                    <p className="text-sm text-cyan-700 mt-2">
                      of {submissionPeriods.length} total periods
                    </p>
                    <p className="text-xs text-cyan-800 mt-3 font-medium group-hover:underline">Open live periods →</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-cyan-200 flex items-center justify-center">
                    <Calendar size={24} className="text-cyan-900" />
                  </div>
                </div>
              </Link>

              <Link href="/editor-dashboard?tab=submission-periods" className="group block rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-indigo-100 p-6 shadow-lg shadow-indigo-100/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-200/70">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-indigo-700 font-medium">Total Submission Periods</p>
                    <p className="text-3xl font-extrabold text-indigo-900 mt-2">{submissionPeriods.length}</p>
                    <p className="text-sm text-indigo-700 mt-2">
                      Configured periods
                    </p>
                    <p className="text-xs text-indigo-800 mt-3 font-medium group-hover:underline">See all periods →</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-200 flex items-center justify-center">
                    <Clock size={24} className="text-indigo-900" />
                  </div>
                </div>
              </Link>
            </div>

          </div>
        </>
      )}
    </div>
  );
}