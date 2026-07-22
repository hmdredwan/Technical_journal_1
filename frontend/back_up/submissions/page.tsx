'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Download, Eye, FileText, Menu, LogOut, LayoutDashboard, Users, UserCog } from 'lucide-react';

interface Submission {
  id: number;
  title: string;
  abstract: string;
  keywords: string;
  manuscript_type: string;
  submitted_by: {
    id: number;
    full_name: string;
    email: string;
  };
  corresponding_author: {
    id: number;
    full_name: string;
  };
  authors: Array<{
    id: number;
    full_name: string;
  }>;
  files: string;
  status: string;
  created_at: string;
}

export default function SubmissionsPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'submitted' | 'under-review' | 'approved' | 'rejected'>('all');
  const [selectedType, setSelectedType] = useState<string>('');

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');

    if (!accessToken || role !== 'admin') {
      router.push('/login');
      return;
    }

    if (accessToken) {
      setToken(accessToken);
    }
  }, [router]);

  useEffect(() => {
    if (!token) return;

    const fetchSubmissions = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/submissions/', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error('Failed to load submissions');
        const data = await res.json();
        setSubmissions(Array.isArray(data) ? data : data.results || []);
      } catch (err) {
        setError((err as Error).message || 'Failed to load submissions');
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [token]);

  // Apply filters & search
  useMemo(() => {
    let result = [...submissions];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(sub =>
        sub.title.toLowerCase().includes(q) ||
        sub.submitted_by.full_name.toLowerCase().includes(q) ||
        sub.submitted_by.email.toLowerCase().includes(q) ||
        sub.keywords.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (selectedStatus !== 'all') {
      result = result.filter(sub => sub.status === selectedStatus);
    }

    // Type filter
    if (selectedType) {
      result = result.filter(sub => sub.manuscript_type === selectedType);
    }

    setFilteredSubmissions(result);
  }, [submissions, searchQuery, selectedStatus, selectedType]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedType('');
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string }> = {
      'submitted': { bg: 'bg-blue-100', text: 'text-blue-800' },
      'under-review': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      'approved': { bg: 'bg-green-100', text: 'text-green-800' },
      'rejected': { bg: 'bg-red-100', text: 'text-red-800' },
    };

    const style = statusMap[status] || statusMap['submitted'];
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
        {status.replace('-', ' ').charAt(0).toUpperCase() + status.replace('-', ' ').slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const downloadFile = (submissionId: number, submissionTitle: string, filePath: string) => {
    if (!token) {
      setError('Not authenticated');
      return;
    }
    
    // Extract file extension from the file path
    const fileExtension = filePath.split('.').pop() || 'pdf';
    const fileName = `${submissionTitle}.${fileExtension}`;
    
    const downloadUrl = `http://127.0.0.1:8000/api/submissions/${submissionId}/download/`;
    
    // Create a fetch request with auth token
    fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then(response => {
        if (!response.ok) throw new Error('Download failed');
        return response.blob();
      })
      .then(blob => {
        // Create blob URL and trigger download
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch(err => {
        setError((err as Error).message || 'Failed to download file');
      });
  };

  if (loading) {
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
          } lg:fixed lg:translate-x-0 lg:self-stretch lg:h-screen lg:z-50 flex flex-col`}
        >
          <div className="p-6 border-b">
            <h1 className="text-3xl font-extrabold text-blue-700">
              RRI Admin
            </h1>
            <p className="text-sm text-gray-500 mt-1">Superadmin Panel</p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-0">
          <div className="p-8">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading submissions...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
    { id: 'users', label: 'Manage Users', icon: Users, href: '/dashboard/users' },
    { id: 'roles', label: 'Manage Roles', icon: UserCog, href: '/roles' },
    { id: 'articles', label: 'Articles', icon: FileText, href: '/dashboard/articles' },
    { id: 'submissions', label: 'Submissions', icon: FileText, href: '/dashboard/submissions' },
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
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-white shadow-2xl transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:fixed lg:translate-x-0 lg:self-stretch lg:h-screen lg:z-50 flex flex-col`}
      >
        <div className="p-6 border-b">
          <h1 className="text-3xl font-extrabold text-blue-700">
            RRI Admin
          </h1>
          <p className="text-sm text-gray-500 mt-1">Superadmin Panel</p>
        </div>

        <nav className="mt-8 px-3 space-y-2">
          {sidebarItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setSidebarOpen(false);
                router.push(item.href);
              }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-200 ${
                item.href === '/dashboard/submissions'
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

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-0">
        <div className="p-4 md:p-8 max-w-7xl">
          <div className="space-y-8">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Manuscript Submissions</h2>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Search + Filters */}
      <div className="bg-white p-6 rounded-xl shadow-md border">
        <div className="flex flex-col md:flex-row md:items-end gap-6">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by title, author, email, keywords..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as 'all' | 'submitted' | 'under-review' | 'approved' | 'rejected')}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="under-review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="original-research">Original Research</option>
              <option value="review">Review Article</option>
              <option value="short-communication">Short Communication</option>
              <option value="case-study">Case Study</option>
            </select>
          </div>

          {/* Clear Filters */}
          <button
            onClick={clearFilters}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center gap-2 whitespace-nowrap"
          >
            <X size={18} />
            Clear Filters
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border">
          <p className="text-gray-600 text-sm font-medium">Total</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{submissions.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border">
          <p className="text-gray-600 text-sm font-medium">Submitted</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {submissions.filter(s => s.status === 'submitted').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border">
          <p className="text-gray-600 text-sm font-medium">Under Review</p>
          <p className="text-3xl font-bold text-yellow-600 mt-2">
            {submissions.filter(s => s.status === 'under-review').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border">
          <p className="text-gray-600 text-sm font-medium">Approved</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {submissions.filter(s => s.status === 'approved').length}
          </p>
        </div>
      </div>

      {/* Submissions Table */}
      {filteredSubmissions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center border">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">No submissions found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Title</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Submitted By</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Authors</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredSubmissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 max-w-xs truncate">
                        {submission.title}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{submission.submitted_by.full_name}</p>
                        <p className="text-sm text-gray-600">{submission.submitted_by.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-gray-900 font-medium">
                          {submission.authors.length} author{submission.authors.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 capitalize">
                        {submission.manuscript_type.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(submission.status)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {formatDate(submission.created_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedId(expandedId === submission.id ? null : submission.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                          title="View details"
                        >
                          <Eye size={18} />
                        </button>
                        {submission.files && (
                          <button
                            onClick={() => downloadFile(submission.id, submission.title, submission.files)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded transition"
                            title="Download manuscript"
                          >
                            <Download size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {expandedId && (
        <div className="bg-white rounded-lg shadow border p-6">
          {filteredSubmissions.find(s => s.id === expandedId) && (
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {filteredSubmissions.find(s => s.id === expandedId)?.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Submitted by {filteredSubmissions.find(s => s.id === expandedId)?.submitted_by.full_name} on{' '}
                    {formatDate(filteredSubmissions.find(s => s.id === expandedId)?.created_at || '')}
                  </p>
                </div>
                <button
                  onClick={() => setExpandedId(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Abstract</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {filteredSubmissions.find(s => s.id === expandedId)?.abstract}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Keywords</h4>
                  <p className="text-gray-700 text-sm">
                    {filteredSubmissions.find(s => s.id === expandedId)?.keywords}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">All Authors</h4>
                  <ul className="space-y-2">
                    {filteredSubmissions.find(s => s.id === expandedId)?.authors.map((author) => (
                      <li key={author.id} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="w-2 h-2 bg-blue-600 rounded-full" />
                        {author.full_name}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">File</h4>
                  {filteredSubmissions.find(s => s.id === expandedId)?.files ? (
                    <button
                      onClick={() => {
                        const sub = filteredSubmissions.find(s => s.id === expandedId);
                        if (sub) {
                          downloadFile(sub.id, sub.title, sub.files);
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                    >
                      <Download size={16} />
                      Download Manuscript
                    </button>
                  ) : (
                    <p className="text-gray-500 text-sm">No file uploaded</p>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t">
                <h4 className="font-semibold text-gray-900 mb-3">Corresponding Author</h4>
                <p className="text-gray-700">
                  {filteredSubmissions.find(s => s.id === expandedId)?.corresponding_author.full_name}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
          </div>
        </div>
      </main>
    </div>
  );
}
