'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl } from '@/utils/api';
import { Download, Edit3, CheckCircle, X, MessageSquare, Eye, FileText } from 'lucide-react';
import ManuscriptDiscussion from '@/components/ManuscriptDiscussion';

interface Assignment {
  id: number;
  submission: number;
  submission_title?: string;
  submission_file?: string;
  submission_version_number?: number;
  submission_version_type?: string;
  due_date?: string;
  status: string;
  status_display?: string;
  admin_remarks?: string;
}

interface AssignedReviewsProps {
  assignments: Assignment[];
  onRefresh: () => Promise<void> | void;
}

export default function AssignedReviews({
  assignments,
  onRefresh,
}: AssignedReviewsProps) {
  const router = useRouter();

  const formatVersionType = (versionType?: string) => {
    const vt = (versionType || '').toLowerCase();
    if (vt === 'initial') return 'Initial Submission';
    if (vt === 'minor_revision') return 'Minor Revision';
    if (vt === 'major_revision') return 'Major Revision';
    if (vt === 'editor_update') return 'Editorial Update';
    return versionType ? versionType.replace('_', ' ') : 'Unknown';
  };

  // Token + mount state (prevents server crash during build)
  const [token, setToken] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState('in_progress');
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [plagiarismReportFile, setPlagiarismReportFile] = useState<File | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [updateError, setUpdateError] = useState('');
  const [openDiscussionId, setOpenDiscussionId] = useState<number | null>(null);
  const [previewManuscriptId, setPreviewManuscriptId] = useState<number | null>(null);

  // New fields for enhanced review feedback
  const [commentToAuthor, setCommentToAuthor] = useState('');
  const [commentToEditor, setCommentToEditor] = useState('');
  const [recommendation, setRecommendation] = useState('');

  // Checklist fields
  const [isImportantForScientificCommunity, setIsImportantForScientificCommunity] = useState<boolean | null>(null);
  const [isTitleSuitable, setIsTitleSuitable] = useState<boolean | null>(null);
  const [alternativeTitle, setAlternativeTitle] = useState('');
  const [isAbstractComprehensive, setIsAbstractComprehensive] = useState<boolean | null>(null);
  const [isIntroConclusionSufficient, setIsIntroConclusionSufficient] = useState<boolean | null>(null);
  const [isStructureAppropriate, setIsStructureAppropriate] = useState<boolean | null>(null);
  const [areReferencesSufficient, setAreReferencesSufficient] = useState<boolean | null>(null);
  const [additionalReferences, setAdditionalReferences] = useState('');
  const [isLanguageQualitySuitable, setIsLanguageQualitySuitable] = useState<boolean | null>(null);

  // Safely read token only on client
  useEffect(() => {
    setIsMounted(true);

    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('access_token');
      setToken(t);

      // Early redirect if no token
      if (!t) {
        router.replace('/login');
      }
    }
  }, [router]);

  // Loading state until client is mounted and token is read
  if (!isMounted || token === null) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  // const handleUpdate = async (assignmentId: number) => {
  //   if (!token) {
  //     setUpdateError('Authentication token missing. Please log in again.');
  //     return;
  //   }

  //   setUpdateError('');
  //   setUpdatingId(assignmentId);

  //   const formData = new FormData();
  //   formData.append('status', status);
  //   formData.append('reviewer_remarks', remarks.trim());
  //   formData.append('comment_to_author', commentToAuthor.trim());
  //   formData.append('comment_to_editor', commentToEditor.trim());
  //   if (recommendation.trim()) {
  //     formData.append('recommendation', recommendation.trim());
  //   }
  //   if (reportFile) formData.append('review_report', reportFile);
  //   if (plagiarismReportFile) formData.append('plagiarism_report', plagiarismReportFile);

  //   try {
  //     const res = await fetch(apiUrl(`review-assignments/${assignmentId}/`), {
  //       method: 'PATCH',
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //       },
  //       body: formData,
  //     });

  //     if (!res.ok) {
  //       let errorMessage = `Update failed (${res.status})`;

  //       try {
  //         const errData = await res.json();

  //         if (errData.detail) {
  //           errorMessage = errData.detail;
  //         } else if (errData.message) {
  //           errorMessage = errData.message;
  //         } else if (typeof errData === 'object' && errData !== null) {
  //           const values = Object.values(errData);
  //           if (values.length > 0) {
  //             const firstValue = values[0];
  //             if (Array.isArray(firstValue) && firstValue.length > 0) {
  //               errorMessage = String(firstValue[0]);
  //             } else if (typeof firstValue === 'string') {
  //               errorMessage = firstValue;
  //             }
  //           }
  //         }
  //       } catch {
  //         // silent fallback
  //       }

  //       throw new Error(errorMessage);
  //     }

  //     alert('Review updated successfully!');
  //     onRefresh();
  //     setSelectedAssignment(null);
  //     setRemarks('');
  //     setReportFile(null);
  //     setPlagiarismReportFile(null);
  //     setCommentToAuthor('');
  //     setCommentToEditor('');
  //     setRecommendation('');
  //     setUpdateError('');
  //   } catch (err: any) {
  //     console.error('Review update failed:', err);
  //     setUpdateError(err.message || 'Failed to update review. Please try again.');
  //   } finally {
  //     setUpdatingId(null);
  //   }
  // };




