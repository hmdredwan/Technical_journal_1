'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl } from '@/utils/api';
import { Download, Edit3, CheckCircle, X } from 'lucide-react';

interface Assignment {
  id: number;
  submission_title?: string;
  submission_file?: string;
  due_date?: string;
  status: string;
  status_display?: string;
  admin_remarks?: string;
}

interface AssignedReviewsProps {
  assignments: Assignment[];
  onRefresh: () => void;
}

export default function AssignedReviewsContent({
  assignments,
  onRefresh,
}: AssignedReviewsProps) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [status, setStatus] = useState('in_progress');
  const [remarks, setRemarks] = useState('');
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [updateError, setUpdateError] = useState('');
  const [loadingId, setLoadingId] = useState<number | null>(null);

  // Move localStorage access to useEffect + client check
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('access_token');
      setToken(t);

      // Optional: redirect if no token (extra safety)
      if (!t) {
        router.replace('/login');
      }
    }
  }, [router]);

  // Show loading until we're sure we're on client and have token
  if (!isClient || token === null) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  const handleUpdate = async (assignmentId: number) => {
    if (!token) {
      setUpdateError('Authentication token missing. Please log in again.');
      return;
    }

    setUpdateError('');
    setLoadingId(assignmentId);

    const formData = new FormData();
    formData.append('status', status);
    formData.append('reviewer_remarks', remarks.trim());
    if (reportFile) formData.append('review_report', reportFile);

    try {
      const res = await fetch(apiUrl(`review-assignments/${assignmentId}/`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        let errorMessage = `Update failed (${res.status})`;

        try {
          const errorData = await res.json();

          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
            errorMessage = errorData.non_field_errors[0];
          } else if (typeof errorData === 'object' && errorData !== null) {
            const values = Object.values(errorData);
            if (values.length > 0) {
              const firstValue = values[0];
              if (Array.isArray(firstValue) && firstValue.length > 0) {
                errorMessage = String(firstValue[0]);
              } else if (typeof firstValue === 'string') {
                errorMessage = firstValue;
              }
            }
          }
        } catch {
          // silent fallback
        }

        throw new Error(errorMessage);
      }

      alert('Review updated successfully!');
      onRefresh();
      setSelectedId(null);
      setRemarks('');
      setReportFile(null);
      setUpdateError('');
    } catch (err: any) {
      console.error('Review update failed:', err);
      setUpdateError(err.message || 'Failed to update review. Please try again.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDownloadManuscript = (filePath?: string, title?: string) => {
    if (!filePath) {
      alert('No manuscript file available for download');
      return;
    }

    const fullUrl = (() => {
      if (filePath.startsWith('http') || filePath.startsWith('//')) return filePath;

      const normalized = filePath.startsWith('/') ? filePath : `/${filePath}`;
      if (normalized.startsWith('/media/')) {
        if (typeof window !== 'undefined') return `${window.location.origin}${normalized}`;
        return normalized;
      }

      return apiUrl(normalized.replace(/^\//, ''));
    })();

    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = `${(title || 'manuscript').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8">Assigned Manuscripts for Review</h2>

      {assignments.length === 0 ? (
        <p className="text-gray-600 text-center py-20">No manuscripts assigned to you yet.</p>
      ) : (
        <div className="space-y-8">
          {assignments.map((assignment) => {
            const filePath = assignment.submission_file || '';
            const isSelected = selectedId === assignment.id;
            const isUpdating = loadingId === assignment.id;

            return (
              <div
                key={assignment.id}
                className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900">
                      {assignment.submission_title || 'Untitled Manuscript'}
                    </h3>
                    <p className="text-gray-600 mt-1">
                      Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>

                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      assignment.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : assignment.status === 'in_progress'
                        ? 'bg-yellow-100 text-yellow-800'
                        : assignment.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {assignment.status_display || assignment.status}
                  </span>
                </div>

                {assignment.admin_remarks && (
                  <p className="mt-4 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <strong className="text-gray-800">Admin Remarks:</strong> {assignment.admin_remarks}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap gap-4">
                  <button
                    onClick={() => handleDownloadManuscript(filePath, assignment.submission_title)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl transition font-medium ${
                      filePath
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    } ${isUpdating ? 'opacity-60 cursor-not-allowed' : ''}`}
                    disabled={!filePath || isUpdating}
                  >
                    <Download size={18} />
                    {filePath ? 'Download Manuscript' : 'No File Available'}
                  </button>

                  <button
                    onClick={() => setSelectedId(isSelected ? null : assignment.id)}
                    disabled={isUpdating}
                    className={`flex items-center gap-2 px-6 py-3 border rounded-xl transition font-medium ${
                      isSelected
                        ? 'border-gray-400 text-gray-700 bg-gray-100'
                        : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                    } ${isUpdating ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <Edit3 size={18} />
                    {isSelected ? 'Close' : 'Update Review'}
                  </button>
                </div>

                {isSelected && (
                  <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-200">
                    <h4 className="font-semibold text-lg mb-6 text-gray-900">Update Your Review</h4>

                    {updateError && (
                      <p className="text-red-600 mb-4 bg-red-50 p-3 rounded-lg border border-red-200">
                        {updateError}
                      </p>
                    )}

                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">Status</label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          disabled={isUpdating}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:opacity-60"
                        >
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="rejected">Rejected</option>
                          <option value="under_review">Under Review</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">
                          Upload Review Report (PDF/DOC)
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                          disabled={isUpdating}
                          className="w-full p-3 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition disabled:opacity-60"
                        />
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        Remarks / Review Comments
                      </label>
                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        disabled={isUpdating}
                        rows={5}
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:opacity-60"
                        placeholder="Write your detailed review comments here..."
                      />
                    </div>

                    <div className="flex gap-4 mt-8">
                      <button
                        onClick={() => handleUpdate(assignment.id)}
                        disabled={isUpdating}
                        className={`px-8 py-3 text-white rounded-xl transition font-medium shadow-sm flex items-center gap-2 min-w-[160px] justify-center ${
                          isUpdating
                            ? 'bg-green-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        <CheckCircle size={18} />
                        {isUpdating ? 'Submitting...' : 'Submit Review'}
                      </button>

                      <button
                        onClick={() => setSelectedId(null)}
                        disabled={isUpdating}
                        className={`px-8 py-3 rounded-xl transition font-medium ${
                          isUpdating
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        <X size={18} className="mr-2" />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}