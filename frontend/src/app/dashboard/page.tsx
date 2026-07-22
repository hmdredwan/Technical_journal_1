// src/app/dashboard/page.tsx
'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import useIdleTimeout from '@/hooks/useIdleTimeout';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Menu, X, Users, Shield, FileText, Upload, Settings, LogOut, 
  LayoutDashboard, UserCog, User, BarChart3, BookOpen, UserCheck, 
  Bell, Clock, History, TrendingUp, Image as ImageIcon, Calendar, Activity, Home
} from 'lucide-react';

// Import all tab components
import ManageEditorialBoard from '@/components/admin/ManageEditorialBoard';
import ManageUsers from '@/components/admin/ManageUsers';
import ManageRoles from '@/components/admin/ManageRoles'; 
import ManageSubmissions from '@/components/admin/ManageSubmissions';
import CreateUserForm from '@/components/admin/CreateUserForm';
import SettingsTab from '@/components/admin/SettingsTab';
import ManageIssues from '@/components/admin/ManageIssues';
import ManageReviewAssignments from '@/components/admin/ManageReviewAssignments';
import DecisionLogsTab from '@/components/admin/DecisionLogsTab';
import CallForPapersTab from '@/components/admin/CallForPapersTab';
import ManageCallForPaperAdvertize from '@/components/admin/ManageCallForPaperAdvertize';
import ManageSubmissionDeadline from '@/components/admin/ManageSubmissionDeadline';
import ManagePeerReviewReports from '@/components/admin/ManagePeerReviewReports';
import ManageReviewerPerformance from '@/components/admin/ManageReviewerPerformance';
import ManageAnnouncements from '@/components/admin/ManageAnnouncements';
import ManageHeroImages from '@/components/admin/ManageHeroImages';
import ManageReviewerApplications from '@/components/admin/ManageReviewerApplications';
import ManageGuidelines from '@/components/admin/ManageGuidelines';
import ManageAboutPage from '@/components/admin/ManageAboutPage';
import ManageManuscriptFormats from '@/components/admin/ManageManuscriptFormats';
import ManagePayments from '@/components/admin/ManagePayments';
import ManageNews from '@/components/admin/ManageNews';
import ManageImportantDates from '@/components/admin/ManageImportantDates';
import AnalyticsTab from '@/components/admin/AnalyticsTab';
import ManageSubmissionPeriods from '@/components/admin/ManageSubmissionPeriods';
import ReadyForPublicationAdmin from '@/app/editor-dashboard/ready-for-publication/page';
import CompletedArchiveAdmin from '@/app/editor-dashboard/completed-archive/page';
import { apiUrl } from '@/utils/api';

