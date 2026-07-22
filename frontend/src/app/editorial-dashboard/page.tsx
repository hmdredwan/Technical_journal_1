'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl } from '@/utils/api';
import { Menu, X, Clock, History, User, LogOut } from 'lucide-react';

// Import tab components
import AssignedReviewsContent from './assigned/page';
import ReviewLogsContent from './logs/page';
import ReviewerProfilePage from './profile/page';

export default function EditorialDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('assigned');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  useEffect(() => {
    // Safely get and lowercase role (fallback to empty string)
    const roleRaw = localStorage.getItem('user_role');
    const role = roleRaw ? roleRaw.toLowerCase() : '';

    const allowedRoles = [
      'editorial_board',
      'editorial',
      'editor_in_chief',
      'managing_editor',
      'associate_editor',
      'editor',
    ];

    if (!token || !allowedRoles.includes(role)) {
      router.push('/login');
      return;
    }

    fetchAssignments();
  }, [router, token]);

  const fetchAssignments = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError('');

      const res = await fetch(apiUrl('review-assignments/'), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError('Session expired or unauthorized. Redirecting to login...');
          localStorage.clear();
          setTimeout(() => router.push('/login'), 2000);
          return;
        }
        const errText = await res.text().catch(() => 'Unknown error');
        throw new Error(`Failed to load assignments (${res.status}): ${errText}`);
      }

      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : data.results || []);
    } catch (err: any) {
      console.error('Assignments fetch error:', err);
      setError(err.message || 'Failed to load your assigned reviews.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const sidebarItems = [
    { id: 'assigned', label: 'Assigned Manuscripts', icon: Clock },
    { id: 'logs', label: 'Review History', icon: History },
    { id: 'profile', label: 'Update Profile', icon: User },
  ];

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
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-white shadow-2xl transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:fixed lg:translate-x-0 lg:h-screen flex flex-col overflow-hidden`}
      >
        <div className="p-6 border-b">
          <h1 className="text-3xl font-extrabold text-blue-700">Editorial</h1>
          <p className="text-sm text-gray-500 mt-1">Board Portal</p>
        </div>

        <nav className="mt-6 px-3 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-200 ${
                activeTab === item.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon size={22} />
              <span className="font-medium">{item.label}</span>
            </button>
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
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 min-h-[calc(100vh-6rem)]">
          {/* Global loading & error states */}
          {loading && activeTab === 'assigned' ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 text-lg font-medium">{error}</p>
              <button
                onClick={() => {
                  setError('');
                  fetchAssignments();
                }}
                className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'assigned' && (
                <AssignedReviewsContent 
                  assignments={assignments} 
                  onRefresh={fetchAssignments}
                />
              )}

              {activeTab === 'logs' && (
                <ReviewLogsContent assignments={assignments} />
              )}

              {activeTab === 'profile' && (
                <ReviewerProfilePage />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}