// const handleUpdate = async (assignmentId: number) => {
//   if (!token) {
//     setUpdateError('Authentication token missing. Please log in again.');
//     return;
//   }

//   setUpdateError('');
//   setUpdatingId(assignmentId);

//   const formData = new FormData();
//   formData.append('status', status);

//   // Only append fields if they have meaningful content
//   if (remarks.trim()) formData.append('reviewer_remarks', remarks.trim());
//   if (commentToAuthor.trim()) formData.append('comment_to_author', commentToAuthor.trim());
//   if (commentToEditor.trim()) formData.append('comment_to_editor', commentToEditor.trim());
//   if (recommendation.trim()) formData.append('recommendation', recommendation.trim());

//   if (reportFile) formData.append('review_report', reportFile);
//   if (plagiarismReportFile) formData.append('plagiarism_report', plagiarismReportFile);

//   try {
//     const res = await fetch(apiUrl(`review-assignments/${assignmentId}/`), {
//       method: 'PATCH',
//       headers: { Authorization: `Bearer ${token}` },
//       body: formData,
//     });

//     if (!res.ok) {
//       const errData = await res.json().catch(() => ({}));
//       const errorMessage = errData.detail || 
//                           errData.message || 
//                           (Array.isArray(errData[Object.keys(errData)[0]]) 
//                             ? errData[Object.keys(errData)[0]][0] 
//                             : 'Update failed. Please check your input.');
//       throw new Error(errorMessage);
//     }

//     alert('Review updated successfully!');
//     onRefresh();
    
//     // Reset form
//     setSelectedAssignment(null);
//     setRemarks('');
//     setCommentToAuthor('');
//     setCommentToEditor('');
//     setRecommendation('');
//     setReportFile(null);
//     setPlagiarismReportFile(null);
//     setUpdateError('');

//   } catch (err: any) {
//     console.error('Review update failed:', err);
//     setUpdateError(err.message || 'Failed to update review. Please try again.');
//   } finally {
//     setUpdatingId(null);
//   }
// };



//  const handleUpdate = async (assignmentId: number) => {
//   if (!token) {
//     setUpdateError('Authentication token missing. Please log in again.');
//     return;
//   }

//   setUpdateError('');
//   setUpdatingId(assignmentId);

//   const formData = new FormData();
//   formData.append('status', status);

//   // Only append non-empty values
//   if (remarks.trim()) formData.append('reviewer_remarks', remarks.trim());
//   if (commentToAuthor.trim()) formData.append('comment_to_author', commentToAuthor.trim());
//   if (commentToEditor.trim()) formData.append('comment_to_editor', commentToEditor.trim());
//   if (recommendation.trim()) formData.append('recommendation', recommendation.trim());

//   if (reportFile) formData.append('review_report', reportFile);
//   if (plagiarismReportFile) formData.append('plagiarism_report', plagiarismReportFile);

//   try {
//     const res = await fetch(apiUrl(`review-assignments/${assignmentId}/`), {
//       method: 'PATCH',
//       headers: { Authorization: `Bearer ${token}` },
//       body: formData,
//     });

//     if (!res.ok) {
//       const errData = await res.json().catch(() => ({}));
//       let errorMessage = errData.detail || errData.message || 'Update failed';

