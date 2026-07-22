// src/app/reviewer-dashboard/page.tsx
'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import useIdleTimeout from '@/hooks/useIdleTimeout';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Menu, X, Clock, History, User, LogOut, Settings, LayoutDashboard, 
  FileText, Shield, BarChart3, Home, Wallet
} from 'lucide-react';

import ReviewerProfilePage from './profile/page';
import AssignedReviewsContent from './assigned/page';
import ReviewLogsContent from './logs/page';
import ReviewerSettingsPage from './settings/page';
import PlagiarismCheckTab from '@/components/reviewer/PlagiarismCheckTab';
import PlagiarismReportsPage from './plagiarism-reports/page';
import ReviewerPaymentsTab from '@/components/reviewer/ReviewerPaymentsTab';

import { apiUrl } from '@/utils/api';

function ReviewerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState('Reviewer');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const { showWarning: reviewerShowWarning, secondsLeft: reviewerSecondsLeft, resetIdle: reviewerResetIdle, logoutNow: reviewerLogoutNow } = useIdleTimeout();

  // Get active tab from URL query parameter (?tab=xxx)
  const activeTab = searchParams.get('tab') || 'overview';

  // Authentication check
  useEffect(() => {
    setIsMounted(true);

    if (typeof window !== 'undefined') {
      setUserName(localStorage.getItem('user_name') || 'Reviewer');
      const t = localStorage.getItem('access_token');
      const role = localStorage.getItem('user_role');

      setToken(t);

      if (!t || role !== 'reviewer') {
        router.replace('/login');
      }
    }
  }, [router]);

  // Watch token and redirect if it becomes null (from idle timeout)
  useEffect(() => {
    if (isMounted && token === null && typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('access_token');
      if (!storedToken) {
        // Token was cleared, cancel pending fetches and redirect
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        router.push('/login');
      }
    }
  }, [token, isMounted, router]);

  // Fetch assignments
  const fetchAssignments = useCallback(async () => {
    if (!token) return;

    // Create abort controller for this fetch
    const ac = new AbortController();
    abortControllerRef.current = ac;

    try {
      setLoading(true);
      const res = await fetch(apiUrl('review-assignments/'), {
        headers: { Authorization: `Bearer ${token}` },
        signal: ac.signal,
      });

      // If 401, token was invalidated
      if (res.status === 401) {
        localStorage.clear();
        setToken(null);
        router.push('/login');
        return;
      }

      if (!res.ok) throw new Error('Failed to load assignments');
      const data = await res.json();
      setAssignments(data);
    } catch (err: any) {
      // Don't show error if request was aborted (logout in progress)
      if (err.name !== 'AbortError') {
        setError(err.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    if (!isMounted || !token) return;
    fetchAssignments();
  }, [isMounted, token, fetchAssignments]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'assigned', label: 'Assigned Reviews', icon: Clock },
    { id: 'payments', label: 'Received Payments', icon: Wallet },
    { id: 'plagiarism', label: 'Plagiarism Check', icon: Shield },
    { id: 'plagiarism-reports', label: 'Plagiarism Reports', icon: BarChart3 },
    { id: 'logs', label: 'My Review Logs', icon: History },
    { id: 'profile', label: 'Update Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const today = new Date();
  const counts = (() => {
    const list = Array.isArray(assignments) ? assignments : [];
    const getStatus = (s: any) => (s || '').toString().toLowerCase();

    const total = list.length;
    const completed = list.filter((a: any) => getStatus(a.status) === 'completed').length;
    const rejected = list.filter((a: any) => getStatus(a.status) === 'rejected').length;

    const inProgress = list.filter((a: any) => {
      const st = getStatus(a.status);
      return st === 'assigned' || st === 'in_progress' || st === 'pending';
    }).length;

    const overdue = list.filter((a: any) => {
      const st = getStatus(a.status);
      if (st === 'overdue') return true;
      const due = a.due_date ? new Date(a.due_date) : null;
      if (!due || Number.isNaN(due.getTime())) return false;
      return due.getTime() < today.getTime() && st !== 'completed' && st !== 'rejected';
    }).length;

    const dueSoon = list.filter((a: any) => {
      const st = getStatus(a.status);
      const due = a.due_date ? new Date(a.due_date) : null;
      if (!due || Number.isNaN(due.getTime())) return false;
      const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7 && st !== 'completed' && st !== 'rejected';
    }).length;

    const nextDue = list
      .filter((a: any) => {
        const st = getStatus(a.status);
        if (st === 'completed' || st === 'rejected') return false;
        const due = a.due_date ? new Date(a.due_date) : null;
        return due && !Number.isNaN(due.getTime());
      })
      .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 3);

    return { total, completed, rejected, inProgress, overdue, dueSoon, nextDue };
  })();

  if (!isMounted || !token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reviewer dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-white rounded-xl shadow-lg"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white shadow-2xl transform transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:fixed lg:translate-x-0 lg:h-screen flex flex-col`}>

        <div className="p-6 border-b">
          <h1 className="text-xl font-extrabold text-blue-700 truncate">{userName}</h1>
          <p className="text-sm text-gray-500 mt-1">Reviewer Dashboard</p>
        </div>

        <nav className="mt-6 px-3 flex-1 overflow-y-auto">
          {sidebarItems.map(item => (
            <Link
              key={item.id}
              href={`/reviewer-dashboard?tab=${item.id}`}
              onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all block ${
                activeTab === item.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon size={22} />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto p-6 border-t">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 lg:ml-72 min-h-screen pt-6 px-6 lg:px-10 ${sidebarOpen ? 'blur-sm lg:blur-none' : ''}`}>
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Reviewer Dashboard</h2>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
            >
              <Home size={18} />
              <span className="text-sm font-medium">Homepage</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition"
            >
              <LogOut size={18} />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 min-h-[70vh]">
          {error ? (
            <p className="text-red-600 text-center py-10">{error}</p>
          ) : (
            <>
              {activeTab === 'overview' && (
                <>
                  <div className="flex items-start justify-between gap-4 mb-8">
                    <div>
                      <h3 className="text-3xl md:text-4xl font-bold text-gray-900">
                        Reviewer Overview
                      </h3>
                      <p className="text-gray-600 mt-2">
                        Quick summary of your review workload.
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3">
                      <FileText size={18} className="text-blue-700" />
                      <span className="text-sm font-medium text-blue-800">
                        {counts.total} assigned manuscripts
                      </span>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                      <p className="text-sm text-gray-500 font-medium">Total Assigned</p>
                      <p className="text-4xl font-extrabold text-gray-900 mt-2">{counts.total}</p>
                    </div>

                    <div className="bg-white border border-blue-100 rounded-2xl p-6 shadow-sm">
                      <p className="text-sm text-blue-700 font-medium">Active In Progress</p>
                      <p className="text-4xl font-extrabold text-blue-700 mt-2">{counts.inProgress}</p>
                    </div>

                    <div className="bg-white border border-green-100 rounded-2xl p-6 shadow-sm">
                      <p className="text-sm text-green-700 font-medium">Completed</p>
                      <p className="text-4xl font-extrabold text-green-700 mt-2">{counts.completed}</p>
                    </div>

                    <div className="bg-white border border-red-100 rounded-2xl p-6 shadow-sm">
                      <p className="text-sm text-red-700 font-medium">Overdue</p>
                      <p className="text-4xl font-extrabold text-red-700 mt-2">{counts.overdue}</p>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-3 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <h4 className="text-xl font-semibold text-gray-900">Next Due Manuscripts</h4>
                        <span className="text-sm text-gray-500">
                          Due within 7 days: <span className="font-semibold">{counts.dueSoon}</span>
                        </span>
                      </div>

                      {counts.nextDue.length === 0 ? (
                        <p className="text-gray-600">No upcoming due manuscripts.</p>
                      ) : (
                        <div className="space-y-3">
                          {counts.nextDue.map((a: any) => (
                            <div
                              key={a.id}
                              className="flex items-center justify-between gap-4 border border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition"
                            >
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 truncate">
                                  {a.submission_title || 'Untitled Manuscript'}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  Due:{' '}
                                  {a.due_date
                                    ? new Date(a.due_date).toLocaleDateString()
                                    : 'Not set'}
                                </p>
                              </div>
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                                {(a.status_display || a.status || 'assigned')
                                  .toString()
                                  .replace(/_/g, ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 shadow-sm">
                      <h4 className="text-xl font-semibold text-gray-900">Quick Actions</h4>
                      <p className="text-sm text-gray-600 mt-2">
                        Continue your review workflow.
                      </p>

                      <div className="mt-5 space-y-3">
                        <Link
                          href="/reviewer-dashboard?tab=assigned"
                          className="block w-full px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition font-medium shadow-sm text-center"
                        >
                          Go to Assigned Reviews
                        </Link>
                        <Link
                          href="/reviewer-dashboard?tab=payments"
                          className="block w-full px-4 py-3 rounded-xl bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 transition font-medium text-center"
                        >
                          View Received Payments
                        </Link>
                        <Link
                          href="/reviewer-dashboard?tab=logs"
                          className="block w-full px-4 py-3 rounded-xl bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 transition font-medium text-center"
                        >
                          View My Review Logs
                        </Link>
                      </div>

                      {counts.rejected > 0 && (
                        <div className="mt-5 p-4 rounded-xl border border-red-100 bg-white/60">
                          <p className="text-sm font-medium text-red-700">
                            Rejections recorded: {counts.rejected}
                          </p>
                          <p className="text-xs text-red-600 mt-1">
                            Use your logs to track decision history.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'assigned' && (
                <AssignedReviewsContent 
                  assignments={assignments} 
                  onRefresh={fetchAssignments}
                />
              )}

              {activeTab === 'plagiarism' && <PlagiarismCheckTab />}

              {activeTab === 'plagiarism-reports' && <PlagiarismReportsPage />}

              {activeTab === 'logs' && <ReviewLogsContent assignments={assignments} />}

              {activeTab === 'payments' && <ReviewerPaymentsTab />}

              {activeTab === 'profile' && <ReviewerProfilePage />}

              {activeTab === 'settings' && <ReviewerSettingsPage />}
            </>
          )}
        </div>
      </main>

      {/* Session warning modal from idle hook */}
      {reviewerShowWarning ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md z-40">
            <h3 className="text-lg font-semibold text-gray-900">Inactivity detected</h3>
            <p className="text-sm text-gray-600 mt-2">Your session will expire in <span className="font-medium">{reviewerSecondsLeft}</span> seconds due to inactivity.</p>
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => reviewerResetIdle()}
                className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
              >
                Continue Session
              </button>
              <button
                onClick={() => reviewerLogoutNow()}
                className="px-4 py-2 rounded-md bg-red-50 text-red-700 hover:bg-red-100"
              >
                Logout Now
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 lg:hidden z-30" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading reviewer dashboard...</p>
      </div>
    </div>
  );
}

export default function ReviewerDashboard() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ReviewerDashboardContent />
    </Suspense>
  );
}