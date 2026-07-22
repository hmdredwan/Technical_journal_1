"use client";

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, Megaphone, LogOut, User } from 'lucide-react';
import { apiUrl } from '@/utils/api';

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const [announcements, setAnnouncements] = useState<
    Array<{ id: number; message: string; link_url: string | null }>
  >([]);

  // Check authentication status
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('access_token');
      const role = localStorage.getItem('user_role');
      setIsAuthenticated(!!token);
      setUserRole(role);
    };

    checkAuth();

    // Listen for storage changes (in case user logs in/out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token' || e.key === 'user_role') {
        checkAuth();
      }
    };

    // Listen for custom auth change event (for same-tab login/logout)
    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-change', handleAuthChange);
    
    // Also check auth when pathname changes (e.g., navigating from dashboard to homepage)
    if (pathname) {
      checkAuth();
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, [pathname]);

  // Logout function
  const handleLogout = () => {
    // Clear all auth-related data from localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('refresh_token'); // if exists
    localStorage.removeItem('user_email'); // if exists
    localStorage.removeItem('user_name'); // if exists

    // Dispatch auth change event for same-tab updates
    window.dispatchEvent(new Event('auth-change'));

    // Update state immediately
    setIsAuthenticated(false);
    setUserRole(null);

    // Close mobile menu if open
    setIsMobileMenuOpen(false);

    // Redirect to login page
    router.push('/login');
  };

  // Hide the navbar (including announcement bar) on all dashboard routes and login/register pages
  const hidePrefixes = [
    '/author-dashboard',
    '/user-dashboard',
    '/editor-dashboard',
    '/reviewer-dashboard',
    '/editorial-dashboard',
    '/dashboard',
    '/login',
    '/register',
  ];

  const shouldHideNavbar =
    pathname &&
    hidePrefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));

  useEffect(() => {
    if (!pathname) return;
    if (shouldHideNavbar) return;

    let cancelled = false;
    const loadAnnouncements = async () => {
      try {
        const res = await fetch(apiUrl('announcements/public/'));
        const data = await res.json().catch(() => null);
        if (!res.ok) return;

        const list = Array.isArray(data) ? data : data?.results || [];
        if (!cancelled) setAnnouncements(list);
      } catch {
        if (!cancelled) setAnnouncements([]);
      }
    };

    loadAnnouncements();

    return () => {
      cancelled = true;
    };
  }, [pathname, shouldHideNavbar]);

  if (shouldHideNavbar) return null;

  return (
    <>
      {/* Announcement Bar */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white overflow-hidden py-2.5 shadow-sm">
        <div className="whitespace-nowrap animate-marquee text-sm font-medium tracking-wide">
          {announcements.length > 0 ? (
            announcements.map((a) => (
              <span key={a.id} className="mx-12 inline-block">
                {a.link_url ? (
                  <a
                    href={a.link_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white hover:underline"
                  >
                    <Megaphone
                      size={14}
                      className="inline-block mr-2 -mt-[1px] text-red-950"
                    />
                    {a.message}
                  </a>
                ) : (
                  <span>
                    <Megaphone
                      size={14}
                      className="inline-block mr-2 -mt-[1px] text-amber-200"
                    />
                    {a.message}
                  </span>
                )}
              </span>
            ))
          ) : (
            <span className="mx-12 inline-block">No current announcements.</span>
          )}
        </div>
      </div>

      {/* Main Navbar */}
      <header className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">

            {/* Logo */}
            <Link href="/" className="group flex items-center gap-3 select-none">
              <Image
                src="/images/journal_logo_1.jpeg"
                alt="RRI Logo"
                width={44}
                height={44}
                priority
                className="
                  object-contain
                  transition-transform duration-300 ease-out
                  group-hover:scale-110
                  group-hover:rotate-[2deg]
                "
              />
              <div className="flex flex-col justify-center leading-tight">
                <span className="text-lg font-serif font-bold text-gray-800 tracking-wide">
                  TECHNICAL JOURNAL
                </span>
                <span className="text-xs font-medium text-gray-500 hidden sm:block">
                  RIVER RESEARCH INSTITUTE
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-0.5">
              {[
                'About',
                'Current Issue',
                'Archives',
                'Editorial Board',
                'Guidelines',
                'Submit',
                'Contact',
              ].map((item) => (
                <Link
                  key={item}
                  href={item === 'Current Issue' ? '/issues/current' : `/${item.toLowerCase().replace(' ', '-')}`}
                  className="relative px-3 py-1.5 text-sm text-gray-700 hover:text-blue-600 font-medium group transition-colors"
                >
                  {item}
                  <span className="absolute left-0 bottom-0 w-0 h-[1.5px] bg-blue-600 group-hover:w-full transition-all duration-300 ease-out" />
                </Link>
              ))}
              
              {/* Authentication Buttons */}
              {isAuthenticated ? (
                <div className="ml-4 flex items-center gap-2">
                  {/* User Dashboard Link */}
                  <Link
                    href={userRole === 'admin' ? '/dashboard' : `/${userRole}-dashboard`}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-600 font-medium transition-colors"
                  >
                    <User size={18} />
                    Dashboard
                  </Link>
                  
                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              ) : (
                <div className="ml-6 flex items-center gap-2">
                  <Link
                    href="/login"
                    className="px-5 py-2 text-sm font-semibold text-blue-600 rounded-full transition duration-200 hover:text-blue-700"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                  >
                    Register
                  </Link>
                </div>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-gray-800"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

        {/* Slide-in Panel */}
        <div
          className={`absolute top-0 left-0 h-full w-4/5 max-w-sm bg-white shadow-2xl transform transition-transform duration-500 z-50 ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full">

            {/* Mobile Header */}
            <div className="p-6 border-b flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <Image
                  src="/images/journal_logo_1.jpeg"
                  alt="RRI Logo"
                  width={36}
                  height={36}
                  className="object-contain"
                />
                <span className="text-lg font-semibold text-blue-700">
                  Technical Journal
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-gray-600 hover:text-gray-900"
              >
                <X className="h-8 w-8" />
              </button>
            </div>

            {/* Mobile Menu Items */}
            <nav className="flex-1 px-5 py-8 space-y-1.5">
              {[
                { name: 'About', href: '/about' },
                { name: 'Current Issue', href: '/issues/current' },
                { name: 'Archives', href: '/archives' },
                { name: 'Editorial Board', href: '/editorial-board' },
                { name: 'Guidelines', href: '/guidelines' },
                { name: 'Submit Manuscript', href: '/submit' },
                { name: 'Contact', href: '/contact' },
              ].map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-3 px-5 rounded-lg text-lg font-medium text-gray-800 hover:bg-gray-100 transition-colors"
                >
                  {item.name}
                </Link>
              ))}

              {/* Authentication Section */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                {isAuthenticated ? (
                  <>
                    {/* User Dashboard Link */}
                    <Link
                      href={userRole === 'admin' ? '/dashboard' : `/${userRole}-dashboard`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 py-3.5 px-5 rounded-lg text-lg font-medium text-gray-800 hover:bg-gray-100 transition-colors"
                    >
                      <User size={20} />
                      My Dashboard
                    </Link>
                    
                    {/* Logout Button */}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full py-3.5 px-5 rounded-lg text-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                    >
                      <LogOut size={20} />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block py-3.5 px-5 rounded-full text-lg font-semibold text-blue-600 transition duration-200 hover:text-blue-700"
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block py-3.5 px-5 rounded-lg text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      Register
                    </Link>
                  </>
                )}
              </div>
            </nav>

            {/* Footer */}
            <div className="p-6 border-t text-sm text-gray-600 bg-gray-50">
              ISSN 1234-5678 (Print) • Dhaka, Bangladesh
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
