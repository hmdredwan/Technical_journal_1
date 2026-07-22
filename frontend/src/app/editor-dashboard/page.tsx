'use client';

import { Suspense, useState, useEffect } from 'react';
import useIdleTimeout from '@/hooks/useIdleTimeout';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Menu, X, FileSearch, Users, Gavel, LogOut,
  LayoutDashboard, FileText, CheckCircle, Settings, Clock,
  UserCheck, BookOpen, Archive, TrendingUp, Bell, Image, Newspaper,
  Calendar, Shield, BarChart3, Mail, CreditCard, BookMarked, UserPlus, Home,
} from 'lucide-react';

// Import tab contents
import OverviewContent from './overview/page';
import DeskReviewContent from './desk-review/page';
import FinalDecisionContent from './final-decision/page';
import ReadyForPublicationContent from './ready-for-publication/page';
import CompletedArchiveContent from './completed-archive/page';
import SettingsContent from './settings/page';
// Editor-specific components
import ManageSubmissionDeadline from '@/components/admin/ManageSubmissionDeadline';
import ManageSubmissions from '@/components/admin/ManageSubmissions';
import ManageReviewerApplications from '@/components/admin/ManageReviewerApplications';
import ManageReviewAssignments from '@/components/admin/ManageReviewAssignments';
import ManagePeerReviewReports from '@/components/admin/ManagePeerReviewReports';
import ManageReviewerPerformance from '@/components/admin/ManageReviewerPerformance';
import ManageGuidelines from '@/components/admin/ManageGuidelines';
import ManageAboutPage from '@/components/admin/ManageAboutPage';
import ManageManuscriptFormats from '@/components/admin/ManageManuscriptFormats';
// New shared admin components for editor
import ManageAnnouncements from '@/components/admin/ManageAnnouncements';
import ManageHeroImages from '@/components/admin/ManageHeroImages';
import ManageNews from '@/components/admin/ManageNews';
import ManageImportantDates from '@/components/admin/ManageImportantDates';
import ManageRoles from '@/components/admin/ManageRoles';
import ManageUsers from '@/components/admin/ManageUsers';
import CreateUserForm from '@/components/admin/CreateUserForm';
import ManageEditorialBoard from '@/components/admin/ManageEditorialBoard';
import AnalyticsTab from '@/components/admin/AnalyticsTab';
import ManageIssues from '@/components/admin/ManageIssues';
import CallForPapersTab from '@/components/admin/CallForPapersTab';
import ManageCallForPaperAdvertize from '@/components/admin/ManageCallForPaperAdvertize';
import ManagePayments from '@/components/admin/ManagePayments';
import DecisionLogsTab from '@/components/admin/DecisionLogsTab';
import ManageSubmissionPeriods from '@/components/admin/ManageSubmissionPeriods';

function EditorDashboardContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState('Editor');
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const { showWarning: editorShowWarning, secondsLeft: editorSecondsLeft, resetIdle: editorResetIdle, logoutNow: editorLogoutNow } = useIdleTimeout();

  useEffect(() => {
    setIsMounted(true);
    setUserName(localStorage.getItem('user_name') || 'Editor');
    const t = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role')?.toLowerCase();

    setToken(t);

    if (!t || role !== 'editor') {
      router.push('/login');
      return;
    }

    const tabFromUrl = searchParams.get('tab') || searchParams.get('activeTab');
    const tabFromStorage = localStorage.getItem('editor_active_tab');

    const nextTab = tabFromUrl || tabFromStorage || 'overview';

    if (nextTab && ['overview', 'submissions', 'desk-review', 'assign-reviewers', 'monitor-reviews', 'final-decision', 'ready-for-publication', 'completed-archive', 'review-assignments', 'peer-review-reports', 'deadline', 'submission-periods', 'reviewer-applications', 'reviewer-performance', 'settings', 'guidelines', 'manuscript-formats', 'announcements', 'hero-images', 'news', 'important-dates', 'roles', 'create-user', 'users', 'editorial-board', 'analytics', 'issues-volumes', 'call-for-papers', 'call-for-paper-ads', 'financials', 'decision-logs'].includes(nextTab)) {
      setActiveTab(nextTab);
      localStorage.setItem('editor_active_tab', nextTab);
    }
  }, [router, searchParams]);

  // Watch token and redirect if it becomes null (from idle timeout)
  useEffect(() => {
    if (isMounted && token === null && typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('access_token');
      if (!storedToken) {
        router.push('/login');
      }
    }
  }, [token, isMounted, router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const sidebarItems = [
    // Editorial Management
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        // Content Management (Shared with Admin)
    { id: 'call-for-paper-ads', label: 'Call for Paper Ads', icon: Mail },
    { id: 'announcements', label: 'Announcements', icon: Bell },
    { id: 'hero-images', label: 'Hero Images', icon: Image },
    { id: 'news', label: 'News Articles', icon: Newspaper },
    { id: 'important-dates', label: 'Important Dates', icon: Calendar },
    { id: 'guidelines', label: 'Guidelines', icon: FileText },
    { id: 'manuscript-formats', label: 'Manuscript Formats', icon: FileText },
    { id: 'about-page', label: 'About Page', icon: BookOpen },
    { id: 'call-for-papers', label: 'Call for Papers Invitation', icon: Mail },
        // Publication Management
    { id: 'issues-volumes', label: 'Issues & Volumes', icon: BookOpen },
      // User & Role Management
    { id: 'roles', label: 'Manage Roles', icon: Shield },
    { id: 'create-user', label: 'Create User', icon: UserPlus },
    { id: 'users', label: 'Manage Users', icon: Users },
    { id: 'editorial-board', label: 'Editorial Board', icon: UserCheck },
    
    { id: 'submissions', label: 'Submissions', icon: FileText },
    { id: 'desk-review', label: 'Initial Screening', icon: FileSearch },
    { id: 'review-assignments', label: 'Assign Reviewers', icon: Users },
    { id: 'peer-review-reports', label: 'Peer Review Reports', icon: FileText },
    { id: 'final-decision', label: 'Make Decisions', icon: Gavel },
    { id: 'ready-for-publication', label: 'Ready for Publication', icon: CheckCircle },
    { id: 'completed-archive', label: 'Completed Archive', icon: Archive },
    { id: 'deadline', label: 'Submission Deadline', icon: Clock },
    { id: 'submission-periods', label: 'Submission Periods', icon: Calendar },
    { id: 'reviewer-applications', label: 'Reviewer Applications', icon: UserCheck },
    { id: 'reviewer-performance', label: 'Reviewer Performance', icon: TrendingUp },
    

    
  
    

    // Analytics & Finance
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'financials', label: 'Financials', icon: CreditCard },
    { id: 'decision-logs', label: 'Decision Logs', icon: BookMarked },
    
    // Settings
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

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
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-2xl transform transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:fixed lg:translate-x-0 lg:h-screen lg:z-50 flex flex-col`}>
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-blue-700 truncate">{userName}</h1>
          <p className="text-xs text-gray-500 mt-1">Editor Dashboard</p>
        </div>

        <nav className="mt-6 px-3 space-y-2 flex-1 overflow-y-auto">
          {sidebarItems.map(item => (
            <Link
              key={item.id}
              href={`/editor-dashboard?tab=${item.id}`}
              onClick={(e) => {
                // For regular clicks, prevent full page reload and just update state
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                  e.preventDefault();
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                  localStorage.setItem('editor_active_tab', item.id);
                  const url = new URL(window.location.href);
                  url.searchParams.set('tab', item.id);
                  window.history.pushState({}, '', url);
                }
                // Ctrl+Click, Cmd+Click, Shift+Click, or middle-click will use default Link behavior
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition block ${
                activeTab === item.id ? 'bg-blue-50 text-blue-700 font-medium' : ''
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition text-sm font-medium"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 lg:ml-64 min-h-screen pt-6 px-6 lg:px-10 ${sidebarOpen ? 'blur-sm lg:blur-none' : ''}`}>
        <header className="flex justify-between items-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            {sidebarItems.find(item => item.id === activeTab)?.label || 'Editor Dashboard'}
          </h2>

          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-blue-50 transition text-blue-600">
              <Home size={18} />
              <span className="hidden md:inline text-sm font-medium">Homepage</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut size={18} />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </header>

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 min-h-[70vh]">
          {/* Editorial Management Tabs */}
          {activeTab === 'overview' && <OverviewContent />}
          {activeTab === 'submissions' && <ManageSubmissions apiEndpoint="editor-submissions/" role="editor" />}
          {activeTab === 'desk-review' && <DeskReviewContent />}
          {activeTab === 'review-assignments' && <ManageReviewAssignments />}
          {activeTab === 'peer-review-reports' && <ManagePeerReviewReports />}
          {activeTab === 'final-decision' && <FinalDecisionContent />}
          {activeTab === 'ready-for-publication' && <ReadyForPublicationContent />}
          {activeTab === 'completed-archive' && <CompletedArchiveContent />}
          {activeTab === 'deadline' && <ManageSubmissionDeadline />}
          {activeTab === 'submission-periods' && <ManageSubmissionPeriods />}
          {activeTab === 'reviewer-applications' && <ManageReviewerApplications />}
          {activeTab === 'reviewer-performance' && <ManageReviewerPerformance />}
          
          {/* Content Management Tabs */}
          {activeTab === 'announcements' && <ManageAnnouncements />}
          {activeTab === 'hero-images' && <ManageHeroImages />}
          {activeTab === 'news' && <ManageNews />}
          {activeTab === 'important-dates' && <ManageImportantDates />}
          {activeTab === 'guidelines' && <ManageGuidelines />}
          {activeTab === 'manuscript-formats' && <ManageManuscriptFormats />}
          {activeTab === 'about-page' && <ManageAboutPage />}
          
          {/* User & Role Management Tabs */}
          {activeTab === 'roles' && <ManageRoles />}
          {activeTab === 'create-user' && <CreateUserForm />}
          {activeTab === 'users' && <ManageUsers />}
          {activeTab === 'editorial-board' && <ManageEditorialBoard />}
          
          {/* Publication Management Tabs */}
          {activeTab === 'issues-volumes' && <ManageIssues />}
          {activeTab === 'call-for-papers' && <CallForPapersTab />}
          {activeTab === 'call-for-paper-ads' && <ManageCallForPaperAdvertize />}
          
          {/* Analytics & Finance Tabs */}
          {activeTab === 'analytics' && <AnalyticsTab />}
          {activeTab === 'financials' && <ManagePayments />}
          {activeTab === 'decision-logs' && <DecisionLogsTab />}
          
          {/* Settings Tab */}
          {activeTab === 'settings' && <SettingsContent />}
        </div>
      </main>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 lg:hidden z-30" onClick={() => setSidebarOpen(false)} />
      )}

      {editorShowWarning ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md z-40">
            <h3 className="text-lg font-semibold text-gray-900">Inactivity detected</h3>
            <p className="text-sm text-gray-600 mt-2">Your session will expire in <span className="font-medium">{editorSecondsLeft}</span> seconds due to inactivity.</p>
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => editorResetIdle()}
                className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
              >
                Continue Session
              </button>
              <button
                onClick={() => editorLogoutNow()}
                className="px-4 py-2 rounded-md bg-red-50 text-red-700 hover:bg-red-100"
              >
                Logout Now
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading editor dashboard...</p>
      </div>
    </div>
  );
}

export default function EditorDashboard() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <EditorDashboardContent />
    </Suspense>
  );
}