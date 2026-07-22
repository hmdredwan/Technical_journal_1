// src/components/user/UserDashboardLayout.tsx
"use client";

import { useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut, User, FileText, Settings, LayoutDashboard, Menu, X, Upload, GitPullRequest, CreditCard, Home } from 'lucide-react';

interface UserDashboardLayoutProps {
  children: ReactNode;
  role?: 'user' | 'reviewer' | 'editor' | string;
}

export default function UserDashboardLayout({ children, role }: UserDashboardLayoutProps) {
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState('User');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setUserName(localStorage.getItem('user_name') || 'User');
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  // ------------------ Idle session timeout ------------------
  const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
  const WARNING_DURATION_MS = 60 * 1000; // 1 minute warning

  const idleTimeoutRef = useRef<number | null>(null);
  const warningTimeoutRef = useRef<number | null>(null);
  const expireTimeoutRef = useRef<number | null>(null);
  const warningIntervalRef = useRef<number | null>(null);

  const [showWarning, setShowWarning] = useState(false);
  const [warningSecondsLeft, setWarningSecondsLeft] = useState(60);

  const clearAllTimers = useCallback(() => {
    if (idleTimeoutRef.current) window.clearTimeout(idleTimeoutRef.current);
    if (warningTimeoutRef.current) window.clearTimeout(warningTimeoutRef.current);
    if (expireTimeoutRef.current) window.clearTimeout(expireTimeoutRef.current);
    if (warningIntervalRef.current) window.clearInterval(warningIntervalRef.current);
    idleTimeoutRef.current = null;
    warningTimeoutRef.current = null;
    expireTimeoutRef.current = null;
    warningIntervalRef.current = null;
  }, []);

  const expireSession = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    localStorage.clear();
    router.push('/login');
  }, [clearAllTimers, router]);

  const startWarningCountdown = useCallback(() => {
    setWarningSecondsLeft(Math.floor(WARNING_DURATION_MS / 1000));
    warningIntervalRef.current = window.setInterval(() => {
      setWarningSecondsLeft((s) => {
        if (s <= 1) {
          // let expireTimeout handle final logout, but be safe and call expire
          window.clearInterval(warningIntervalRef.current as number);
          warningIntervalRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000) as unknown as number;
  }, []);

  const startIdleTimers = useCallback(() => {
    clearAllTimers();
    const warningAt = IDLE_TIMEOUT_MS - WARNING_DURATION_MS;

    warningTimeoutRef.current = window.setTimeout(() => {
      setShowWarning(true);
      startWarningCountdown();
    }, warningAt) as unknown as number;

    expireTimeoutRef.current = window.setTimeout(() => {
      expireSession();
    }, IDLE_TIMEOUT_MS) as unknown as number;
  }, [clearAllTimers, startWarningCountdown, expireSession]);

  const resetIdle = useCallback(() => {
    if (showWarning) setShowWarning(false);
    setWarningSecondsLeft(Math.floor(WARNING_DURATION_MS / 1000));
    startIdleTimers();
  }, [showWarning, startIdleTimers]);

  useEffect(() => {
    // start timers when component mounts
    startIdleTimers();

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handleActivity = () => resetIdle();

    events.forEach((ev) => window.addEventListener(ev, handleActivity));

    // also reset on visibility change
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') resetIdle();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibility);
      clearAllTimers();
    };
  }, [startIdleTimers, resetIdle, clearAllTimers]);

  const base = role ? `/${role}-dashboard` : '/user-dashboard';

  const menuItems = [
    { href: `${base}`, label: 'Dashboard', icon: LayoutDashboard },
    { href: `${base}/profile`, label: 'Edit Profile', icon: User },
    { href: `${base}/my-submissions`, label: 'My Submissions', icon: FileText },
    ...(role === 'author' ? [{ href: `${base}/manuscript-format`, label: 'Manuscript Format', icon: FileText }] : []),
    { href: `${base}/payments`, label: 'Payments', icon: CreditCard },
    { href: `${base}/submit`, label: 'Submit Manuscript', icon: Upload },
    { href: `${base}/revisions`, label: 'Revision Submissions', icon: GitPullRequest },
    { href: `${base}/settings`, label: 'Settings', icon: Settings },
  ];

  const closeSidebar = () => setSidebarOpen(false);

  if (!mounted || !role) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex lg:items-stretch">
      {/* ==================== SIDEBAR (same full-height pattern as editor / reviewer dashboards) ==================== */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-[120] w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out
          lg:fixed lg:translate-x-0 lg:h-screen lg:w-64 lg:z-50 lg:shadow-2xl
          flex flex-col overflow-hidden
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6 border-b flex-shrink-0">
          <h2 className="text-xl font-bold text-blue-700 truncate">{userName}</h2>
          <p className="text-xs text-gray-500 mt-1">{role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User'} Dashboard</p>
        </div>

        <nav className="mt-6 px-3 space-y-1 flex-1 overflow-y-auto min-h-0">
          {menuItems.map(item => {
            const normalizedPath = pathname?.replace(/\/$/, '') || '';
            const normalizedHref = item.href.replace(/\/$/, '');
            const isRootLink = normalizedHref === base;
            const isActive = isRootLink
              ? normalizedPath === normalizedHref
              : normalizedPath === normalizedHref || normalizedPath.startsWith(`${normalizedHref}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex-shrink-0 p-4 border-t bg-white">
          <button
            onClick={() => {
              handleLogout();
              closeSidebar();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT AREA ==================== */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
        {/* Mobile toggle button */}
        <button
          className="lg:hidden fixed top-4 left-4 z-[110] p-3 bg-white rounded-xl shadow-lg border border-gray-200"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}

        <main className={`flex-1 p-6 ${sidebarOpen ? 'blur-sm pointer-events-none lg:blur-none lg:pointer-events-auto' : ''}`}>
          <div className="flex items-center justify-between gap-3 mb-6">
            {/* Page Title */}
            {pathname === `/${role}-dashboard` || pathname === `/${role}-dashboard/` ? (
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                {role.charAt(0).toUpperCase() + role.slice(1)} Dashboard
              </h1>
            ) : <div />}

            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100"
              >
                <Home size={18} />
                <span className="hidden sm:inline text-sm text-gray-700">Homepage</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          {children}
        </main>
        {/* Session expiration warning modal */}
        {showWarning && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md z-40">
              <h3 className="text-lg font-semibold text-gray-900">Inactivity detected</h3>
              <p className="text-sm text-gray-600 mt-2">Your session will expire in <span className="font-medium">{warningSecondsLeft}</span> seconds due to inactivity.</p>
              <div className="mt-4 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    resetIdle();
                  }}
                  className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
                >
                  Continue Session
                </button>
                <button
                  onClick={() => {
                    clearAllTimers();
                    handleLogout();
                  }}
                  className="px-4 py-2 rounded-md bg-red-50 text-red-700 hover:bg-red-100"
                >
                  Logout Now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}