//       // Handle DRF error format (list or object)
//       if (typeof errData === 'object' && errData !== null) {
//         const firstKey = Object.keys(errData)[0];
//         if (firstKey) {
//           const value = errData[firstKey];
//           if (Array.isArray(value) && value.length > 0) {
//             errorMessage = value[0];
//           } else if (typeof value === 'string') {
//             errorMessage = value;
//           }
//         }
//       }

//       throw new Error(errorMessage);
//     }

//     // Success
//     alert('Review updated successfully!');
//     await onRefresh?.();

//     // Reset form
//     setSelectedAssignment(null);
//     setRemarks('');
//     setCommentToAuthor('');
//     setCommentToEditor('');
//     setRecommendation('');
//     setReportFile(null);
//     setPlagiarismReportFile(null);
//     setUpdateError('');

//   } catch (err: any) {
//     console.error('Review update failed:', err);
//     setUpdateError(err.message || 'Failed to update review. Please try again.');
//   } finally {
//     setUpdatingId(null);
//   }
// };


const isChecklistComplete = () => {
  if (isImportantForScientificCommunity === null) return false;
  if (isTitleSuitable === null) return false;
  if (isAbstractComprehensive === null) return false;
  if (isIntroConclusionSufficient === null) return false;
  if (isStructureAppropriate === null) return false;
  if (areReferencesSufficient === null) return false;
  if (isLanguageQualitySuitable === null) return false;
  if (isTitleSuitable === false && !alternativeTitle.trim()) return false;
  if (areReferencesSufficient === false && !additionalReferences.trim()) return false;
  return true;
};

