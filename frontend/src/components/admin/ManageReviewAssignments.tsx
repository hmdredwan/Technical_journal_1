// src/components/admin/ManageReviewAssignments.tsx
'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import { apiUrl } from '@/utils/api';
import { 
  Plus, Edit, Trash2, Eye, X, Download, Mail, Loader2, 
  AlertCircle, FileText 
} from 'lucide-react';

interface ReviewAssignment {
  id: number;
  submission_title?: string;
  submission_keywords?: string;
  submission_abstract?: string;
  submission?: number;
  submission_version?: number | null;
  submission_version_number?: number;
  submission_version_type?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  assigned_to_email?: string;
  due_date?: string;
  admin_remarks?: string;
  status?: string;
  status_display?: string;
  assigned_at?: string;
  submitted_at?: string;
  reviewer_remarks?: string;
  review_report?: string;
  invite_response?: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  invite_response_display?: string;
  invitation_sent_at?: string | null;
  invite_responded_at?: string | null;
  invite_rejection_reasons?: string[] | null;
  invite_rejection_note?: string | null;
  comment_to_author?: string;
  comment_to_editor?: string;
  recommendation?: string;
}

export default function ManageReviewAssignments() {
  const [assignments, setAssignments] = useState<ReviewAssignment[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<any[]>([]);
  const [submissionPeriods, setSubmissionPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ReviewAssignment | null>(null);
  const [viewItem, setViewItem] = useState<ReviewAssignment | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [reassignmentMode, setReassignmentMode] = useState<'add' | 'replace'>('add');
  const redirectTimerRef = useRef<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const token = localStorage.getItem('access_token');
  const userRole = localStorage.getItem('user_role');

  const [formData, setFormData] = useState({
    submission: '',
    submission_version: '',
    is_new_submission: false,
    new_title: '',
    new_abstract: '',
    new_keywords: '',
    new_file: null as File | null,
    assigned_to: '',
    due_date: '',
    admin_remarks: '',
  });

  const selectedSubmission = submissions.find((s) => String(s.id) === formData.submission);
  const submissionVersions = selectedSubmission?.versions || [];

  useEffect(() => {
    fetchAssignments();
    fetchSubmissions();
    fetchAssignableUsers();
    fetchSubmissionPeriods();
  }, []);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage]);

  const totalPages = Math.max(1, Math.ceil(assignments.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(assignments.length, startIndex + rowsPerPage);
  const currentPageAssignments = assignments.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('review-assignments/'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        let errMsg = 'Failed to load assignments';
        try {
          const errData = await res.json();
          errMsg = errData.detail || errData.message || (Object.values(errData)[0] as string[] | undefined)?.[0] || errMsg;
        } catch {}
        throw new Error(errMsg);
      }
      setAssignments(await res.json());
    } catch (err: any) {
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const endpoint = userRole === 'admin' ? 'submissions/' : 'editor-submissions/';
      const res = await fetch(apiUrl(endpoint), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load submissions');
      const data = await res.json();
      setSubmissions(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Error fetching submissions:', err);
    }
  };

  const fetchAssignableUsers = async () => {
    try {
      const endpoint = 'users/?role=reviewer,editorial_board';
      const res = await fetch(apiUrl(endpoint), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        let errMsg = 'Failed to load reviewers';
        try {
          const errData = await res.json();
          errMsg = errData.detail || errData.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }
      const data = await res.json();
      setAssignableUsers(Array.isArray(data) ? data : data.results || []);
    } catch (err: any) {
      console.error('Error fetching reviewers:', err);
      setError(err?.message || 'Failed to load reviewers');
    }
  };

  const fetchSubmissionPeriods = async () => {
    try {
      const res = await fetch(apiUrl('public/submission-periods/'));
      if (!res.ok) throw new Error('Failed to load submission periods');
      const data = await res.json();
      setSubmissionPeriods(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Error fetching submission periods:', err);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (redirectTimerRef.current) {
      window.clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    setIsAssigning(true);

    let submissionId = formData.submission;
    const assignmentPayload: Record<string, any> = {
      assigned_to: Number(formData.assigned_to),
      due_date: formData.due_date,
      admin_remarks: formData.admin_remarks,
    };

    if (formData.is_new_submission) {
      if (!formData.new_title || !formData.new_file) {
        setError('New manuscript needs title and file');
        setIsAssigning(false);
        return;
      }

      const selectedPeriod = submissionPeriods.find((period: any) => period.is_active) || submissionPeriods[0];
      if (!selectedPeriod?.id) {
        setError('No submission period is available for new manuscript upload. Please create or enable a submission period before uploading.');
        setIsAssigning(false);
        return;
      }

      const submissionData = new FormData();
      submissionData.append('title', formData.new_title);
      submissionData.append('abstract', formData.new_abstract || '');
      submissionData.append('keywords', formData.new_keywords || '');
      submissionData.append('files', formData.new_file);
      submissionData.append('manuscript_type', 'admin_upload');
      submissionData.append('submission_period', String(selectedPeriod.id));
      submissionData.append('originality_declaration', 'true');

      const submissionRes = await fetch(apiUrl('submissions/'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: submissionData,
      });

      if (!submissionRes.ok) {
        let errMsg = 'Failed to create submission';
        try {
          const errData = await submissionRes.json();
          errMsg = errData.detail || errData.message || (Object.values(errData)[0] as string[] | undefined)?.[0] || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const submissionResult = await submissionRes.json();
      submissionId = submissionResult.id;
      if (!submissionId) {
        throw new Error('Failed to create submission');
      }
    } else {
      if (!formData.submission) {
        setError('Select existing submission or create new');
        setIsAssigning(false);
        return;
      }
      submissionId = formData.submission;
    }

    assignmentPayload.submission = Number(submissionId);
    if (formData.submission_version) {
      assignmentPayload.submission_version = Number(formData.submission_version);
    }

    const targetSubmissionVersionId = formData.submission_version ? Number(formData.submission_version) : null;
    const selectedReviewerId = formData.assigned_to ? String(formData.assigned_to) : '';
    const duplicateAssignmentConflict = selectedReviewerId && assignments.find((assignment) => {
      if (assignment.id === editing?.id) return false;
      if (String(assignment.assigned_to) !== selectedReviewerId) return false;
      if (String(assignment.submission) !== String(submissionId)) return false;

      const assignmentVersionId = assignment.submission_version ?? null;
      const isSameVersionAssignment = assignmentVersionId === targetSubmissionVersionId;
      const isLatestVersionAssignment = targetSubmissionVersionId === null && assignmentVersionId === null;
      const isActiveAssignment = !['withdrawn', 'rejected', 'cancelled'].includes(String(assignment.invite_response || '')) && String(assignment.status || '') !== 'cancelled';

      return isActiveAssignment && (isSameVersionAssignment || isLatestVersionAssignment);
    });

    if (duplicateAssignmentConflict) {
      setError('This version is already assigned to this reviewer. Please choose another reviewer.');
      setIsAssigning(false);
      return;
    }

    const reviewerChanged = Boolean(
      editing &&
      formData.assigned_to &&
      editing.assigned_to?.toString() !== formData.assigned_to
    );
    const shouldUseReassignFlow = Boolean(
      editing &&
      reviewerChanged &&
      (editing.invite_response === 'accepted' || editing.status === 'in_progress')
    );
    const previouslyWithdrawnReviewerAssignment = shouldUseReassignFlow
      ? assignments.find((assignment) =>
          assignment.assigned_to?.toString() === formData.assigned_to &&
          assignment.submission?.toString() === String(submissionId) &&
          (assignment.submission_version ?? null) === targetSubmissionVersionId &&
          (assignment.invite_response === 'withdrawn' || assignment.invite_response === 'rejected' || assignment.status === 'cancelled')
        )
      : null;

    let url = editing ? apiUrl(`review-assignments/${editing.id}/`) : apiUrl('review-assignments/');
    let method: string = editing ? 'PATCH' : 'POST';
    let requestBody: FormData | null = null;

    if (shouldUseReassignFlow) {
      if (reassignmentMode === 'replace') {
        const confirmMessage = previouslyWithdrawnReviewerAssignment
          ? 'This reviewer was previously assigned to this manuscript version and that assignment was withdrawn. Assign them again now? This will send a new invitation and they can accept or reject it.'
          : 'Replace the current reviewer? This will withdraw the current reviewer assignment and create a new assignment for the selected reviewer.';
        const confirmed = window.confirm(confirmMessage);
        if (!confirmed) {
          setIsAssigning(false);
          return;
        }
      }

      url = apiUrl(`review-assignments/${editing!.id}/reassign/`);
      method = 'POST';
      requestBody = new FormData();
      requestBody.append('assigned_to', String(formData.assigned_to));
      requestBody.append('mode', reassignmentMode);
      requestBody.append('confirm_replace', reassignmentMode === 'replace' ? 'true' : 'false');
      requestBody.append('due_date', formData.due_date || '');
      requestBody.append('admin_remarks', formData.admin_remarks || '');
    } else {
      const assignmentFormData = new FormData();
      Object.entries(assignmentPayload).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          assignmentFormData.append(key, String(value));
        }
      });
      requestBody = assignmentFormData;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: requestBody as BodyInit,
      });

      if (!res.ok) {
        let errMsg = 'Failed to save assignment';
        try {
          const errData = await res.json();
          errMsg = errData.detail || errData.message || (Object.values(errData)[0] as string[] | undefined)?.[0] || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const successMessage = shouldUseReassignFlow
        ? reassignmentMode === 'replace'
          ? previouslyWithdrawnReviewerAssignment
            ? 'Reviewer reassigned successfully and a fresh invitation has been sent.'
            : 'Current reviewer withdrawn and replacement assignment created successfully.'
          : 'New reviewer assignment created successfully.'
        : editing
        ? 'Assignment updated successfully.'
        : 'Review assignment created successfully.';
      setSuccess(successMessage);
      setError('');
      setIsAssigning(false);
      redirectTimerRef.current = window.setTimeout(() => {
        setShowForm(false);
        setEditing(null);
        setFormData({
          submission: '', submission_version: '', is_new_submission: false,
          new_title: '', new_abstract: '', new_keywords: '', new_file: null,
          assigned_to: '', due_date: '', admin_remarks: '',
        });
        setReassignmentMode('add');
        setSuccess('');
        fetchAssignments();
      }, 2200);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setIsAssigning(false);
    }
  };

  const handleEdit = (item: ReviewAssignment) => {
    setEditing(item);
    setFormData({
      submission: item.submission?.toString() || '',
      submission_version: item.submission_version?.toString() || '',
      is_new_submission: false,
      new_title: '',
      new_abstract: '',
      new_keywords: '',
      new_file: null,
      assigned_to: item.assigned_to?.toString() || '',
      due_date: item.due_date || '',
      admin_remarks: item.admin_remarks || '',
    });
    setReassignmentMode('add');
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this assignment?')) return;
    try {
      const res = await fetch(apiUrl(`review-assignments/${id}/`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete assignment');
      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    }
  };

  const handleResendInvite = async (id: number) => {
    try {
      const res = await fetch(apiUrl(`review-assignments/${id}/resend-invite/`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Failed to resend invitation');
      alert('Invitation email resent successfully.');
      fetchAssignments();
    } catch (err: any) {
      setError(err.message || 'Failed to resend invitation');
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditing(null);
    setFormData({
      submission: '', submission_version: '', is_new_submission: false,
      new_title: '', new_abstract: '', new_keywords: '', new_file: null,
      assigned_to: '', due_date: '', admin_remarks: '',
    });
    setReassignmentMode('add');
    setError('');
  };

  const getStatusBadge = (status?: string, statusDisplay?: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
    };
    return (
      <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${styles[status || ''] || 'bg-gray-100 text-gray-800'}`}>
        {statusDisplay || status || 'Pending'}
      </span>
    );
  };

  const getInviteBadge = (inviteResponse?: string, inviteDisplay?: string) => {
    const styles: Record<string, string> = {
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${styles[inviteResponse || ''] || 'bg-gray-100 text-gray-800'}`}>
        {inviteDisplay || inviteResponse || 'Pending'}
      </span>
    );
  };

  if (loading && assignments.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <span className="ml-4 text-lg text-gray-600">Loading review assignments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
          {showForm ? (editing ? 'Edit Assignment' : 'Assign Manuscript for Review') : 'Review Assignments'}
        </h2>
        <div className="flex gap-3">
          {!showForm && (
            <>
              <button
                onClick={fetchAssignments}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                <Loader2 size={18} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium shadow-sm"
              >
                <Plus size={18} />
                Assign New Manuscript
              </button>
            </>
          )}
        </div>
      </div>

      {(error || success) && (
        <div className="flex justify-center">
          <div className={`w-full max-w-3xl p-4 rounded-xl border ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            {error || success}
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleCreateOrUpdate} className="space-y-6 mb-12 bg-white p-8 rounded-xl border shadow-sm">
          {/* Toggle new/existing */}
          <div className="flex items-center gap-8 mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={!formData.is_new_submission}
                onChange={() => setFormData(p => ({ ...p, is_new_submission: false }))}
                className="h-5 w-5 text-blue-600"
              />
              <span className="text-gray-700 font-medium">Use existing submission</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={formData.is_new_submission}
                onChange={() => setFormData(p => ({ ...p, is_new_submission: true }))}
                className="h-5 w-5 text-blue-600"
              />
              <span className="text-gray-700 font-medium">Upload new manuscript</span>
            </label>
          </div>

          {!formData.is_new_submission ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Manuscript <span className="text-red-500">*</span></label>
              <select
                value={formData.submission}
                onChange={e => setFormData(p => ({ ...p, submission: e.target.value, submission_version: '' }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                required
              >
                <option value="">-- Choose Submission --</option>
                {submissions.length === 0 ? (
                  <option disabled>No submissions available</option>
                ) : (
                  submissions.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title} (by {s.submitted_by?.full_name || s.submitted_by?.email || 'Unknown'})
                    </option>
                  ))
                )}
              </select>

              {formData.submission && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Manuscript Version (optional)
                  </label>
                  <select
                    value={formData.submission_version}
                    onChange={e => setFormData(p => ({ ...p, submission_version: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  >
                    <option value="">Latest version</option>
                    {submissionVersions.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        V{v.version_number} - {(v.version_type || '').replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Manuscript Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.new_title}
                  onChange={e => setFormData(p => ({ ...p, new_title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  required
                  placeholder="Enter manuscript title"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Abstract</label>
                <textarea
                  value={formData.new_abstract}
                  onChange={e => setFormData(p => ({ ...p, new_abstract: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="Enter abstract..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Keywords</label>
                <input
                  type="text"
                  value={formData.new_keywords}
                  onChange={e => setFormData(p => ({ ...p, new_keywords: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="e.g., climate change, renewable energy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Manuscript File <span className="text-red-500">*</span></label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={e => setFormData(p => ({ ...p, new_file: e.target.files?.[0] || null }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition"
                  required
                />
              </div>
            </div>
          )}

          {editing && (editing.invite_response === 'accepted' || editing.status === 'in_progress') && formData.assigned_to && editing.assigned_to?.toString() !== formData.assigned_to && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="font-medium text-amber-900">This reviewer has already accepted the invitation.</div>
              <p className="mt-1 text-sm text-amber-700">Choose how to handle the update.</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex items-center gap-2 text-sm text-amber-800">
                  <input
                    type="radio"
                    name="reassignment-mode"
                    checked={reassignmentMode === 'add'}
                    onChange={() => setReassignmentMode('add')}
                    className="h-4 w-4"
                  />
                  Add Reviewer
                </label>
                <label className="flex items-center gap-2 text-sm text-amber-800">
                  <input
                    type="radio"
                    name="reassignment-mode"
                    checked={reassignmentMode === 'replace'}
                    onChange={() => setReassignmentMode('replace')}
                    className="h-4 w-4"
                  />
                  Replace Reviewer
                </label>
              </div>
              <p className="mt-2 text-xs text-amber-700">
                {reassignmentMode === 'add'
                  ? 'Add Reviewer keeps the current assignment active and creates a new assignment for the selected reviewer.'
                  : 'Replace Reviewer withdraws the current reviewer and creates a fresh assignment for the selected reviewer.'}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign To (Reviewer / Editorial Board) <span className="text-red-500">*</span></label>
            <select
              value={formData.assigned_to}
              onChange={e => setFormData(p => ({ ...p, assigned_to: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              required
            >
              <option value="">-- Select Reviewer / EBM --</option>
              {assignableUsers.length === 0 ? (
                <option value="" disabled>
                  No reviewers or editorial board members available
                </option>
              ) : (
                assignableUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email || 'Reviewer'} ({u.role?.name || 'Reviewer'}) - {u.email}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={formData.due_date}
                onChange={e => setFormData(p => ({ ...p, due_date: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Admin Remarks (optional)</label>
              <textarea
                value={formData.admin_remarks}
                onChange={e => setFormData(p => ({ ...p, admin_remarks: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Instructions or notes for the reviewer/EBM..."
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isAssigning}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-sm disabled:cursor-not-allowed disabled:bg-blue-400 flex items-center justify-center gap-2"
            >
              {isAssigning ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {editing ? 'Updating...' : 'Assigning...'}
                </>
              ) : (
                editing ? 'Update Assignment' : 'Assign for Review'
              )}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="px-8 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-medium shadow-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table Section */}
      {!showForm && (
        <>
          {assignments.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
              <FileText className="mx-auto mb-4 text-gray-400" size={64} />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No review assignments yet</h3>
              <p className="text-gray-500">Assignments will appear here once you create them.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow border overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full w-full table-fixed divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Manuscript</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Assigned To</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Due Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Invite</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentPageAssignments.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 align-top break-words whitespace-normal overflow-wrap-anywhere min-w-0">
                          <div className="font-medium text-gray-900 line-clamp-2">
                            {a.submission_title || 'Untitled Manuscript'}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {a.submission_version_number
                              ? `V${a.submission_version_number} (${(a.submission_version_type || '').replace('_', ' ')})`
                              : 'Latest'}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top break-words whitespace-normal overflow-wrap-anywhere min-w-0">
                          <div className="font-medium">{a.assigned_to_name || '—'}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail size={14} /> {a.assigned_to_email || '—'}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top text-sm text-gray-700 break-words whitespace-normal overflow-wrap-anywhere min-w-0">
                          {a.due_date ? new Date(a.due_date).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric'
                          }) : '—'}
                        </td>
                        <td className="px-6 py-4 align-top break-words whitespace-normal overflow-wrap-anywhere min-w-0">
                          {getStatusBadge(a.status, a.status_display)}
                        </td>
                        <td className="px-6 py-4 align-top break-words whitespace-normal overflow-wrap-anywhere min-w-0">
                          {getInviteBadge(a.invite_response, a.invite_response_display)}
                          {a.invitation_sent_at && (
                            <div className="text-xs text-gray-500 mt-1">
                              Sent: {new Date(a.invitation_sent_at).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 align-top text-right break-words whitespace-normal overflow-wrap-anywhere min-w-0">
                          <div className="flex items-center justify-end gap-4">
                            <button onClick={() => setViewItem(a)} title="View Details" className="text-indigo-600 hover:text-indigo-800">
                              <Eye size={18} />
                            </button>
                            <button onClick={() => handleResendInvite(a.id)} title="Resend Invitation" className="text-indigo-600 hover:text-indigo-800">
                              <Mail size={18} />
                            </button>
                            <button onClick={() => handleEdit(a)} title="Edit" className="text-blue-600 hover:text-blue-800">
                              <Edit size={18} />
                            </button>
                            <button onClick={() => handleDelete(a.id)} title="Delete" className="text-red-600 hover:text-red-800">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y">
                {currentPageAssignments.map(a => (
                  <Fragment key={a.id}>
                    <div className="p-6 hover:bg-gray-50 transition space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="pr-4">
                          <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">
                            {a.submission_title || 'Untitled Manuscript'}
                          </h3>
                          <div className="text-sm text-gray-500 mt-1">
                            {a.assigned_to_name} • {a.assigned_to_email}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(a.status, a.status_display)}
                          {getInviteBadge(a.invite_response, a.invite_response_display)}
                        </div>
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Due Date:</strong> {a.due_date ? new Date(a.due_date).toLocaleDateString() : 'Not set'}</p>
                        <p><strong>Version:</strong> {a.submission_version_number ? `V${a.submission_version_number}` : 'Latest'}</p>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setViewItem(a)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                        >
                          <Eye size={18} />
                          View
                        </button>
                        <button
                          onClick={() => handleResendInvite(a.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                        >
                          <Mail size={18} />
                          Resend
                        </button>
                      </div>
                    </div>
                  </Fragment>
                ))}
              </div>

              {/* Pagination */}
              <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">
                  Showing {startIndex + 1}–{endIndex} of {assignments.length} assignments
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
        </>
      )}

      {/* View Details Modal */}
      {viewItem && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-6 border-b flex justify-between items-center z-10">
              <h3 className="text-2xl font-bold">Review Assignment Details</h3>
              <button onClick={() => setViewItem(null)} className="text-gray-600 hover:text-gray-800">
                <X size={28} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Your existing modal content remains unchanged */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <strong className="block text-gray-700 mb-1">Manuscript</strong>
                  <p className="text-gray-900">{viewItem.submission_title}</p>
                </div>
                <div>
                  <strong className="block text-gray-700 mb-1">Version</strong>
                  <p className="text-gray-900">
                    {viewItem.submission_version_number
                      ? `V${viewItem.submission_version_number} (${(viewItem.submission_version_type || '').replace('_', ' ')})`
                      : 'Latest'}
                  </p>
                </div>
                <div>
                  <strong className="block text-gray-700 mb-1">Assigned To</strong>
                  <p className="text-gray-900">{viewItem.assigned_to_name} ({viewItem.assigned_to_email})</p>
                </div>
                <div>
                  <strong className="block text-gray-700 mb-1">Invitation</strong>
                  <p className="text-gray-900">
                    {viewItem.invite_response_display || viewItem.invite_response || 'Pending'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {viewItem.invitation_sent_at ? `Sent: ${new Date(viewItem.invitation_sent_at).toLocaleString()}` : 'Not sent'}
                    {viewItem.invite_responded_at ? ` • Responded: ${new Date(viewItem.invite_responded_at).toLocaleString()}` : ''}
                  </p>
                </div>
                <div>
                  <strong className="block text-gray-700 mb-1">Assigned Date</strong>
                  <p className="text-gray-900">{new Date(viewItem.assigned_at || Date.now()).toLocaleString()}</p>
                </div>
                <div>
                  <strong className="block text-gray-700 mb-1">Due Date</strong>
                  <p className="text-gray-900">
                    {viewItem.due_date ? new Date(viewItem.due_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
              </div>

              <div>
                <strong className="block text-gray-700 mb-1">Status</strong>
                <span className={`inline-block px-4 py-1 rounded-full text-sm font-medium mt-1 ${
                  viewItem.status === 'completed' ? 'bg-green-100 text-green-800' :
                  viewItem.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {viewItem.status_display || viewItem.status}
                </span>
              </div>

              {viewItem.admin_remarks && (
                <div>
                  <strong className="block text-gray-700 mb-1">Admin Remarks</strong>
                  <p className="text-gray-900 whitespace-pre-wrap mt-1">{viewItem.admin_remarks}</p>
                </div>
              )}

              {/* Add more sections from your original modal as needed */}
              {viewItem.reviewer_remarks && (
                <div>
                  <strong className="block text-gray-700 mb-1">Reviewer Remarks</strong>
                  <p className="text-gray-900 whitespace-pre-wrap mt-1">{viewItem.reviewer_remarks}</p>
                </div>
              )}

              {viewItem.review_report && (
                <div>
                  <strong className="block text-gray-700 mb-1">Review Report</strong>
                  <a
                    href={viewItem.review_report}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:underline mt-1"
                  >
                    <Download size={16} />
                    Download Report
                  </a>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white p-6 border-t flex justify-end">
              <button
                onClick={() => setViewItem(null)}
                className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}