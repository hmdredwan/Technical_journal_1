// src/components/admin/ManageReviewerApplications.tsx
'use client';

import { useState, useEffect, Fragment, useCallback } from 'react';
import { apiUrl } from '@/utils/api';
import { 
  UserCheck, CheckCircle, XCircle, AlertCircle, Eye, Loader2, 
  Download, Mail, User, Calendar, FileText, X, MessageSquare, BookOpen, Gavel
} from 'lucide-react';

type ReviewerApplication = {
  id: number;
  full_name?: string;
  applicant_name?: string;
  email?: string;
  applicant_email?: string;
  expertise?: string;
  affiliation?: string;
  motivation?: string;
  availability?: string;
  interests?: string;
  orcid?: string;
  google_scholar?: string;
  publications?: string;
  cv?: string;
  status?: string;
  submitted_at?: string;
  reviewed_at?: string;
  review_remarks?: string;
  reviewed_by_name?: string;
  [key: string]: unknown;
};

export default function ManageReviewerApplications() {
  const [applications, setApplications] = useState<ReviewerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedApp, setSelectedApp] = useState<ReviewerApplication | null>(null);
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [rejectTarget, setRejectTarget] = useState<ReviewerApplication | null>(null);
  const [confirmReject, setConfirmReject] = useState<ReviewerApplication | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const token = localStorage.getItem('access_token');

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('reviewer-applications/'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Failed to load: ${res.status}`);
      }

      const data = await res.json();
      setApplications(data);
    } catch (err) {
      console.error(err);
      setError('Could not load reviewer applications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage]);

  const totalPages = Math.max(1, Math.ceil(applications.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(applications.length, startIndex + rowsPerPage);
  const currentPageApplications = applications.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleAction = async (id: number, status: 'approved' | 'rejected') => {
    const actionKey = `${id}-${status}`;
    if (actionLoading[actionKey]) return;

    if (status === 'rejected' && !remarks.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }

    setActionLoading(prev => ({ ...prev, [actionKey]: true }));

    try {
      const res = await fetch(apiUrl(`reviewer-applications/${id}/`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          review_remarks: remarks.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to update application');
      }

      await fetchApplications();
      setSelectedApp(null);
      setRejectTarget(null);
      setRemarks('');
      alert(`Application ${status === 'approved' ? 'approved' : 'rejected'} successfully!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update application';
      alert(message);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const openRejectModal = (app: ReviewerApplication) => {
    setRejectTarget(app);
    setRemarks('');
  };

  const openConfirmReject = (app: ReviewerApplication) => {
    if (!remarks.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }
    setConfirmReject(app);
  };

  const viewDetails = (app: ReviewerApplication) => {
    setSelectedApp(selectedApp?.id === app.id ? null : app);
  };

  const getMediaUrl = (path?: string | null) => {
    if (!path) return '';

    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
      return path;
    }

    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return apiUrl(cleanPath);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <span className="ml-4 text-lg text-gray-600">Loading applications...</span>
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
          onClick={fetchApplications}
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
          <UserCheck className="text-green-600" size={32} />
          Reviewer Applications
        </h2>
        <button
          onClick={fetchApplications}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          <Loader2 size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {applications.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <UserCheck className="mx-auto mb-4 text-gray-400" size={64} />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No applications yet</h3>
          <p className="text-gray-500">New reviewer applications will appear here once submitted.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Name / Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Expertise</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Affiliation</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Submitted</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentPageApplications.map(app => (
                  <tr key={app.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {app.full_name || app.applicant_name || 'Guest Applicant'}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Mail size={14} />
                        {app.email || app.applicant_email || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
                      {app.expertise?.substring(0, 80)}{(app.expertise?.length ?? 0) > 80 ? '...' : ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {app.affiliation}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(app.status ?? 'pending')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(app.submitted_at ?? Date.now()).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <button
                          onClick={() => viewDetails(app)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>

                        {app.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAction(app.id, 'approved')}
                              disabled={actionLoading[`${app.id}-approved`]}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-green-600 hover:bg-green-50 hover:text-green-800 disabled:opacity-50"
                              title="Approve"
                            >
                              {actionLoading[`${app.id}-approved`] ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <CheckCircle size={18} />
                              )}
                            </button>
                            <button
                              onClick={() => openRejectModal(app)}
                              disabled={actionLoading[`${app.id}-rejected`]}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-red-600 hover:bg-red-50 hover:text-red-800 disabled:opacity-50"
                              title="Reject"
                            >
                              {actionLoading[`${app.id}-rejected`] ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <XCircle size={18} />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y">
            {currentPageApplications.map(app => (
              <Fragment key={app.id}>
                <div className="p-6 hover:bg-gray-50 transition space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="pr-4">
                      <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">
                        {app.full_name || app.applicant_name || 'Guest Applicant'}
                      </h3>
                      <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Mail size={14} />
                        {app.email || app.applicant_email || 'N/A'}
                      </div>
                    </div>
                    {getStatusBadge(app.status ?? 'pending')}
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Expertise:</strong> {app.expertise?.substring(0, 100)}{(app.expertise?.length ?? 0) > 100 ? '...' : ''}</p>
                    <p><strong>Affiliation:</strong> {app.affiliation}</p>
                    <p><strong>Submitted:</strong> {new Date(app.submitted_at ?? Date.now()).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => viewDetails(app)}
                      className="flex-1 min-w-30 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                    >
                      <Eye size={18} />
                      View Details
                    </button>
                    
                    {app.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAction(app.id, 'approved')}
                          disabled={actionLoading[`${app.id}-approved`]}
                          className="flex-1 min-w-28 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
                        >
                          {actionLoading[`${app.id}-approved`] ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <CheckCircle size={18} />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => openRejectModal(app)}
                          disabled={actionLoading[`${app.id}-rejected`]}
                          className="flex-1 min-w-28 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          {actionLoading[`${app.id}-rejected`] ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <XCircle size={18} />
                          )}
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Mobile Details Modal */}
                {selectedApp && selectedApp.id === app.id && (
                  <div className="p-6 bg-gray-50 border-t lg:hidden">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">
                        Application Details - {selectedApp.full_name || selectedApp.applicant_name}
                      </h3>
                      <button
                        onClick={() => setSelectedApp(null)}
                        className="p-2 text-gray-600 hover:text-gray-900 rounded hover:bg-gray-200"
                      >
                        <X size={24} />
                      </button>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Full Name</p>
                          <p className="font-medium">{selectedApp.full_name || selectedApp.applicant_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-medium break-all">{selectedApp.email || selectedApp.applicant_email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Affiliation</p>
                          <p className="font-medium">{selectedApp.affiliation}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Expertise</p>
                          <p className="whitespace-pre-line">{selectedApp.expertise}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Motivation</p>
                          <p className="whitespace-pre-line">{selectedApp.motivation}</p>
                        </div>
                      </div>

                      {selectedApp.status === 'pending' && (
                        <div className="border-t pt-6">
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Remarks / Feedback (required for rejection)
                          </label>
                          <textarea
                            value={remarks}
                            onChange={e => setRemarks(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Provide feedback..."
                          />

                          <div className="mt-4 flex flex-col gap-3">
                            <button
                              onClick={() => handleAction(selectedApp.id, 'approved')}
                              disabled={actionLoading[`${selectedApp.id}-approved`]}
                              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {actionLoading[`${selectedApp.id}-approved`] ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <CheckCircle size={18} />
                              )}
                              Approve Application
                            </button>
                            <button
                              onClick={() => openConfirmReject(selectedApp)}
                              disabled={actionLoading[`${selectedApp.id}-rejected`] || !remarks.trim()}
                              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {actionLoading[`${selectedApp.id}-rejected`] ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <XCircle size={18} />
                              )}
                              Reject Application
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Fragment>
            ))}
          </div>

          {/* Pagination */}
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">
              Showing {startIndex + 1}–{endIndex} of {applications.length} applications
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span>Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={e => setRowsPerPage(Number(e.target.value))}
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
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="text-red-600" size={28} />
              <div>
                <h3 className="text-xl font-semibold">Reject Application</h3>
                <p className="text-sm text-gray-600 mt-2">
                  This action will permanently remove the application record for <strong>{rejectTarget.full_name || rejectTarget.applicant_name || rejectTarget.email}</strong>. The applicant will be able to submit a new application with the same email address afterward.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection remarks
              </label>
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Provide a reason for rejection..."
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setRejectTarget(null);
                  setRemarks('');
                }}
                className="px-4 py-2 bg-gray-100 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={() => handleAction(rejectTarget.id, 'rejected')}
                disabled={actionLoading[`${rejectTarget.id}-rejected`] || !remarks.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                {actionLoading[`${rejectTarget.id}-rejected`] ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  'Reject Application'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal (from details view) */}
      {confirmReject && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="text-red-600" size={28} />
              <div>
                <h3 className="text-xl font-semibold">Confirm Rejection</h3>
                <p className="text-sm text-gray-600 mt-2">
                  This action will permanently remove the application record for <strong>{confirmReject.full_name || confirmReject.applicant_name || confirmReject.email}</strong>. The applicant will be able to submit a new application with the same email address afterward.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmReject(null)}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  handleAction(confirmReject.id, 'rejected');
                  setConfirmReject(null);
                }}
                disabled={actionLoading[`${confirmReject.id}-rejected`]}
                className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 hover:bg-red-700"
              >
                {actionLoading[`${confirmReject.id}-rejected`] ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  'OK'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/60 items-center justify-center z-50 p-4 overflow-y-auto hidden lg:flex">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <UserCheck size={28} className="text-green-600" />
                Reviewer Application Details
              </h3>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X size={28} className="text-gray-600" />
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-8">
              {/* Applicant Info */}
              <section className="bg-gray-50 p-6 rounded-xl border">
                <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User size={20} className="text-gray-700" />
                  Applicant Information
                </h4>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600">Full Name</p>
                    <p className="font-medium">{selectedApp.full_name || selectedApp.applicant_name || 'Guest'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium break-all">
                      {selectedApp.email || selectedApp.applicant_email || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Affiliation</p>
                    <p className="font-medium">{selectedApp.affiliation}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">ORCID iD</p>
                    <p className="font-medium">{selectedApp.orcid || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">Google Scholar</p>
                    {selectedApp.google_scholar ? (
                      <a
                        href={selectedApp.google_scholar}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all"
                      >
                        {selectedApp.google_scholar}
                      </a>
                    ) : (
                      <p className="text-gray-500">N/A</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Expertise & Availability */}
              <section>
                <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText size={20} className="text-gray-700" />
                  Expertise & Availability
                </h4>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600">Expertise</p>
                    <p className="whitespace-pre-line">{selectedApp.expertise}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Availability</p>
                    <p>{selectedApp.availability} reviews per year</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">Research Interests</p>
                    <p className="whitespace-pre-line">{selectedApp.interests || 'Not provided'}</p>
                  </div>
                </div>
              </section>

              {/* Motivation */}
              <section>
                <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare size={20} className="text-gray-700" />
                  Motivation Statement
                </h4>
                <p className="whitespace-pre-line text-gray-700 border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded-r">
                  {selectedApp.motivation}
                </p>
              </section>

              {/* Publications */}
              {selectedApp.publications && (
                <section>
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BookOpen size={20} className="text-gray-700" />
                    Key Publications
                  </h4>
                  <p className="whitespace-pre-line text-gray-700">{selectedApp.publications}</p>
                </section>
              )}

              {/* CV Download */}
              {selectedApp.cv && (
                <section>
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Download size={20} className="text-gray-700" />
                    Curriculum Vitae
                  </h4>
                  <a
                    href={getMediaUrl(selectedApp.cv)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow"
                  >
                    <Download size={18} />
                    Download CV
                  </a>
                </section>
              )}

              {/* Admin Actions - only show if pending */}
              {selectedApp.status === 'pending' && (
                <section className="border-t pt-8">
                  <h4 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <Gavel size={24} className="text-indigo-600" />
                    Review & Decide
                  </h4>

                  <div className="bg-gray-50 p-6 rounded-xl border">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Remarks / Feedback (required for rejection)
                    </label>
                    <textarea
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., Strong background in river ecology. Welcome to the reviewer team! OR Please provide more recent publications..."
                    />

                    <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-end">
                      <button
                        onClick={() => handleAction(selectedApp.id, 'approved')}
                        disabled={actionLoading[`${selectedApp.id}-approved`]}
                        className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center justify-center gap-2 min-w-40 disabled:opacity-50"
                      >
                        {actionLoading[`${selectedApp.id}-approved`] ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <CheckCircle size={18} />
                        )}
                        Approve Application
                      </button>

                      <button
                        onClick={() => openConfirmReject(selectedApp)}
                        disabled={actionLoading[`${selectedApp.id}-rejected`] || !remarks.trim()}
                        className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition flex items-center justify-center gap-2 min-w-40 disabled:opacity-50"
                      >
                        {actionLoading[`${selectedApp.id}-rejected`] ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <XCircle size={18} />
                        )}
                        Reject Application
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* Review Info */}
              {(selectedApp.reviewed_at || selectedApp.review_remarks) && (
                <section className="border-t pt-8">
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calendar size={20} className="text-gray-700" />
                    Review Information
                  </h4>
                  <div className="bg-gray-50 p-6 rounded-xl border">
                    {selectedApp.reviewed_by_name && (
                      <p className="mb-2">
                        <strong>Reviewed by:</strong> {selectedApp.reviewed_by_name}
                      </p>
                    )}
                    {selectedApp.reviewed_at && (
                      <p className="mb-4">
                        <strong>Reviewed on:</strong> {new Date(selectedApp.reviewed_at).toLocaleString()}
                      </p>
                    )}
                    {selectedApp.review_remarks && (
                      <div>
                        <strong>Remarks:</strong>
                        <p className="mt-2 whitespace-pre-line text-gray-700 border-l-4 border-gray-400 pl-4 py-2 bg-gray-100 rounded-r">
                          {selectedApp.review_remarks}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}