const handleUpdate = async (assignmentId: number) => {
  if (!token) {
    setUpdateError('Authentication token missing. Please log in again.');
    return;
  }

  setUpdateError('');
  setUpdatingId(assignmentId);

  if (!isChecklistComplete()) {
    setUpdateError('Please complete the manuscript quality checklist before submitting your review.');
    setUpdatingId(null);
    return;
  }

  const formData = new FormData();
  formData.append('status', status);

  // Only send fields that actually have value
  if (remarks.trim()) formData.append('reviewer_remarks', remarks.trim());
  if (commentToAuthor.trim()) formData.append('comment_to_author', commentToAuthor.trim());
  if (commentToEditor.trim()) formData.append('comment_to_editor', commentToEditor.trim());
  if (recommendation.trim()) formData.append('recommendation', recommendation.trim());

  // Checklist fields - send as string 'true'/'false' for BooleanField
  if (isImportantForScientificCommunity !== null) {
    formData.append('is_important_for_scientific_community', String(isImportantForScientificCommunity));
  }
  if (isTitleSuitable !== null) {
    formData.append('is_title_suitable', String(isTitleSuitable));
  }
  if (alternativeTitle.trim()) {
    formData.append('alternative_title', alternativeTitle.trim());
  }
  if (isAbstractComprehensive !== null) {
    formData.append('is_abstract_comprehensive', String(isAbstractComprehensive));
  }
  if (isIntroConclusionSufficient !== null) {
    formData.append('is_intro_conclusion_sufficient', String(isIntroConclusionSufficient));
  }
  if (isStructureAppropriate !== null) {
    formData.append('is_structure_appropriate', String(isStructureAppropriate));
  }
  if (areReferencesSufficient !== null) {
    formData.append('are_references_sufficient', String(areReferencesSufficient));
  }
  if (additionalReferences.trim()) {
    formData.append('additional_references', additionalReferences.trim());
  }
  if (isLanguageQualitySuitable !== null) {
    formData.append('is_language_quality_suitable', String(isLanguageQualitySuitable));
  }

  if (reportFile) formData.append('review_report', reportFile);
  if (plagiarismReportFile) formData.append('plagiarism_report', plagiarismReportFile);

  try {
    const res = await fetch(apiUrl(`review-assignments/${assignmentId}/`), {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) {
      let errorMessage = `Update failed (${res.status})`;

      try {
        const errData: any = await res.json();
        const firstValue = Object.values(errData as Record<string, any>)[0];
        errorMessage = errData.detail ||
                       errData.message ||
                       firstValue?.[0] ||
                       errorMessage;
      } catch (e) {
        // fallback
      }

      throw new Error(errorMessage);
    }

    // Success
    alert('Review updated successfully!');
    await onRefresh?.();

    // Reset everything
    setSelectedAssignment(null);
    setRemarks('');
    setCommentToAuthor('');
    setCommentToEditor('');
    setRecommendation('');
    setReportFile(null);
    setPlagiarismReportFile(null);
    setUpdateError('');
    
    // Reset checklist fields
    setIsImportantForScientificCommunity(null);
    setIsTitleSuitable(null);
    setAlternativeTitle('');
    setIsAbstractComprehensive(null);
    setIsIntroConclusionSufficient(null);
    setIsStructureAppropriate(null);
    setAreReferencesSufficient(null);
    setAdditionalReferences('');
    setIsLanguageQualitySuitable(null);

  } catch (err: any) {
    console.error('Review update failed:', err);
    setUpdateError(err.message || 'Failed to update review. Please try again.');
  } finally {
    setUpdatingId(null);
  }
};

  const getBackendBaseUrl = () => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api';
    return apiBase.replace(/\/api\/?$/, '');
  };

  const normalizeManuscriptPath = (filePath?: string) => {
    if (!filePath) return '';

    const trimmed = filePath.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//')) {
      return trimmed;
    }

    const withoutLeadingSlash = trimmed.replace(/^\/+/, '');
    if (withoutLeadingSlash.startsWith('api/')) {
      return withoutLeadingSlash.replace(/^api\//, '');
    }

    return withoutLeadingSlash.startsWith('media/')
      ? withoutLeadingSlash
      : `media/${withoutLeadingSlash}`;
  };

  const getManuscriptUrl = (filePath?: string) => {
    const normalizedPath = normalizeManuscriptPath(filePath);
    if (!normalizedPath) return '';

    if (/^(http|https):/i.test(normalizedPath)) {
      return normalizedPath;
    }

    return new URL(normalizedPath, getBackendBaseUrl()).href;
  };

  const getFileExtension = (filePath?: string) => {
    if (!filePath) return '';

    const cleanPath = filePath.split('?')[0].split('#')[0].replace(/\\/g, '/');
    const fileName = cleanPath.substring(cleanPath.lastIndexOf('/') + 1);
    return fileName.split('.').pop()?.toLowerCase() || '';
  };

  const isPdfFile = (filePath?: string) => getFileExtension(filePath) === 'pdf';
  const isWordFile = (filePath?: string) => {
    const ext = getFileExtension(filePath);
    return ext === 'doc' || ext === 'docx';
  };

  const getPreviewUrl = (filePath?: string) => {
    if (!filePath) return '';

    const absoluteUrl = getManuscriptUrl(filePath);
    if (!absoluteUrl) return '';

    if (isPdfFile(filePath)) {
      return absoluteUrl;
    }

    if (isWordFile(filePath)) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`;
    }

    return '';
  };

  const handleDownloadManuscript = (filePath?: string, title?: string) => {
    if (!filePath) {
      alert('No manuscript file available for download');
      return;
    }

    const fullUrl = getManuscriptUrl(filePath);
    const ext = getFileExtension(filePath);
    const downloadName = `${(title || 'manuscript').replace(/[^a-zA-Z0-9]/g, '_')}${ext ? `.${ext}` : ''}`;

    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = downloadName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewManuscript = (assignmentId: number) => {
    setPreviewManuscriptId((prev) => (prev === assignmentId ? null : assignmentId));
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8 text-gray-900">Assigned Manuscripts for Review</h2>

      {assignments.length === 0 ? (
        <p className="text-gray-500 text-center py-20 text-lg">
          No manuscripts assigned to you yet.
        </p>
      ) : (
        <div className="space-y-8">
          {assignments.map((assignment) => {
            const filePath = assignment.submission_file || '';
            const isSelected = selectedAssignment?.id === assignment.id;
            const isUpdating = updatingId === assignment.id;

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
                    {assignment.submission_version_number ? (
                      <p className="text-sm text-indigo-700 mt-1">
                        Version: V{assignment.submission_version_number} ({formatVersionType(assignment.submission_version_type)})
                      </p>
                    ) : (
                      <p className="text-sm text-indigo-700 mt-1">Version: Latest</p>
                    )}
                    <p className="text-gray-600 mt-1">
                      Due Date: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>

                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      assignment.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : assignment.status === 'in_progress'
                        ? 'bg-yellow-100 text-yellow-800'
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
                    onClick={() => handleViewManuscript(assignment.id)}
                    disabled={!filePath || isUpdating}
                    className={`flex items-center gap-2 px-6 py-3 border rounded-xl transition font-medium ${
                      filePath
                        ? 'border-green-600 text-green-700 hover:bg-green-50'
                        : 'border-gray-300 text-gray-400 cursor-not-allowed'
                    } ${isUpdating ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <Eye size={18} />
                    {previewManuscriptId === assignment.id ? 'Hide Preview' : (filePath ? 'View Manuscript' : 'No File Available')}
                  </button>

                  <button
                    onClick={() => setSelectedAssignment(isSelected ? null : assignment)}
                    disabled={isUpdating}
                    className={`flex items-center gap-2 px-6 py-3 border rounded-xl transition font-medium ${
                      isSelected
                        ? 'border-gray-400 text-gray-700 bg-gray-100'
                        : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                    } ${isUpdating ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <Edit3 size={18} />
                    {isSelected ? 'Close Form' : 'Update Review'}
                  </button>

                  {/* <button
                    onClick={() => setOpenDiscussionId(openDiscussionId === assignment.id ? null : assignment.id)}
                    disabled={isUpdating}
                    className={`flex items-center gap-2 px-6 py-3 border rounded-xl transition font-medium ${
                      openDiscussionId === assignment.id
                        ? 'border-indigo-400 text-indigo-700 bg-indigo-50'
                        : 'border-indigo-600 text-indigo-600 hover:bg-indigo-50'
                    } ${isUpdating ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <MessageSquare size={18} />
                    {openDiscussionId === assignment.id ? 'Close Discussion' : 'Open Discussion'}
                  </button> */}
                </div>

                {previewManuscriptId === assignment.id && filePath && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Manuscript Preview</h4>
                        <p className="text-sm text-gray-500">Preview the submitted manuscript directly in this card.</p>
                      </div>
                      <button
                        onClick={() => setPreviewManuscriptId(null)}
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        Close
                      </button>
                    </div>

                    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                      {getPreviewUrl(filePath) ? (
                        <iframe
                          src={getPreviewUrl(filePath)}
                          title="Manuscript Preview"
                          className="w-full"
                          style={{ height: '640px', border: 'none' }}
                          allowFullScreen
                        />
                      ) : (
                        <div className="flex h-[320px] flex-col items-center justify-center gap-3 bg-white p-6 text-center">
                          <FileText size={40} className="text-gray-400" />
                          <p className="text-gray-700">This file type cannot be previewed directly in the browser.</p>
                          <a
                            href={getManuscriptUrl(filePath)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
                          >
                            Open in new tab
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

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
                        <p className="text-xs text-gray-500 mt-1">
                          Attach your review report with plagiarism check results (optional)
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">
                          Upload Plagiarism Report (optional)
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => setPlagiarismReportFile(e.target.files?.[0] || null)}
                          disabled={isUpdating}
                          className="w-full p-3 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition disabled:opacity-60"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Attach a separate plagiarism report file if available.
                        </p>
                      </div>
                    </div>

                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>💡 Tip:</strong> Use the <strong>"Plagiarism Check"</strong> tab to verify plagiarism in the manuscript before submitting your review report. You can upload the plagiarism report file here.
                      </p>
                      <p className="text-sm text-blue-800 mt-2">
                        <strong>Checklist Required:</strong> All manuscript quality checklist questions must be answered before review submission.
                      </p>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        Your Remarks / Comments
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

                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        Comments to Author
                      </label>
                      <textarea
                        value={commentToAuthor}
                        onChange={(e) => setCommentToAuthor(e.target.value)}
                        disabled={isUpdating}
                        rows={4}
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:opacity-60"
                        placeholder="Comments that will be shared with the author..."
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        Comments to Editor
                      </label>
                      <textarea
                        value={commentToEditor}
                        onChange={(e) => setCommentToEditor(e.target.value)}
                        disabled={isUpdating}
                        rows={4}
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:opacity-60"
                        placeholder="Private comments for the editor only..."
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        Recommendation
                      </label>
                      <select
                        value={recommendation}
                        onChange={(e) => setRecommendation(e.target.value)}
                        disabled={isUpdating}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:opacity-60"
                      >
                        <option value="">Select recommendation...</option>
                        <option value="accept">Accept</option>
                        <option value="minor_revision">Minor Revision</option>
                        <option value="major_revision">Major Revision</option>
                        <option value="reject">Reject</option>
                      </select>
                    </div>

                    {/* Manuscript Quality Checklist */}
                    <div className="mt-8 p-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-200">
                      <h4 className="font-semibold text-lg mb-6 text-indigo-900 flex items-center gap-2">
                        <span className="text-xl">📋</span> Manuscript Quality Checklist
                      </h4>
                      
                      <div className="space-y-5">
                        {/* 1. Important for scientific community */}
                        <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                          <p className="text-sm font-medium text-gray-800 mb-3">
                            1. Is the manuscript important for scientific community?
                          </p>
                          <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`important_${assignment.id}`}
                                checked={isImportantForScientificCommunity === true}
                                onChange={() => setIsImportantForScientificCommunity(true)}
                                disabled={isUpdating}
                                className="w-5 h-5 text-green-600 focus:ring-green-500"
                              />
                              <span className="text-sm font-medium text-green-700">✓ Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`important_${assignment.id}`}
                                checked={isImportantForScientificCommunity === false}
                                onChange={() => setIsImportantForScientificCommunity(false)}
                                disabled={isUpdating}
                                className="w-5 h-5 text-red-600 focus:ring-red-500"
                              />
                              <span className="text-sm font-medium text-red-700">✗ No</span>
                            </label>
                          </div>
                        </div>

                        {/* 2. Title suitable */}
                        <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                          <p className="text-sm font-medium text-gray-800 mb-3">
                            2. Is the title of the article suitable?
                          </p>
                          <div className="flex gap-6 mb-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`title_${assignment.id}`}
                                checked={isTitleSuitable === true}
                                onChange={() => setIsTitleSuitable(true)}
                                disabled={isUpdating}
                                className="w-5 h-5 text-green-600 focus:ring-green-500"
                              />
                              <span className="text-sm font-medium text-green-700">✓ Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`title_${assignment.id}`}
                                checked={isTitleSuitable === false}
                                onChange={() => setIsTitleSuitable(false)}
                                disabled={isUpdating}
                                className="w-5 h-5 text-red-600 focus:ring-red-500"
                              />
                              <span className="text-sm font-medium text-red-700">✗ No</span>
                            </label>
                          </div>
                          {isTitleSuitable === false && (
                            <div className="mt-3">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                If not suitable, please suggest an alternative title:
                              </label>
                              <textarea
                                value={alternativeTitle}
                                onChange={(e) => setAlternativeTitle(e.target.value)}
                                disabled={isUpdating}
                                rows={2}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm"
                                placeholder="Suggest an alternative title..."
                              />
                            </div>
                          )}
                        </div>

                        {/* 3. Abstract comprehensive */}
                        <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                          <p className="text-sm font-medium text-gray-800 mb-3">
                            3. Is the abstract of the article comprehensive?
                          </p>
                          <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`abstract_${assignment.id}`}
                                checked={isAbstractComprehensive === true}
                                onChange={() => setIsAbstractComprehensive(true)}
                                disabled={isUpdating}
                                className="w-5 h-5 text-green-600 focus:ring-green-500"
                              />
                              <span className="text-sm font-medium text-green-700">✓ Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`abstract_${assignment.id}`}
                                checked={isAbstractComprehensive === false}
                                onChange={() => setIsAbstractComprehensive(false)}
                                disabled={isUpdating}
                                className="w-5 h-5 text-red-600 focus:ring-red-500"
                              />
                              <span className="text-sm font-medium text-red-700">✗ No</span>
                            </label>
                          </div>
                        </div>

                        {/* 4. Introduction and conclusion */}
                        <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                          <p className="text-sm font-medium text-gray-800 mb-3">
                            4. Do the author(s) provide a sufficient overview in the introduction and conclusion of this manuscript?
                          </p>
                          <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`intro_${assignment.id}`}
                                checked={isIntroConclusionSufficient === true}
                                onChange={() => setIsIntroConclusionSufficient(true)}
                                disabled={isUpdating}
                                className="w-5 h-5 text-green-600 focus:ring-green-500"
                              />
                              <span className="text-sm font-medium text-green-700">✓ Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`intro_${assignment.id}`}
                                checked={isIntroConclusionSufficient === false}
                                onChange={() => setIsIntroConclusionSufficient(false)}
                                disabled={isUpdating}
                                className="w-5 h-5 text-red-600 focus:ring-red-500"
                              />
                              <span className="text-sm font-medium text-red-700">✗ No</span>
                            </label>
                          </div>
                        </div>

                        {/* 5. Structure appropriate */}
                        <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                          <p className="text-sm font-medium text-gray-800 mb-3">
                            5. Are subsections and structure of the manuscript appropriate?
                          </p>
                          <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`structure_${assignment.id}`}
                                checked={isStructureAppropriate === true}
                                onChange={() => setIsStructureAppropriate(true)}
                                disabled={isUpdating}
                                className="w-5 h-5 text-green-600 focus:ring-green-500"
                              />
                              <span className="text-sm font-medium text-green-700">✓ Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`structure_${assignment.id}`}
                                checked={isStructureAppropriate === false}
                                onChange={() => setIsStructureAppropriate(false)}
                                disabled={isUpdating}
                                className="w-5 h-5 text-red-600 focus:ring-red-500"
                              />
                              <span className="text-sm font-medium text-red-700">✗ No</span>
                            </label>
                          </div>
                        </div>

                        {/* 6. References sufficient */}
                        <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                          <p className="text-sm font-medium text-gray-800 mb-3">
                            6. Are the references sufficient and recent?
                          </p>
                          <div className="flex gap-6 mb-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`references_${assignment.id}`}
                                checked={areReferencesSufficient === true}
                                onChange={() => setAreReferencesSufficient(true)}
                                disabled={isUpdating}
                                className="w-5 h-5 text-green-600 focus:ring-green-500"
                              />
                              <span className="text-sm font-medium text-green-700">✓ Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`references_${assignment.id}`}
                                checked={areReferencesSufficient === false}
                                onChange={() => setAreReferencesSufficient(false)}
                                disabled={isUpdating}
                                className="w-5 h-5 text-red-600 focus:ring-red-500"
                              />
                              <span className="text-sm font-medium text-red-700">✗ No</span>
                            </label>
                          </div>
                          {areReferencesSufficient === false && (
                            <div className="mt-3">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                If not sufficient, please suggest additional references:
                              </label>
                              <textarea
                                value={additionalReferences}
                                onChange={(e) => setAdditionalReferences(e.target.value)}
                                disabled={isUpdating}
                                rows={3}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm"
                                placeholder="Suggest additional references (title, authors, year, journal)..."
                              />
                            </div>
                          )}
                        </div>

                        {/* 7. Language quality */}
                        <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                          <p className="text-sm font-medium text-gray-800 mb-3">
                            7. Is language/English quality of the article suitable for scholarly communications?
                          </p>
                          <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`language_${assignment.id}`}
                                checked={isLanguageQualitySuitable === true}
                                onChange={() => setIsLanguageQualitySuitable(true)}
                                disabled={isUpdating}
                                className="w-5 h-5 text-green-600 focus:ring-green-500"
                              />
                              <span className="text-sm font-medium text-green-700">✓ Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`language_${assignment.id}`}
                                checked={isLanguageQualitySuitable === false}
                                onChange={() => setIsLanguageQualitySuitable(false)}
                                disabled={isUpdating}
                                className="w-5 h-5 text-red-600 focus:ring-red-500"
                              />
                              <span className="text-sm font-medium text-red-700">✗ No</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 mt-8">
                      <button
                        onClick={() => handleUpdate(assignment.id)}
                        disabled={isUpdating || !isChecklistComplete()}
                        className={`px-8 py-3 text-white rounded-xl transition font-medium shadow-sm flex items-center justify-center gap-2 min-w-[160px] ${
                          isUpdating || !isChecklistComplete()
                            ? 'bg-green-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        <CheckCircle size={18} />
                        {isUpdating ? 'Submitting...' : 'Submit Review'}
                      </button>

                      <button
                        onClick={() => setSelectedAssignment(null)}
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

                {openDiscussionId === assignment.id && (
                  <div className="mt-8">
                    <ManuscriptDiscussion
                      submissionId={assignment.submission}
                      title="Anonymous Discussion With Author"
                    />
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