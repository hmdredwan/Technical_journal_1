// src/components/admin/ManageSubmissions.tsx
'use client';

import { useState, useEffect, Fragment } from 'react';
import { 
  Search, X, Eye, Download, FileText, Save, AlertCircle, 
  Clock, CheckCircle, XCircle, RefreshCw, Info 
} from 'lucide-react';
import { apiUrl } from '@/utils/api';

interface Submission {
  id: number;
  submission_code?: string | null;
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
  current_status: string;
  created_at: string;
  latest_version?: {
    id: number;
    version_number: number;
    version_type: string;
    file: string | null;
    created_at: string;
  } | null;
  versions?: Array<{
    id: number;
    version_number: number;
    version_type: string;
    file: string | null;
    revision_note?: string;
    created_at: string;
  }>;
  // New fields
  manual_authors?: string;
  conflict_of_interest?: string;
  acknowledgement?: string;
}

interface ManageSubmissionsProps {
  apiEndpoint?: string;
  role?: 'admin' | 'editor';
}

export default function ManageSubmissions({ apiEndpoint = 'submissions/', role = 'admin' }: ManageSubmissionsProps) {
  const isEditor = role === 'editor';
  const canEdit = role === 'admin' || role === 'editor';

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedPreviewId, setExpandedPreviewId] = useState<number | null>(null);
  const [statusChanges, setStatusChanges] = useState<{ [key: number]: string }>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const [deskDecision, setDeskDecision] = useState<{ [key: number]: string }>({});
  const [deskRemarks, setDeskRemarks] = useState<{ [key: number]: string }>({});
  const [finalDecision, setFinalDecision] = useState<{ [key: number]: string }>({});
  const [finalRemarks, setFinalRemarks] = useState<{ [key: number]: string }>({});
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const token = localStorage.getItem('access_token');

  useEffect(() => {
    if (!token) return;

    const fetchSubmissions = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(apiUrl(apiEndpoint), {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Failed to load: ${res.status} - ${errText}`);
        }

        const data = await res.json();
        const subs = Array.isArray(data) ? data : data.results || [];
        setSubmissions(subs);
        setFilteredSubmissions(subs);
      } catch (err: any) {
        setError(err.message || 'Could not load submissions');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [token, apiEndpoint]);

  useEffect(() => {
    let result = [...submissions];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(sub =>
        sub.submission_code?.toLowerCase().includes(q) ||
        sub.title.toLowerCase().includes(q) ||
        sub.submitted_by?.full_name?.toLowerCase().includes(q) ||
        sub.submitted_by?.email?.toLowerCase().includes(q) ||
        sub.keywords?.toLowerCase().includes(q)
      );
    }

    if (selectedStatus !== 'all') {
      result = result.filter(sub => sub.current_status === selectedStatus);
    }

    if (selectedType) {
      result = result.filter(sub => sub.manuscript_type === selectedType);
    }

    setFilteredSubmissions(result);
  }, [submissions, searchQuery, selectedStatus, selectedType]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus, selectedType, rowsPerPage]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedType('');
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      submitted:         { bg: 'bg-blue-100',   text: 'text-blue-800'   },
      desk_review:       { bg: 'bg-purple-100', text: 'text-purple-800' },
      under_review:      { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      revision_requested:{ bg: 'bg-orange-100', text: 'text-orange-800' },
      accepted:          { bg: 'bg-green-100',  text: 'text-green-800'  },
      rejected:          { bg: 'bg-red-100',    text: 'text-red-800'    },
    };

    const style = colors[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const formatVersionType = (versionType?: string) => {
    const vt = (versionType || '').toLowerCase();
    if (vt === 'initial') return 'Initial Submission';
    if (vt === 'minor_revision') return 'Minor Revision';
    if (vt === 'major_revision') return 'Major Revision';
    if (vt === 'editor_update') return 'Editorial Update';
    return versionType ? versionType.replace('_', ' ') : 'Unknown';
  };

  const getFileUrl = (filePath: string | null) => {
    if (!filePath) return '';

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
    const backendOrigin = apiBase.startsWith('http') ? apiBase.replace(/\/api\/?$/, '') : '';

    let clean = filePath
      .replace(/^https?:\/\/[^/]+\/?/, '')
      .replace(/^\//, '')
      .trim();

    if (clean.startsWith('api/')) {
      clean = clean.replace(/^api\//, '');
    }

    if (!clean.startsWith('media/')) {
      clean = `media/${clean}`;
    }

    const normalizedPath = `/${clean}`;
    return backendOrigin ? `${backendOrigin}${normalizedPath}` : normalizedPath;
  };

  const getFileExtension = (filePath: string) => {
    const withoutQuery = filePath.split('?')[0] || filePath;
    const parts = withoutQuery.split('.');
    return (parts.length > 1 ? parts[parts.length - 1] : '').toLowerCase().trim();
  };

  const isPdfFile = (filePath: string) => getFileExtension(filePath) === 'pdf';
  const isWordFile = (filePath: string) => {
    const ext = getFileExtension(filePath);
    return ext === 'doc' || ext === 'docx';
  };

  const getAbsoluteFileUrl = (filePath: string) => {
    const relativeUrl = getFileUrl(filePath);
    if (typeof window === 'undefined') return relativeUrl;
    return new URL(relativeUrl, window.location.origin).href;
  };

  const getOfficeViewerUrl = (filePath: string) =>
    `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(getAbsoluteFileUrl(filePath))}`;

  const getPreviewFile = (sub: Submission) => {
    return (sub.latest_version?.file || sub.files || null) as string | null;
  };

  const formatAuthorName = (submitted_by: any) => {
    if (!submitted_by) return 'Unknown';
    if (typeof submitted_by === 'object') {
      return submitted_by.full_name || submitted_by.email || (submitted_by.id ? `User#${submitted_by.id}` : 'Unknown');
    }
    return String(submitted_by);
  };

  const togglePreview = (id: number) => {
    setExpandedPreviewId(expandedPreviewId === id ? null : id);
  };

  const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(filteredSubmissions.length, startIndex + rowsPerPage);
  const currentPageSubmissions = filteredSubmissions.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const downloadFile = (filePath: string, title: string) => {
    if (!filePath) {
      alert('No file available to download');
      return;
    }

    const url = getFileUrl(filePath);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title || 'manuscript'}.${filePath.split('.').pop() || 'pdf'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStatusChange = (submissionId: number, newStatus: string) => {
    setStatusChanges(prev => ({
      ...prev,
      [submissionId]: newStatus,
    }));
  };

  const saveStatus = async (submission: Submission) => {
    const newStatus = statusChanges[submission.id];
    if (!newStatus || newStatus === (submission.current_status || submission.status)) return;

    setSavingId(submission.id);
    setError('');

    try {
      const res = await fetch(apiUrl(`submissions/${submission.id}/`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_status: newStatus,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.current_status?.[0] || 'Failed to update status');
      }

      setSubmissions(prev =>
        prev.map(s =>
          s.id === submission.id ? { ...s, current_status: newStatus } : s
        )
      );
      setFilteredSubmissions(prev =>
        prev.map(s =>
          s.id === submission.id ? { ...s, current_status: newStatus } : s
        )
      );

      setStatusChanges(prev => {
        const updated = { ...prev };
        delete updated[submission.id];
        return updated;
      });

      alert(`Status updated to "${newStatus}" for "${submission.title}"`);
    } catch (err: any) {
      setError(`Failed to update "${submission.title}": ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const applyDeskReview = async (submission: Submission) => {
    if (!token) {
      setError('Authentication token missing');
      return;
    }

    const statusValue = deskDecision[submission.id] || 'passed';
    const remarksValue = (deskRemarks[submission.id] || '').trim();

    if (!remarksValue) {
      setError('Please add desk review remarks before submitting.');
      return;
    }

    setActionLoadingId(submission.id);
    setError('');

    try {
      const res = await fetch(apiUrl(`submissions/${submission.id}/desk-review/`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          desk_review_status: statusValue,
          desk_review_remarks: remarksValue,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to update desk review status');
      }

      setDeskRemarks(prev => ({ ...prev, [submission.id]: '' }));
      setDeskDecision(prev => ({ ...prev, [submission.id]: statusValue }));
      setActionLoadingId(null);
      alert('Desk review updated successfully and author notified.');
      setTimeout(() => window.location.reload(), 500);
    } catch (err: any) {
      setError(err.message || 'Desk review update failed.');
      setActionLoadingId(null);
    }
  };

  const applyFinalDecision = async (submission: Submission) => {
    if (!token) {
      setError('Authentication token missing');
      return;
    }

    const decisionValue = finalDecision[submission.id] || 'accept';
    const remarksValue = (finalRemarks[submission.id] || '').trim();

    if (!remarksValue) {
      setError('Please add decision remarks before submitting.');
      return;
    }

    setActionLoadingId(submission.id);
    setError('');

    try {
      const res = await fetch(apiUrl(`submissions/${submission.id}/final-decision/`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          final_decision: decisionValue,
          decision_remarks: remarksValue,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to submit final decision');
      }

      setFinalRemarks(prev => ({ ...prev, [submission.id]: '' }));
      setFinalDecision(prev => ({ ...prev, [submission.id]: decisionValue }));
      setActionLoadingId(null);
      alert('Final decision submitted successfully and author notified.');
      setTimeout(() => window.location.reload(), 500);
    } catch (err: any) {
      setError(err.message || 'Final decision submission failed.');
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-lg text-gray-600">Loading submissions...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 px-4 sm:px-6 lg:px-8">
      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow border">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="relative col-span-full lg:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search title, author, email, keywords..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="desk_review">Desk Review</option>
              <option value="under_review">Under Review</option>
              <option value="revision_requested">Revision Requested</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="original-research">Original Research</option>
              <option value="review">Review</option>
              <option value="short-communication">Short Communication</option>
              <option value="case-study">Case Study</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full sm:w-auto px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center justify-center gap-2"
            >
              <X size={18} />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow border text-center">
          <p className="text-gray-600 text-sm">Total</p>
          <p className="text-3xl font-bold text-blue-700 mt-2">{submissions.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border text-center">
          <p className="text-gray-600 text-sm">Submitted</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {submissions.filter(s => s.current_status === 'submitted').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border text-center">
          <p className="text-gray-600 text-sm">Under Review</p>
          <p className="text-3xl font-bold text-yellow-600 mt-2">
            {submissions.filter(s => ['desk_review', 'under_review'].includes(s.current_status || '')).length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border text-center">
          <p className="text-gray-600 text-sm">Accepted</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {submissions.filter(s => s.current_status === 'accepted').length}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Submissions */}
      {filteredSubmissions.length === 0 ? (
        <div className="bg-white rounded-xl shadow border p-12 text-center">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-lg text-gray-600">No submissions found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow border overflow-x-auto max-w-full">
          {/* Desktop Table */}
          <div className="hidden xl:block">
            <table className="w-full min-w-0 table-fixed border-collapse">
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[16%]" />
                <col className="w-[14%]" />
                <col className="w-[10%]" />
                <col className="w-[18%]" />
                <col className="w-[10%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  <th className="w-[24%] px-6 py-4 text-left text-sm font-semibold text-gray-900 align-top">ID & Title</th>
                  <th className="w-[16%] px-6 py-4 text-left text-sm font-semibold text-gray-900 align-top">Submitted By</th>
                  <th className="w-[14%] px-6 py-4 text-left text-sm font-semibold text-gray-900 align-top">Authors</th>
                  <th className="w-[10%] px-6 py-4 text-left text-sm font-semibold text-gray-900 align-top">Type</th>
                  <th className="w-[18%] px-6 py-4 text-left text-sm font-semibold text-gray-900 align-top">Current Status</th>
                  <th className="w-[10%] px-6 py-4 text-left text-sm font-semibold text-gray-900 align-top">Date</th>
                  <th className="w-[8%] px-6 py-4 text-left text-sm font-semibold text-gray-900 align-top">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentPageSubmissions.map(sub => {
                  const pending = statusChanges[sub.id];
                  const displayStatus = pending || sub.current_status || sub.status || 'submitted';
                  const isPreviewOpen = expandedPreviewId === sub.id;

                  return (
                    <Fragment key={sub.id}>
                      <tr className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 align-top break-words whitespace-normal">
                          <p className="font-medium text-gray-900 break-words whitespace-normal">{sub.title}</p>
                          {sub.submission_code && (
                            <p className="text-xs text-blue-700 font-semibold mt-1">{sub.submission_code}</p>
                          )}
                          {sub.latest_version && (
                            <p className="text-xs text-indigo-700 mt-1">
                              Current Working Version: V{sub.latest_version.version_number} ({formatVersionType(sub.latest_version.version_type)})
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 align-top break-words whitespace-normal">
                          <div>
                          <p className="font-medium break-words whitespace-normal">{formatAuthorName(sub.submitted_by)}</p>
                          <p className="text-sm text-gray-600 break-words whitespace-normal">{typeof sub.submitted_by === 'object' ? sub.submitted_by?.email || '-' : '-'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top text-sm text-gray-700 break-words whitespace-normal">
                          {sub.authors?.length || 0} registered + {sub.manual_authors ? 'manual' : 'no manual'}
                          <div className="text-xs text-gray-500 mt-1">
                            Versions: {sub.versions?.length || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top capitalize text-sm text-gray-700 break-words whitespace-normal">
                          {sub.manuscript_type?.replace('-', ' ') || 'N/A'}
                        </td>
                        <td className="px-6 py-4 align-top break-words whitespace-normal overflow-wrap-anywhere">
                          {canEdit ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <select
                                value={displayStatus}
                                onChange={e => handleStatusChange(sub.id, e.target.value)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium border min-w-[140px] ${
                                  pending ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
                                }`}
                              >
                                <option value="submitted">Submitted</option>
                                <option value="desk_review">Desk Review</option>
                                <option value="under_review">Under Review</option>
                                <option value="revision_requested">Revision Requested</option>
                                <option value="accepted">Accepted</option>
                                <option value="rejected">Rejected</option>
                              </select>

                              {(pending || savingId === sub.id) && (
                                <button
                                  onClick={() => saveStatus(sub)}
                                  disabled={savingId === sub.id}
                                  className={`p-2 rounded-full transition ${
                                    savingId === sub.id
                                      ? 'bg-gray-200 cursor-wait'
                                      : pending
                                      ? 'bg-green-100 hover:bg-green-200'
                                      : 'bg-green-50 hover:bg-green-100'
                                  }`}
                                  title={savingId === sub.id ? 'Saving...' : pending ? 'Save change' : 'Save'}
                                >
                                  {savingId === sub.id ? (
                                    <RefreshCw size={18} className="animate-spin text-gray-600" />
                                  ) : (
                                    <Save size={18} className={pending ? 'text-green-700' : 'text-green-500'} />
                                  )}
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div>{getStatusBadge(sub.current_status || sub.status)}</div>

                              <div className="border p-3 rounded-lg bg-gray-50">
                                <p className="text-xs font-semibold text-gray-600 mb-1">Desk Review</p>
                                <select
                                  value={deskDecision[sub.id] || 'passed'}
                                  onChange={e => setDeskDecision(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                  className="w-full px-2 py-1 border rounded mb-2"
                                >
                                  <option value="passed">Pass to Peer Review</option>
                                  <option value="desk_rejected">Desk Reject</option>
                                </select>
                                <textarea
                                  value={deskRemarks[sub.id] || ''}
                                  onChange={e => setDeskRemarks(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                  placeholder="Desk review remarks"
                                  className="w-full px-2 py-1 border rounded mb-2 text-sm"
                                  rows={2}
                                />
                                <button
                                  onClick={() => applyDeskReview(sub)}
                                  disabled={actionLoadingId === sub.id}
                                  className="w-full px-3 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition disabled:opacity-60"
                                >
                                  {actionLoadingId === sub.id ? 'Updating...' : 'Apply Desk Review'}
                                </button>
                              </div>

                              <div className="border p-3 rounded-lg bg-gray-50">
                                <p className="text-xs font-semibold text-gray-600 mb-1">Final Decision</p>
                                <select
                                  value={finalDecision[sub.id] || 'accept'}
                                  onChange={e => setFinalDecision(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                  className="w-full px-2 py-1 border rounded mb-2"
                                >
                                  <option value="accept">Accept</option>
                                  <option value="minor_revision">Minor Revision</option>
                                  <option value="major_revision">Major Revision</option>
                                  <option value="reject">Reject</option>
                                </select>
                                <textarea
                                  value={finalRemarks[sub.id] || ''}
                                  onChange={e => setFinalRemarks(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                  placeholder="Decision remarks"
                                  className="w-full px-2 py-1 border rounded mb-2 text-sm"
                                  rows={2}
                                />
                                <button
                                  onClick={() => applyFinalDecision(sub)}
                                  disabled={actionLoadingId === sub.id}
                                  className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition disabled:opacity-60"
                                >
                                  {actionLoadingId === sub.id ? 'Updating...' : 'Apply Final Decision'}
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 align-top text-sm text-gray-600 break-words whitespace-normal">
                          {formatDate(sub.created_at)}
                        </td>
                        <td className="px-6 py-4 align-top break-words whitespace-normal">
                          <div className="flex items-center gap-3 flex-wrap">
                            <button
                              onClick={() => togglePreview(sub.id)}
                              className={`p-2 rounded ${isPreviewOpen ? 'text-indigo-700 bg-indigo-100' : 'text-indigo-600 hover:bg-indigo-50'}`}
                              title={isPreviewOpen ? "Close Preview" : "View Full Details & Manuscript"}
                            >
                              <Eye size={18} />
                            </button>
                            {sub.files && (
                              <button
                                onClick={() => downloadFile(sub.files, sub.title)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded"
                                title="Download Manuscript"
                              >
                                <Download size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Full Details Preview */}
                      {isPreviewOpen && (
                        <tr>
                          <td colSpan={7} className="p-0 bg-gray-50">
                            <div className="p-6">
                              <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-semibold text-gray-900">
                                  Full Submission Details - {sub.title}
                                </h3>
                                <button
                                  onClick={() => setExpandedPreviewId(null)}
                                  className="p-2 text-gray-600 hover:text-gray-900 rounded hover:bg-gray-200"
                                >
                                  <X size={24} />
                                </button>
                              </div>

                              <div className="grid xl:grid-cols-2 gap-6 lg:gap-8 max-w-full">
                                {/* Left Column: Details */}
                                <div className="space-y-8 min-w-0">
                                  <section>
                                    <h4 className="font-semibold mb-2">Abstract</h4>
                                    <p className="text-gray-700 leading-relaxed">
                                      {sub.abstract || 'No abstract provided.'}
                                    </p>
                                  </section>

                                  {sub.keywords && (
                                    <section>
                                      <h4 className="font-semibold mb-2">Keywords</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {sub.keywords.split(',').map((kw: string, i: number) => (
                                          <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                                            {kw.trim()}
                                          </span>
                                        ))}
                                      </div>
                                    </section>
                                  )}

                                  <section>
                                    <h4 className="font-semibold mb-2">Version Timeline</h4>
                                    {sub.versions && sub.versions.length > 0 ? (
                                      <div className="space-y-3">
                                        {sub.versions.map((version: any) => (
                                          <div key={version.id} className="border rounded-lg p-3 bg-white">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                              <p className="font-medium text-gray-900">
                                                V{version.version_number} - {formatVersionType(version.version_type)}
                                              </p>
                                              <span className="text-xs text-gray-500">
                                                {formatDate(version.created_at)}
                                              </span>
                                            </div>
                                            {version.revision_note && (
                                              <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">
                                                {version.revision_note}
                                              </p>
                                            )}
                                            {version.file && (
                                              <div className="mt-2">
                                                <a
                                                  href={getFileUrl(version.file)}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-sm text-blue-600 hover:underline"
                                                >
                                                  View this version file
                                                </a>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-gray-500 text-sm">No version history available yet.</p>
                                    )}
                                  </section>

                                  {/* Authors - Registered + Manual */}
                                  <section>
                                    <h4 className="font-semibold mb-2">Authors</h4>
                                    <div className="space-y-4">
                                      {sub.authors?.length > 0 ? (
                                        <div>
                                          <p className="text-sm text-gray-600 mb-1">Registered Authors:</p>
                                          <ul className="space-y-2">
                                            {sub.authors.map((a: any, i: number) => (
                                              <li key={i} className="text-gray-700">
                                                • {a.full_name}
                                                {sub.corresponding_author?.id === a.id && (
                                                  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                                    Corresponding
                                                  </span>
                                                )}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      ) : null}

                                      {sub.manual_authors && (
                                        <div>
                                          <p className="text-sm text-gray-600 mb-1">Additional/Manual Authors:</p>
                                          <p className="text-gray-700 whitespace-pre-line">
                                            {sub.manual_authors}
                                          </p>
                                        </div>
                                      )}

                                      {sub.corresponding_author && sub.authors?.length === 0 && (
                                        <p className="text-gray-700">
                                          Corresponding Author: {sub.corresponding_author.full_name}
                                        </p>
                                      )}

                                      {!sub.authors?.length && !sub.manual_authors && (
                                        <p className="text-gray-600 italic">No authors listed</p>
                                      )}
                                    </div>
                                  </section>

                                  {/* New Fields */}
                                  <section>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                      <AlertCircle size={18} className="text-amber-600" />
                                      Conflict of Interest
                                    </h4>
                                    <p className="text-gray-700 whitespace-pre-line">
                                      {sub.conflict_of_interest || 'None declared'}
                                    </p>
                                  </section>

                                  <section>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                      <Info size={18} className="text-blue-600" />
                                      Acknowledgements
                                    </h4>
                                    <p className="text-gray-700 whitespace-pre-line">
                                      {sub.acknowledgement || 'None provided'}
                                    </p>
                                  </section>
                                </div>

                                {/* Right Column: Manuscript Preview */}
                                <div className="min-w-0">
                                  <h4 className="font-semibold mb-2">Manuscript File</h4>
                                    {getPreviewFile(sub) ? (
                                    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white h-[60vh] lg:h-[70vh]">
                                        {isPdfFile(getPreviewFile(sub) as string) ? (
                                          <iframe
                                            src={getFileUrl(getPreviewFile(sub))}
                                            className="w-full h-full"
                                            title={`Manuscript Preview - ${sub.title}`}
                                            allowFullScreen
                                          />
                                        ) : isWordFile(getPreviewFile(sub) as string) ? (
                                          <iframe
                                            src={getOfficeViewerUrl(getPreviewFile(sub) as string)}
                                            className="w-full h-full"
                                            title={`Manuscript Preview - ${sub.title}`}
                                            allowFullScreen
                                          />
                                        ) : (
                                          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                                            <FileText size={44} className="text-gray-400 mb-3" />
                                            <p className="text-gray-800 font-medium">
                                              Preview not available for this file type
                                            </p>
                                            <p className="text-sm text-gray-600 mt-1">
                                              Please open or download the original manuscript.
                                            </p>
                                            <div className="flex gap-3 mt-5 flex-wrap justify-center">
                                              <a
                                                href={getFileUrl(getPreviewFile(sub))}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium border"
                                              >
                                                Open File
                                              </a>
                                              <button
                                                type="button"
                                                onClick={() => downloadFile(getPreviewFile(sub) as string, sub.title)}
                                                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium"
                                              >
                                                Download
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg border border-dashed border-gray-300">
                                      <FileText size={48} className="text-gray-400 mb-4" />
                                      <p className="text-gray-600 text-center">No file attached</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">
              Showing {startIndex + 1}–{endIndex} of {filteredSubmissions.length} submissions
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

          {/* Mobile Cards */}
          <div className="xl:hidden divide-y">
            {currentPageSubmissions.map(sub => {
              const pending = statusChanges[sub.id];
              const displayStatus = pending || sub.current_status || sub.status || 'submitted';
              const isPreviewOpen = expandedPreviewId === sub.id;

              return (
                <Fragment key={sub.id}>
                  <div className="p-6 hover:bg-gray-50 transition space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="pr-4">
                        <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">{sub.title}</h3>
                        {sub.latest_version && (
                          <p className="text-xs text-indigo-700 mt-1">
                            Current Working Version: V{sub.latest_version.version_number} ({formatVersionType(sub.latest_version.version_type)})
                          </p>
                        )}
                      </div>
                      {getStatusBadge(displayStatus)}
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>By:</strong> {formatAuthorName(sub.submitted_by)}</p>
                      <p><strong>Type:</strong> {sub.manuscript_type?.replace('-', ' ') || 'N/A'}</p>
                      <p><strong>Date:</strong> {formatDate(sub.created_at)}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Update Status</label>
                      <div className="flex items-center gap-3">
                        <select
                          value={displayStatus}
                          onChange={e => handleStatusChange(sub.id, e.target.value)}
                          className={`flex-1 px-4 py-2.5 rounded-lg border text-sm ${
                            pending ? 'border-yellow-500 bg-yellow-50' : 'border-gray-300'
                          }`}
                        >
                          <option value="submitted">Submitted</option>
                          <option value="desk_review">Desk Review</option>
                          <option value="under_review">Under Review</option>
                          <option value="revision_requested">Revision Requested</option>
                          <option value="accepted">Accepted</option>
                          <option value="rejected">Rejected</option>
                        </select>

                        {(pending || savingId === sub.id) && (
                          <button
                            onClick={() => saveStatus(sub)}
                            disabled={savingId === sub.id}
                            className={`p-3 rounded-lg transition ${
                              savingId === sub.id
                                ? 'bg-gray-200 cursor-wait'
                                : pending
                                ? 'bg-green-100 hover:bg-green-200'
                                : 'bg-green-50 hover:bg-green-100'
                            }`}
                          >
                            {savingId === sub.id ? (
                              <RefreshCw size={20} className="animate-spin text-gray-600" />
                            ) : (
                              <Save size={20} className={pending ? 'text-green-700' : 'text-green-600'} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => togglePreview(sub.id)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition ${
                          isPreviewOpen 
                            ? 'bg-indigo-100 text-indigo-700' 
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        <Eye size={18} />
                        {isPreviewOpen ? 'Close Details' : 'View Details & Read'}
                      </button>

                      {sub.files && (
                        <button
                          onClick={() => downloadFile(sub.files, sub.title)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
                        >
                          <Download size={18} />
                          Download
                        </button>
                      )}
                    </div>
                  </div>

                  {isPreviewOpen && (
                    <div className="p-6 bg-gray-50 border-t">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-gray-900">
                          Full Details - {sub.title}
                        </h3>
                        <button
                          onClick={() => setExpandedPreviewId(null)}
                          className="p-2 text-gray-600 hover:text-gray-900 rounded hover:bg-gray-200"
                        >
                          <X size={24} />
                        </button>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <h4 className="font-semibold mb-2">Abstract</h4>
                          <p className="text-gray-700">{sub.abstract || 'No abstract'}</p>
                        </div>

                        {sub.keywords && (
                          <div>
                            <h4 className="font-semibold mb-2">Keywords</h4>
                            <p className="text-gray-700">{sub.keywords}</p>
                          </div>
                        )}

                        <div>
                          <h4 className="font-semibold mb-2">Version Timeline</h4>
                          {sub.versions && sub.versions.length > 0 ? (
                            <div className="space-y-3">
                              {sub.versions.map((version: any) => (
                                <div key={version.id} className="border rounded-lg p-3 bg-white">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-medium text-gray-900">
                                      V{version.version_number} - {formatVersionType(version.version_type)}
                                    </p>
                                    <span className="text-xs text-gray-500">
                                      {formatDate(version.created_at)}
                                    </span>
                                  </div>
                                  {version.revision_note && (
                                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">
                                      {version.revision_note}
                                    </p>
                                  )}
                                  {version.file && (
                                    <div className="mt-2">
                                      <a
                                        href={getFileUrl(version.file)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:underline"
                                      >
                                        View this version file
                                      </a>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">No version history available yet.</p>
                          )}
                        </div>

                        {/* Authors */}
                        <div>
                          <h4 className="font-semibold mb-2">Authors</h4>
                          <div className="space-y-3">
                            {sub.authors?.length > 0 && (
                              <div>
                                <p className="text-sm text-gray-600">Registered:</p>
                                <p className="text-gray-700">
                                  {sub.authors.map((a: any) => a.full_name).join(', ')}
                                </p>
                              </div>
                            )}

                            {sub.manual_authors && (
                              <div>
                                <p className="text-sm text-gray-600">Additional/Manual:</p>
                                <p className="text-gray-700 whitespace-pre-line">{sub.manual_authors}</p>
                              </div>
                            )}

                            {sub.corresponding_author && (
                              <p className="text-gray-700">
                                <strong>Corresponding:</strong> {sub.corresponding_author.full_name}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* New Fields */}
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <AlertCircle size={18} className="text-amber-600" />
                            Conflict of Interest
                          </h4>
                          <p className="text-gray-700 whitespace-pre-line">
                            {sub.conflict_of_interest || 'None declared'}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Info size={18} className="text-blue-600" />
                            Acknowledgements
                          </h4>
                          <p className="text-gray-700 whitespace-pre-line">
                            {sub.acknowledgement || 'None provided'}
                          </p>
                        </div>

                        {/* Manuscript */}
                        <div>
                          <h4 className="font-semibold mb-2">Manuscript File</h4>
                          {getPreviewFile(sub) ? (
                            <div className="border border-gray-300 rounded-lg overflow-hidden bg-white h-96">
                              {isPdfFile(getPreviewFile(sub) as string) ? (
                                <iframe
                                  src={getFileUrl(getPreviewFile(sub))}
                                  className="w-full h-full"
                                  title={`Manuscript - ${sub.title}`}
                                  allowFullScreen
                                />
                              ) : isWordFile(getPreviewFile(sub) as string) ? (
                                <iframe
                                  src={getOfficeViewerUrl(getPreviewFile(sub) as string)}
                                  className="w-full h-full"
                                  title={`Manuscript - ${sub.title}`}
                                  allowFullScreen
                                />
                              ) : (
                                <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                                  <FileText size={44} className="text-gray-400 mb-3" />
                                  <p className="text-gray-800 font-medium">
                                    Preview not available for this file type
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Please open or download the original manuscript.
                                  </p>
                                  <div className="flex gap-3 mt-5 flex-wrap justify-center">
                                    <a
                                      href={getFileUrl(getPreviewFile(sub))}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium border"
                                    >
                                      Open File
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => downloadFile(getPreviewFile(sub) as string, sub.title)}
                                      className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium"
                                    >
                                      Download
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg border border-dashed border-gray-300">
                              <FileText size={48} className="text-gray-400 mb-4" />
                              <p className="text-gray-600 text-center">No file attached</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}