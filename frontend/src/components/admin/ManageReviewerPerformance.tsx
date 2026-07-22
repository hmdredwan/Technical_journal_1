// src/components/admin/ManageReviewerPerformance.tsx
'use client';

import { useState, useEffect, Fragment } from 'react';
import { apiUrl } from '@/utils/api';
import { 
  CheckCircle, Clock, Users, FileText, Loader2, AlertCircle, X, Eye 
} from 'lucide-react';

interface ReviewerPerformance {
  id: number;
  full_name: string;
  email: string;
  total_assigned: number;
  completed_reviews: number;
  rejected_reviews: number;
  pending_reviews: number;
  timely_reviews: number;
  late_reviews: number;
  average_completion_days: number;
  completion_rate: number;
  timely_rate: number;
}

export default function ManageReviewerPerformance() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewers, setReviewers] = useState<ReviewerPerformance[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedReviewer, setSelectedReviewer] = useState<ReviewerPerformance | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalReviewers: 0,
    totalReviews: 0,
    averageCompletionRate: 0,
    averageTimelyRate: 0,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchReviewerPerformance(token);
      fetchReviewAssignments(token);
    } else {
      setLoading(false);
      setError('Session expired. Please login again.');
    }
  }, []);

  const fetchReviewerPerformance = async (accessToken: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(apiUrl('reviewer-performance/'), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch reviewer performance: ${response.status}`);
      }

      const data = await response.json();

      setReviewers(data.reviewers || []);
      setStats(data.stats || {
        totalReviewers: 0,
        totalReviews: 0,
        averageCompletionRate: 0,
        averageTimelyRate: 0,
      });
    } catch (err: unknown) {
      console.error('Error fetching reviewer performance:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewAssignments = async (accessToken: string) => {
    try {
      const response = await fetch(apiUrl('review-assignments/'), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch assignment details: ${response.status}`);
      }

      const data = await response.json();
      setAssignments(Array.isArray(data) ? data : data.results || []);
    } catch (err: unknown) {
      console.error('Error fetching review assignments:', err);
    }
  };

  const openReviewerDetails = (reviewer: ReviewerPerformance) => {
    setSelectedReviewer(reviewer);
    setModalOpen(true);
  };

  const getManuscriptId = (item: any) => {
    return item?.submission_code || item?.manuscript_id || item?.submission?.submission_code || 'Not generated yet';
  };

  const closeReviewerDetails = () => {
    setModalOpen(false);
    setSelectedReviewer(null);
  };

  const reviewerAssignments = selectedReviewer
    ? assignments.filter((item) => item.assigned_to === selectedReviewer.id)
    : [];

  const getPerformanceColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBadge = (rate: number) => {
    if (rate >= 90) return 'Excellent';
    if (rate >= 80) return 'Good';
    if (rate >= 70) return 'Average';
    return 'Needs Improvement';
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(reviewers.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(reviewers.length, startIndex + rowsPerPage);
  const currentPageReviewers = reviewers.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [reviewers, rowsPerPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <span className="ml-4 text-lg text-gray-600">Loading reviewer performance...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-8 rounded-xl text-center max-w-3xl mx-auto">
        <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
        <h3 className="text-xl font-semibold mb-3">Error</h3>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
          <CheckCircle className="text-green-600" size={32} />
          Reviewer Performance
        </h2>
        <button
          onClick={() => {
            const token = localStorage.getItem('access_token');
            if (token) fetchReviewerPerformance(token);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          <Loader2 size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Reviewers</p>
              <h4 className="mt-3 text-4xl font-bold text-gray-900">{stats.totalReviewers}</h4>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users size={28} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Reviews</p>
              <h4 className="mt-3 text-4xl font-bold text-gray-900">{stats.totalReviews}</h4>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <FileText size={28} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Avg Completion Rate</p>
              <h4 className="mt-3 text-4xl font-bold text-gray-900">
                {stats.averageCompletionRate.toFixed(1)}%
              </h4>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <CheckCircle size={28} className="text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Avg Timely Rate</p>
              <h4 className="mt-3 text-4xl font-bold text-gray-900">
                {stats.averageTimelyRate.toFixed(1)}%
              </h4>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <Clock size={28} className="text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Performance Table Section */}
      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Individual Reviewer Performance</h3>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full w-full table-fixed divide-y divide-gray-200"> 
            <colgroup>
              <col style={{ width: '18%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Reviewer</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Assigned</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Completed</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Rejected</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Pending</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Timely / Completed</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Completion Rate</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Timely Rate</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Avg Days</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentPageReviewers.map((reviewer) => (
                <tr key={reviewer.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 align-top break-words whitespace-normal overflow-wrap-anywhere min-w-0 w-full max-w-full">
                    <button
                      type="button"
                      onClick={() => openReviewerDetails(reviewer)}
                      className="group text-left rounded-lg border border-transparent px-2 py-1 -mx-2 -my-1 transition hover:border-blue-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <div className="font-semibold text-gray-900 group-hover:text-blue-700">{reviewer.full_name}</div>
                      <div className="text-sm text-gray-500 mt-1">{reviewer.email}</div>
                      <div className="mt-1 text-xs font-medium text-blue-600 underline decoration-dotted underline-offset-2">Click to view assigned manuscripts</div>
                    </button>
                  </td>
                  <td className="px-6 py-4 align-top text-sm font-medium text-gray-900 break-words whitespace-normal overflow-wrap-anywhere min-w-0">{reviewer.total_assigned}</td>
                  <td className="px-6 py-4 align-top text-sm font-medium text-green-600 break-words whitespace-normal overflow-wrap-anywhere min-w-0">{reviewer.completed_reviews}</td>
                  <td className="px-6 py-4 align-top text-sm font-medium text-red-600 break-words whitespace-normal overflow-wrap-anywhere min-w-0">{reviewer.rejected_reviews}</td>
                  <td className="px-6 py-4 align-top text-sm font-medium text-yellow-600 break-words whitespace-normal overflow-wrap-anywhere min-w-0">{reviewer.pending_reviews}</td>
                  <td className="px-6 py-4 align-top text-sm text-gray-900 break-words whitespace-normal overflow-wrap-anywhere min-w-0">
                    {reviewer.timely_reviews} / {reviewer.completed_reviews}
                  </td>
                  <td className={`px-6 py-4 align-top text-sm font-semibold break-words whitespace-normal overflow-wrap-anywhere min-w-0 ${getPerformanceColor(reviewer.completion_rate)}`}>
                    {reviewer.completion_rate.toFixed(1)}%
                  </td>
                  <td className={`px-6 py-4 align-top text-sm font-semibold break-words whitespace-normal overflow-wrap-anywhere min-w-0 ${getPerformanceColor(reviewer.timely_rate)}`}>
                    {reviewer.timely_rate.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 align-top text-sm text-gray-900 break-words whitespace-normal overflow-wrap-anywhere min-w-0">
                    {reviewer.average_completion_days.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 align-top break-words whitespace-normal overflow-wrap-anywhere min-w-0">
                    <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                      reviewer.completion_rate >= 90 && reviewer.timely_rate >= 80
                        ? 'bg-green-100 text-green-800'
                        : reviewer.completion_rate >= 70 && reviewer.timely_rate >= 60
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {getPerformanceBadge(Math.min(reviewer.completion_rate, reviewer.timely_rate))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden divide-y">
          {currentPageReviewers.map((reviewer) => (
            <Fragment key={reviewer.id}>
              <div className="p-6 space-y-5">
                <div className="flex justify-between items-start">
                  <div>
                    <button
                      type="button"
                      onClick={() => openReviewerDetails(reviewer)}
                      className="group text-left rounded-lg border border-transparent px-2 py-1 -mx-2 -my-1 transition hover:border-blue-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <div className="font-semibold text-lg text-gray-900 group-hover:text-blue-700">{reviewer.full_name}</div>
                      <div className="text-sm text-gray-500 mt-1">{reviewer.email}</div>
                      <div className="mt-1 text-xs font-medium text-blue-600 underline decoration-dotted underline-offset-2">Click to view assigned manuscripts</div>
                    </button>
                  </div>
                  <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                    reviewer.completion_rate >= 90 && reviewer.timely_rate >= 80
                      ? 'bg-green-100 text-green-800'
                      : reviewer.completion_rate >= 70 && reviewer.timely_rate >= 60
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {getPerformanceBadge(Math.min(reviewer.completion_rate, reviewer.timely_rate))}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-gray-500 text-xs">Assigned</p>
                    <p className="font-semibold text-xl mt-1">{reviewer.total_assigned}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-gray-500 text-xs">Completed</p>
                    <p className="font-semibold text-xl mt-1 text-green-600">{reviewer.completed_reviews}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-gray-500 text-xs">Rejected</p>
                    <p className="font-semibold text-xl mt-1 text-red-600">{reviewer.rejected_reviews}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-gray-500 text-xs">Pending</p>
                    <p className="font-semibold text-xl mt-1 text-yellow-600">{reviewer.pending_reviews}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-gray-500 text-xs">Completion Rate</p>
                    <p className={`font-semibold text-xl mt-1 ${getPerformanceColor(reviewer.completion_rate)}`}>
                      {reviewer.completion_rate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-gray-500 text-xs">Timely Rate</p>
                    <p className={`font-semibold text-xl mt-1 ${getPerformanceColor(reviewer.timely_rate)}`}>
                      {reviewer.timely_rate.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl text-sm">
                  <p className="text-gray-500 text-xs">Average Completion Days</p>
                  <p className="font-semibold text-xl mt-1">{reviewer.average_completion_days.toFixed(1)}</p>
                </div>
              </div>
            </Fragment>
          ))}
        </div>

        {/* Pagination */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            Showing {startIndex + 1}–{endIndex} of {reviewers.length} reviewers
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-100"
              >
                Previous
              </button>
              <span className="text-gray-700">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {reviewers.length === 0 && (
          <div className="text-center py-16">
            <Users size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 text-lg">No reviewer performance data available yet.</p>
          </div>
        )}
      </div>

      {modalOpen && selectedReviewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <p className="text-sm text-gray-500">Assigned manuscripts</p>
                <h3 className="text-xl font-semibold text-gray-900">{selectedReviewer.full_name}</h3>
                <p className="text-sm text-gray-600">{selectedReviewer.email}</p>
              </div>
              <button
                type="button"
                onClick={closeReviewerDetails}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Close reviewer details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto px-6 py-6">
              {reviewerAssignments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-gray-600">
                  No manuscripts are currently assigned to this reviewer.
                </div>
              ) : (
                <div className="space-y-4">
                  {reviewerAssignments.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-sm text-indigo-700 font-semibold">
                            <Eye size={16} />
                            Manuscript ID: {getManuscriptId(item)}
                          </div>
                          <h4 className="mt-2 text-lg font-semibold text-gray-900">{item.submission_title || 'Untitled manuscript'}</h4>
                          <p className="mt-1 text-sm text-gray-600">{item.submission_abstract || 'No abstract provided.'}</p>
                        </div>
                        <span className="inline-flex w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">{item.status_display || item.status}</span>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm text-gray-700 md:grid-cols-2">
                        <div className="rounded-xl bg-white p-3 border border-gray-200">
                          <p className="text-gray-500 text-xs uppercase tracking-wide">Due date</p>
                          <p className="mt-1 font-medium">{item.due_date ? new Date(item.due_date).toLocaleDateString() : 'Not set'}</p>
                        </div>
                        <div className="rounded-xl bg-white p-3 border border-gray-200">
                          <p className="text-gray-500 text-xs uppercase tracking-wide">Invitation response</p>
                          <p className="mt-1 font-medium">{item.invite_response_display || item.invite_response || 'Pending'}</p>
                        </div>
                        <div className="rounded-xl bg-white p-3 border border-gray-200 md:col-span-2">
                          <p className="text-gray-500 text-xs uppercase tracking-wide">Recommendation</p>
                          <p className="mt-1 font-medium">{item.recommendation || 'Pending'}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}