type SubmissionPeriod = {
  id: number;
  title: string;
  volume: string | number;
  issue: string | number;
  submissions_count?: number;
  accepted_count?: number;
  rejected_count?: number;
  under_review_count?: number;
  is_active?: boolean;
  start_date?: string;
  end_date?: string;
};

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const tab = searchParams.get('tab') || 'overview';
    setActiveTab(tab);
  }, [searchParams]);

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRoles: 0,
    totalSubmissions: 0,
    totalBoardMembers: 0,
    totalPapers: 0,
    totalSubmissionPeriods: 0,
    activeSubmissionPeriods: 0,
  });
  const [submissionPeriods, setSubmissionPeriods] = useState<SubmissionPeriod[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const { showWarning: adminShowWarning, secondsLeft: adminSecondsLeft, resetIdle: adminResetIdle, logoutNow: adminLogoutNow } = useIdleTimeout();

  const formatPeriodDate = (date?: string) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString('en-GB');
  };

  // Handle authentication on client side
  useEffect(() => {
    setIsMounted(true);

    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('access_token');
      const userRole = localStorage.getItem('user_role');

      setToken(t);

      if (!t || userRole !== 'admin') {
        router.replace('/login');
      }
    }
  }, [router]);

  // Watch token and redirect if it becomes null (from idle timeout)
  useEffect(() => {
    if (isMounted && token === null && typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('access_token');
      if (!storedToken) {
        // Token was cleared (likely by idle timeout), cancel pending fetches and redirect
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        router.push('/login');
      }
    }
  }, [token, isMounted, router]);

  // Fetch dashboard statistics
  const fetchDashboardStats = useCallback(async () => {
    if (!token) return;

    setLoadingStats(true);
    setStatsError('');

    // Create abort controller for this fetch
    const ac = new AbortController();
    abortControllerRef.current = ac;

    try {
      const headers = { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const [usersRes, rolesRes, subsRes, boardRes, papersRes, periodsRes] = await Promise.all([
        fetch(apiUrl('users/'), { headers, signal: ac.signal }),
        fetch(apiUrl('roles/'), { headers, signal: ac.signal }),
        fetch(apiUrl('submissions/'), { headers, signal: ac.signal }),
        fetch(apiUrl('editorial-board/'), { headers, signal: ac.signal }),
        fetch(apiUrl('papers/'), { headers, signal: ac.signal }),
        fetch(apiUrl('admin/submission-periods/'), { headers, signal: ac.signal }),
      ]);

      if (!usersRes.ok || !rolesRes.ok || !subsRes.ok || !boardRes.ok || !papersRes.ok || !periodsRes.ok) {
        // If 401, token was likely invalidated
        if (usersRes.status === 401 || rolesRes.status === 401 || subsRes.status === 401 || boardRes.status === 401 || papersRes.status === 401 || periodsRes.status === 401) {
          localStorage.clear();
          setToken(null);
          router.push('/login');
          return;
        }
        throw new Error('One or more stats requests failed');
      }

      const [users, roles, submissions, board, papers, periods] = await Promise.all([
        usersRes.json(),
        rolesRes.json(),
        subsRes.json(),
        boardRes.json(),
        papersRes.json(),
        periodsRes.json(),
      ]);

      const periodsList = Array.isArray(periods) ? periods : (periods as { results?: SubmissionPeriod[] }).results || [];
      const activePeriods = periodsList.filter((p) => p.is_active).length;

      setSubmissionPeriods(periodsList as SubmissionPeriod[]);
      setStats({
        totalUsers: Array.isArray(users) ? users.length : users.count || users.results?.length || 0,
        totalRoles: Array.isArray(roles) ? roles.length : roles.count || roles.results?.length || 0,
        totalSubmissions: Array.isArray(submissions) ? submissions.length : submissions.count || submissions.results?.length || 0,
        totalBoardMembers: Array.isArray(board) ? board.length : board.count || board.results?.length || 0,
        totalPapers: Array.isArray(papers) ? papers.length : papers.count || papers.results?.length || 0,
        totalSubmissionPeriods: periodsList.length,
        activeSubmissionPeriods: activePeriods,
      });
    } catch (error: unknown) {
      // Don't show error if request was aborted (logout in progress)
      if (error instanceof Error) {
        if (error.name !== 'AbortError') {
          setStatsError('Failed to load dashboard statistics. Please try again.');
          console.error('Stats fetch error:', error);
        }
      } else {
        setStatsError('Failed to load dashboard statistics. Please try again.');
        console.error('Stats fetch error:', error);
      }
    } finally {
      setLoadingStats(false);
    }
  }, [token, router]);

  useEffect(() => {
    if (!isMounted || !token) return;
    fetchDashboardStats();
  }, [isMounted, token, fetchDashboardStats]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'call-for-paper-advertize', label: 'Call for Paper Ads', icon: ImageIcon },
    { id: 'announcements', label: 'Announcements Bar', icon: Bell },
    { id: 'hero-images', label: 'Hero Images', icon: ImageIcon },
    { id: 'guidelines', label: 'Guidelines', icon: FileText },
    { id: 'manuscript-formats', label: 'Manuscript Formats', icon: FileText },
    { id: 'about-page', label: 'About Page', icon: BookOpen },
    { id: 'news', label: 'News', icon: Bell },
    { id: 'important-dates', label: 'Important Dates', icon: Calendar },
    { id: 'call-for-papers', label: 'Call for Papers Invitation', icon: Bell },
    { id: 'submission-deadline', label: 'Submission Deadline', icon: Clock },
    { id: 'submission-periods', label: 'Submission Periods', icon: Calendar },
    { id: 'roles', label: 'Manage Roles', icon: UserCog },
    { id: 'create-user', label: 'Create User', icon: User },
    { id: 'users', label: 'Manage Users', icon: Users },
    { id: 'editorial-board', label: 'Manage Editorial Board', icon: Users },
    { id: 'reviewer-applications', label: 'Reviewer Applications', icon: UserCheck },
    { id: 'submissions', label: 'Submissions', icon: FileText },
    // { id: 'ready-for-publication', label: 'Ready for Publication', icon: BookOpen },
    // { id: 'completed-archive', label: 'Completed Archive', icon: Archive },
    { id: 'review-assignments', label: 'Review Assignments', icon: FileText },
    { id: 'peer-review-reports', label: 'Peer Review Reports', icon: FileText },
    { id: 'reviewer-performance', label: 'Reviewer Performance', icon: TrendingUp },
    { id: 'analytics', label: 'Analytics', icon: Activity },
    // { id: 'manage-issues', label: 'Manage Issues & Volumes', icon: BookOpen },
    { id: 'payments', label: 'Financials', icon: BarChart3 },
    { id: 'decision-logs', label: 'Decision Logs', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Loading state
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // If token is null, don't render dashboard (redirect should be in progress)
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (loadingStats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex lg:items-stretch">
      {/* Mobile Sidebar Toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-white rounded-xl shadow-lg"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-white shadow-2xl transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:fixed lg:translate-x-0 lg:self-stretch lg:h-screen lg:z-50 flex flex-col overflow-hidden`}
      >
        <div className="p-6 border-b shrink-0">
          <h1 className="text-3xl font-extrabold text-blue-700">Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Superadmin Panel</p>
        </div>

        <nav className="mt-4 px-3 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
          {sidebarItems.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard?tab=${item.id}`}
              onClick={(e) => {
                // For regular clicks, prevent full page reload and just update state
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                  e.preventDefault();
                  setSidebarOpen(false);
                  setActiveTab(item.id);
                  const url = new URL(window.location.href);
                  url.searchParams.set('tab', item.id);
                  window.history.replaceState({}, '', url);
                }
                // Ctrl+Click, Cmd+Click, Shift+Click, or middle-click will use default Link behavior
              }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-200 block ${
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

        <div className="mt-auto p-6 border-t shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 lg:ml-72 min-h-screen pt-6 px-4 sm:px-6 lg:px-10 ${sidebarOpen ? 'blur-sm lg:blur-none' : ''}`}>
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            {sidebarItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
          </h2>

          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-blue-50 transition text-blue-600">
              <Home size={18} />
              <span className="hidden sm:inline text-sm font-medium">Homepage</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Tab Content Container */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 lg:p-10 min-h-[70vh]">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              {statsError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-8">
                  {statsError}
                </div>
              )}

              {submissionPeriods.filter((p) => p.is_active).length > 0 && (
                <section className="mb-8 rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6 text-white shadow-2xl ring-1 ring-white/10">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-xs uppercase tracking-[0.35em] text-blue-100">Active Submission Period Details</p>
                      <h3 className="mt-3 text-lg font-bold md:text-xl">Current editorial window overview</h3>
                      <p className="mt-3 text-xs text-blue-100 md:text-sm">
                        These are the live submission periods currently accepting manuscripts. Review the volume, issue, timeline, and status counts at a glance.
                      </p>
                    </div>

                    <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-[420px]">
                      <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                        <p className="text-xs uppercase tracking-[0.25em] text-blue-100">Open periods</p>
                        <p className="mt-2 text-2xl font-bold">{submissionPeriods.filter((p) => p.is_active).length}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                        <p className="text-xs uppercase tracking-[0.25em] text-blue-100">Total manuscripts</p>
                        <p className="mt-2 text-2xl font-bold">{submissionPeriods.filter((p) => p.is_active).reduce((sum, p) => sum + (p.submissions_count || 0), 0)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                        <p className="text-xs uppercase tracking-[0.25em] text-blue-100">Active range</p>
                        <p className="mt-2 text-xs font-semibold text-blue-50">{formatPeriodDate(submissionPeriods.filter((p) => p.is_active)[0]?.start_date)} – {formatPeriodDate(submissionPeriods.filter((p) => p.is_active)[0]?.end_date)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-3">
                    {submissionPeriods.filter((p) => p.is_active).map((period) => (
                      <article key={period.id} className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-lg shadow-black/10 backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/15">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-blue-100">Period</p>
                            <h4 className="mt-1 text-lg font-bold text-white">{period.title}</h4>
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

                        <p className="mt-4 border-t border-white/10 pt-3 text-xs text-blue-100">{formatPeriodDate(period.start_date)} – {formatPeriodDate(period.end_date)}</p>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <Link href="/dashboard?tab=users" className="group block bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-blue-100 text-xs font-medium">Total Users</p>
                      <h4 className="text-2xl sm:text-3xl font-bold mt-2">{stats.totalUsers}</h4>
                    </div>
                    <div className="bg-white/20 p-4 rounded-xl backdrop-blur-sm">
                      <Users size={32} />
                    </div>
                  </div>
                  <p className="text-blue-100 text-xs opacity-90">Registered accounts</p>
                  <p className="text-xs text-blue-50 mt-3 font-medium group-hover:underline">Open user management →</p>
                </Link>

                <Link href="/dashboard?tab=roles" className="group block bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-purple-100 text-xs font-medium">Total Roles</p>
                      <h4 className="text-2xl sm:text-3xl font-bold mt-2">{stats.totalRoles}</h4>
                    </div>
                    <div className="bg-white/20 p-4 rounded-xl backdrop-blur-sm">
                      <Shield size={32} />
                    </div>
                  </div>
                  <p className="text-purple-100 text-xs opacity-90">Defined permissions</p>
                  <p className="text-xs text-purple-50 mt-3 font-medium group-hover:underline">Manage roles →</p>
                </Link>

                <Link href="/dashboard?tab=submissions" className="group block bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-orange-100 text-xs font-medium">Total Submissions</p>
                      <h4 className="text-2xl sm:text-3xl font-bold mt-2">{stats.totalSubmissions}</h4>
                    </div>
                    <div className="bg-white/20 p-4 rounded-xl backdrop-blur-sm">
                      <Upload size={32} />
                    </div>
                  </div>
                  <p className="text-orange-100 text-xs opacity-90">Manuscripts received</p>
                  <p className="text-xs text-orange-50 mt-3 font-medium group-hover:underline">Open submissions →</p>
                </Link>

                <Link href="/dashboard?tab=editorial-board" className="group block bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-green-100 text-xs font-medium">Board Members</p>
                      <h4 className="text-2xl sm:text-3xl font-bold mt-2">{stats.totalBoardMembers}</h4>
                    </div>
                    <div className="bg-white/20 p-4 rounded-xl backdrop-blur-sm">
                      <UserCheck size={32} />
                    </div>
                  </div>
                  <p className="text-green-100 text-xs opacity-90">Editorial team</p>
                  <p className="text-xs text-green-50 mt-3 font-medium group-hover:underline">Open board roster →</p>
                </Link>

                <Link href="/dashboard?tab=completed-archive" className="group block bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-red-100 text-xs font-medium">Published Papers</p>
                      <h4 className="text-2xl sm:text-3xl font-bold mt-2">{stats.totalPapers}</h4>
                    </div>
                    <div className="bg-white/20 p-4 rounded-xl backdrop-blur-sm">
                      <BookOpen size={32} />
                    </div>
                  </div>
                  <p className="text-red-100 text-xs opacity-90">Articles in journal</p>
                  <p className="text-xs text-red-50 mt-3 font-medium group-hover:underline">Open archive →</p>
                </Link>
              </div>

              {/* Submission Periods Card */}
              <div className="mt-8 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Link href="/dashboard?tab=submission-periods" className="group block bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-cyan-100 text-xs font-medium">Active Submission Periods</p>
                        <h4 className="text-2xl sm:text-3xl font-bold mt-2">{stats.activeSubmissionPeriods}</h4>
                        <p className="text-cyan-100 text-xs opacity-90 mt-2">of {stats.totalSubmissionPeriods} total periods</p>
                        <p className="text-xs text-cyan-50 mt-3 font-medium group-hover:underline">Review live periods →</p>
                      </div>
                      <div className="bg-white/20 p-4 rounded-xl backdrop-blur-sm">
                        <Calendar size={32} />
                      </div>
                    </div>
                  </Link>

                  <Link href="/dashboard?tab=submission-periods" className="group block bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-indigo-100 text-xs font-medium">Total Submission Periods</p>
                        <h4 className="text-2xl sm:text-3xl font-bold mt-2">{stats.totalSubmissionPeriods}</h4>
                        <p className="text-indigo-100 text-xs opacity-90 mt-2">Configured periods</p>
                        <p className="text-xs text-indigo-50 mt-3 font-medium group-hover:underline">See all periods →</p>
                      </div>
                      <div className="bg-white/20 p-4 rounded-xl backdrop-blur-sm">
                        <Clock size={32} />
                      </div>
                    </div>
                  </Link>
                </div>

                {submissionPeriods.filter((p) => p.is_active).length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                    No active submission periods are available right now.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* All Other Tabs */}
          {activeTab === 'editorial-board' && <ManageEditorialBoard />}
          {activeTab === 'users' && <ManageUsers />}
          {activeTab === 'roles' && <ManageRoles />}
          {activeTab === 'submissions' && <ManageSubmissions />}
          {activeTab === 'ready-for-publication' && <ReadyForPublicationAdmin />}
          {activeTab === 'completed-archive' && <CompletedArchiveAdmin />}
          {activeTab === 'manage-issues' && <ManageIssues />}
          {activeTab === 'create-user' && <CreateUserForm />}
          {activeTab === 'settings' && <SettingsTab />}
          {activeTab === 'review-assignments' && <ManageReviewAssignments />}
          {activeTab === 'peer-review-reports' && <ManagePeerReviewReports />}
          {activeTab === 'call-for-papers' && <CallForPapersTab />}
          {activeTab === 'call-for-paper-advertize' && <ManageCallForPaperAdvertize />}
          {activeTab === 'announcements' && <ManageAnnouncements />}
          {activeTab === 'analytics' && <AnalyticsTab />}
          {activeTab === 'hero-images' && <ManageHeroImages />}
          {activeTab === 'guidelines' && <ManageGuidelines />}
          {activeTab === 'manuscript-formats' && <ManageManuscriptFormats />}
          {activeTab === 'about-page' && <ManageAboutPage />}
          {activeTab === 'news' && <ManageNews />}
          {activeTab === 'important-dates' && <ManageImportantDates />}
          {activeTab === 'payments' && <ManagePayments />}
          {activeTab === 'submission-deadline' && <ManageSubmissionDeadline />}
          {activeTab === 'submission-periods' && <ManageSubmissionPeriods />}
          {activeTab === 'decision-logs' && <DecisionLogsTab />}
          {activeTab === 'reviewer-applications' && <ManageReviewerApplications />}
          {activeTab === 'reviewer-performance' && <ManageReviewerPerformance />}

          {/* Fallback for unknown tabs */}
          {!['overview', 'editorial-board', 'users', 'roles', 'submissions', 'manage-issues', 'create-user', 'settings', 'review-assignments', 'peer-review-reports', 'call-for-papers', 'call-for-paper-advertize', 'announcements', 'analytics', 'hero-images', 'guidelines', 'manuscript-formats', 'news', 'important-dates', 'payments', 'submission-deadline', 'submission-periods', 'decision-logs', 'reviewer-performance','about-page','reviewer-applications'].includes(activeTab) && (
            <div className="text-center py-20">
              <h3 className="text-2xl font-bold text-gray-700">
                {sidebarItems.find(item => item.id === activeTab)?.label || 'Section'}
              </h3>
              <p className="mt-6 text-base text-gray-500">
                This section is under development.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Session warning modal from idle hook */}
      {adminShowWarning ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md z-40">
            <h3 className="text-lg font-semibold text-gray-900">Inactivity detected</h3>
            <p className="text-sm text-gray-600 mt-2">Your session will expire in <span className="font-medium">{adminSecondsLeft}</span> seconds due to inactivity.</p>
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => {
                  adminResetIdle();
                }}
                className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
              >
                Continue Session
              </button>
              <button
                onClick={() => {
                  adminLogoutNow();
                }}
                className="px-4 py-2 rounded-md bg-red-50 text-red-700 hover:bg-red-100"
              >
                Logout Now
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 lg:hidden z-30" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DashboardContent />
    </Suspense>
  );
}