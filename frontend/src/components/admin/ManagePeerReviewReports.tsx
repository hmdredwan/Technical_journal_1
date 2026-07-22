// src/components/admin/ManagePeerReviewReports.tsx
'use client';

import { useState, useEffect, Fragment } from 'react';
import { apiUrl } from '@/utils/api';
import { 
  ChevronDown, ChevronRight, FileText, Eye, MessageSquare, 
  Loader2, AlertCircle, Download 
} from 'lucide-react';

interface ReviewAssignment {
  id: number;
  submission: number;
  submission_title: string;
  submission_code?: string | null;
  submission_abstract: string;
  submission_keywords: string;
  assigned_to_name: string;
  assigned_to_email: string;
  status: string;
  status_display: string;
  comment_to_author: string;
  comment_to_editor: string;
  recommendation: string;
  review_report: string;
  plagiarism_report?: string;
  reviewer_remarks: string;
  submitted_at: string;
  invite_response?: string;
  // Checklist fields
  is_important_for_scientific_community: boolean | null;
  is_title_suitable: boolean | null;
  alternative_title: string | null;
  is_abstract_comprehensive: boolean | null;
  is_intro_conclusion_sufficient: boolean | null;
  is_structure_appropriate: boolean | null;
  are_references_sufficient: boolean | null;
  additional_references: string | null;
  is_language_quality_suitable: boolean | null;
  // Feedback tracking fields
  feedback_sent_to_author: boolean;
  feedback_sent_at: string | null;
  feedback_sent_by_name: string | null;
}

interface SubmissionGroup {
  submission_id: number;
  title: string;
  submission_code?: string | null;
  abstract: string;
  keywords: string;
  reviews: ReviewAssignment[];
  positiveCount: number;
}

export default function ManagePeerReviewReports() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submissions, setSubmissions] = useState<SubmissionGroup[]>([]);
  const [expandedSubmission, setExpandedSubmission] = useState<number | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [sendSuccess, setSendSuccess] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const t = localStorage.getItem('access_token');
    setToken(t);
    if (t) {
      fetchReviewAssignments(t);
    } else {
      setLoading(false);
    }
  }, []);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(submissions.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(submissions.length, startIndex + rowsPerPage);
  const currentPageSubmissions = submissions.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [submissions, rowsPerPage]);

  const fetchReviewAssignments = async (authToken: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(apiUrl('review-assignments/'), {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch review assignments: ${response.status}`);
      }

      const data: ReviewAssignment[] = await response.json();

      // Group by submission and keep only accepted reviewer invitations
      const grouped: { [key: number]: ReviewAssignment[] } = {};
      data.forEach(review => {
        if (String(review.invite_response || '').toLowerCase() !== 'accepted') {
          return;
        }

        if (!grouped[review.submission]) {
          grouped[review.submission] = [];
        }
        grouped[review.submission].push(review);
      });

      const parseTimestamp = (value: string | null) => value ? new Date(value).getTime() : 0;
      const getLatestReviewTimestamp = (reviews: ReviewAssignment[]) =>
        reviews.reduce((latest, review) => Math.max(latest, parseTimestamp(review.submitted_at)), 0);

      // Convert to SubmissionGroup and sort groups by newest review first
      const submissionGroups: SubmissionGroup[] = Object.keys(grouped).map(subId => {
        const reviews = grouped[parseInt(subId)].slice();
        reviews.sort((a, b) => parseTimestamp(b.submitted_at) - parseTimestamp(a.submitted_at));

        const positiveCount = reviews.filter(r => 
          r.recommendation && 
          (r.recommendation.toLowerCase().includes('accept') || 
           r.recommendation.toLowerCase().includes('minor'))
        ).length;

        return {
          submission_id: parseInt(subId),
          title: reviews[0].submission_title,
          submission_code: reviews[0].submission_code || null,
          abstract: reviews[0].submission_abstract,
          keywords: reviews[0].submission_keywords,
          reviews,
          positiveCount,
        };
      });

      submissionGroups.sort((a, b) => getLatestReviewTimestamp(b.reviews) - getLatestReviewTimestamp(a.reviews));

      setSubmissions(submissionGroups);
    } catch (err: any) {
      console.error('Error fetching review assignments:', err);
      setError(err.message || 'Failed to load peer review reports');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (submissionId: number) => {
    setExpandedSubmission(expandedSubmission === submissionId ? null : submissionId);
  };

  const handleRefresh = () => {
    if (token) {
      fetchReviewAssignments(token);
    }
  };

  const handleSendToAuthor = async (reviewId: number) => {
    if (!token) return;
    
    setSendingId(reviewId);
    setSendSuccess(null);

    try {
      const response = await fetch(apiUrl(`review-assignments/${reviewId}/send-to-author/`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send feedback to author');
      }

      setSendSuccess(reviewId);
      // Refresh the list to get updated feedback_sent_to_author status
      fetchReviewAssignments(token);
    } catch (err: any) {
      console.error('Error sending feedback to author:', err);
      alert(err.message || 'Failed to send feedback to author');
    } finally {
      setSendingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <span className="ml-4 text-lg text-gray-600">Loading peer review reports...</span>
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
          onClick={handleRefresh}
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
          <MessageSquare className="text-indigo-600" size={32} />
          Peer Review Reports
        </h2>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          <Loader2 size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {submissions.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <FileText className="mx-auto mb-4 text-gray-400" size={64} />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No review reports yet</h3>
          <p className="text-gray-500">Completed peer reviews will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          {/* Desktop View - Accordion Style */}
          <div className="hidden lg:block">
            <div className="divide-y">
              {currentPageSubmissions.map((sub) => (
                <div key={sub.submission_id} className="border-b last:border-b-0">
                  <div
                    className="px-6 py-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => toggleExpanded(sub.submission_id)}
                  >
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900">{sub.title}</h4>
                      {sub.submission_code && (
                        <p className="text-sm font-semibold text-indigo-700 mt-1">Manuscript ID: {sub.submission_code}</p>
                      )}
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2 pr-8">{sub.abstract}</p>
                      <div className="flex items-center gap-6 mt-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <FileText size={16} /> 
                          {sub.reviews.length} Reviewer{sub.reviews.length !== 1 ? 's' : ''}
                        </span>
                        <span>Positive Recommendations: {sub.positiveCount}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-indigo-600">
                      <Eye size={20} />
                      {expandedSubmission === sub.submission_id ? (
                        <ChevronDown size={22} />
                      ) : (
                        <ChevronRight size={22} />
                      )}
                    </div>
                  </div>

                  {expandedSubmission === sub.submission_id && (
                    <div className="px-6 pb-6">
                      <div className="space-y-4">
                        {sub.reviews.map((review) => (
                          <div key={review.id} className="bg-gray-50 border rounded-xl p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h5 className="font-semibold text-gray-900">{review.assigned_to_name}</h5>
                                <p className="text-sm text-gray-500">{review.assigned_to_email}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {review.feedback_sent_to_author ? (
                                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                                    ✓ Sent to Author
                                  </span>
                                ) : (review.status === 'completed' || review.status === 'submitted') ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSendToAuthor(review.id);
                                    }}
                                    disabled={sendingId === review.id}
                                    className="px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded-full hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {sendingId === review.id ? (
                                      <>
                                        <Loader2 size={12} className="animate-spin" />
                                        Sending...
                                      </>
                                    ) : (
                                      <>Send to Author</>
                                    )}
                                  </button>
                                ) : null}
                                <span className={`px-4 py-1 rounded-full text-xs font-medium ${
                                  review.status === 'completed' || review.status === 'submitted'
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {review.status_display}
                                </span>
                              </div>
                            </div>

                            {review.comment_to_author && (
                              <div className="mb-4">
                                <h6 className="text-sm font-medium text-gray-700 mb-2">Comment to Author</h6>
                                <p className="text-sm text-gray-600 bg-white p-4 rounded-lg border">
                                  {review.comment_to_author}
                                </p>
                              </div>
                            )}

                            {review.comment_to_editor && (
                              <div className="mb-4">
                                <h6 className="text-sm font-medium text-gray-700 mb-2">Comment to Editor</h6>
                                <p className="text-sm text-gray-600 bg-white p-4 rounded-lg border">
                                  {review.comment_to_editor}
                                </p>
                              </div>
                            )}

                            {review.recommendation && (
                              <div className="mb-4">
                                <h6 className="text-sm font-medium text-gray-700 mb-2">Recommendation</h6>
                                <p className="text-sm bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                                  {review.recommendation}
                                </p>
                              </div>
                            )}

                            {/* Manuscript Quality Checklist */}
                            {(review.is_important_for_scientific_community !== null || 
                              review.is_title_suitable !== null || 
                              review.is_abstract_comprehensive !== null ||
                              review.is_intro_conclusion_sufficient !== null ||
                              review.is_structure_appropriate !== null ||
                              review.are_references_sufficient !== null ||
                              review.is_language_quality_suitable !== null) && (
                              <div className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200">
                                <h6 className="text-sm font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                                  <span>📋</span> Manuscript Quality Checklist
                                </h6>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {review.is_important_for_scientific_community !== null && (
                                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
                                      <span className="text-xs text-gray-700">Important for scientific community?</span>
                                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                        review.is_important_for_scientific_community 
                                          ? 'bg-green-100 text-green-700' 
                                          : 'bg-red-100 text-red-700'
                                      }`}>
                                        {review.is_important_for_scientific_community ? '✓ Yes' : '✗ No'}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {review.is_title_suitable !== null && (
                                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
                                      <span className="text-xs text-gray-700">Title suitable?</span>
                                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                        review.is_title_suitable 
                                          ? 'bg-green-100 text-green-700' 
                                          : 'bg-red-100 text-red-700'
                                      }`}>
                                        {review.is_title_suitable ? '✓ Yes' : '✗ No'}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {review.is_title_suitable === false && review.alternative_title && (
                                    <div className="md:col-span-2 bg-white p-3 rounded-lg border">
                                      <span className="text-xs font-medium text-gray-700">Alternative Title Suggested:</span>
                                      <p className="text-sm text-gray-600 mt-1">{review.alternative_title}</p>
                                    </div>
                                  )}
                                  
                                  {review.is_abstract_comprehensive !== null && (
                                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
                                      <span className="text-xs text-gray-700">Abstract comprehensive?</span>
                                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                        review.is_abstract_comprehensive 
                                          ? 'bg-green-100 text-green-700' 
                                          : 'bg-red-100 text-red-700'
                                      }`}>
                                        {review.is_abstract_comprehensive ? '✓ Yes' : '✗ No'}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {review.is_intro_conclusion_sufficient !== null && (
                                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
                                      <span className="text-xs text-gray-700">Intro & conclusion sufficient?</span>
                                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                        review.is_intro_conclusion_sufficient 
                                          ? 'bg-green-100 text-green-700' 
                                          : 'bg-red-100 text-red-700'
                                      }`}>
                                        {review.is_intro_conclusion_sufficient ? '✓ Yes' : '✗ No'}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {review.is_structure_appropriate !== null && (
                                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
                                      <span className="text-xs text-gray-700">Structure appropriate?</span>
                                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                        review.is_structure_appropriate 
                                          ? 'bg-green-100 text-green-700' 
                                          : 'bg-red-100 text-red-700'
                                      }`}>
                                        {review.is_structure_appropriate ? '✓ Yes' : '✗ No'}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {review.are_references_sufficient !== null && (
                                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
                                      <span className="text-xs text-gray-700">References sufficient?</span>
                                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                        review.are_references_sufficient 
                                          ? 'bg-green-100 text-green-700' 
                                          : 'bg-red-100 text-red-700'
                                      }`}>
                                        {review.are_references_sufficient ? '✓ Yes' : '✗ No'}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {review.are_references_sufficient === false && review.additional_references && (
                                    <div className="md:col-span-2 bg-white p-3 rounded-lg border">
                                      <span className="text-xs font-medium text-gray-700">Additional References Suggested:</span>
                                      <p className="text-sm text-gray-600 mt-1">{review.additional_references}</p>
                                    </div>
                                  )}
                                  
                                  {review.is_language_quality_suitable !== null && (
                                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
                                      <span className="text-xs text-gray-700">Language quality suitable?</span>
                                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                        review.is_language_quality_suitable 
                                          ? 'bg-green-100 text-green-700' 
                                          : 'bg-red-100 text-red-700'
                                      }`}>
                                        {review.is_language_quality_suitable ? '✓ Yes' : '✗ No'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {review.review_report && (
                              <div className="mb-4">
                                <h6 className="text-sm font-medium text-gray-700 mb-2">Review Report</h6>
                                <a
                                  href={review.review_report}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline"
                                >
                                  <Download size={18} />
                                  Download Review Report
                                </a>
                              </div>
                            )}

                            {review.plagiarism_report && (
                              <div className="mb-4">
                                <h6 className="text-sm font-medium text-gray-700 mb-2">Plagiarism Report</h6>
                                <a
                                  href={review.plagiarism_report}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline"
                                >
                                  <Download size={18} />
                                  Download Plagiarism Report
                                </a>
                              </div>
                            )}

                            {review.submitted_at && (
                              <p className="text-xs text-gray-500 mt-4">
                                Submitted on: {new Date(review.submitted_at).toLocaleDateString('en-US', {
                                  year: 'numeric', month: 'long', day: 'numeric'
                                })}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y">
            {currentPageSubmissions.map((sub) => (
              <Fragment key={sub.submission_id}>
                <div className="p-6">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleExpanded(sub.submission_id)}
                  >
                    <div className="flex-1 pr-4">
                      <h4 className="font-semibold text-gray-900 line-clamp-2">{sub.title}</h4>
                      <div className="mt-3 text-sm text-gray-600 space-y-1">
                        <p>Reviews: {sub.reviews.length}</p>
                        <p>Positive: {sub.positiveCount}</p>
                      </div>
                    </div>
                    <div className="text-indigo-600">
                      {expandedSubmission === sub.submission_id ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                    </div>
                  </div>

                  {expandedSubmission === sub.submission_id && (
                    <div className="mt-6 space-y-4">
                      {sub.reviews.map((review) => (
                        <div key={review.id} className="bg-white border rounded-xl p-5">
                          {/* Same review content as desktop */}
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h5 className="font-medium">{review.assigned_to_name}</h5>
                              <p className="text-sm text-gray-500">{review.assigned_to_email}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {review.feedback_sent_to_author ? (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                  ✓ Sent
                                </span>
                              ) : (review.status === 'completed' || review.status === 'submitted') ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSendToAuthor(review.id);
                                  }}
                                  disabled={sendingId === review.id}
                                  className="px-2 py-1 bg-indigo-600 text-white text-xs font-medium rounded-full hover:bg-indigo-700 disabled:opacity-50"
                                >
                                  {sendingId === review.id ? 'Sending...' : 'Send to Author'}
                                </button>
                              ) : null}
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                review.status === 'completed' || review.status === 'submitted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {review.status_display}
                              </span>
                            </div>
                          </div>

                          {review.comment_to_author && (
                            <div className="mb-4">
                              <h6 className="text-sm font-medium mb-1">Comment to Author</h6>
                              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{review.comment_to_author}</p>
                            </div>
                          )}

                          {review.recommendation && (
                            <div className="mb-4">
                              <h6 className="text-sm font-medium mb-1">Recommendation</h6>
                              <p className="text-sm bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                                {review.recommendation}
                              </p>
                            </div>
                          )}

                          {/* Manuscript Quality Checklist - Mobile */}
                          {(review.is_important_for_scientific_community !== null || 
                            review.is_title_suitable !== null || 
                            review.is_abstract_comprehensive !== null ||
                            review.is_intro_conclusion_sufficient !== null ||
                            review.is_structure_appropriate !== null ||
                            review.are_references_sufficient !== null ||
                            review.is_language_quality_suitable !== null) && (
                            <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                              <h6 className="text-xs font-semibold text-indigo-900 mb-2">📋 Quality Checklist</h6>
                              <div className="space-y-2">
                                {review.is_important_for_scientific_community !== null && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Important for science?</span>
                                    <span className={review.is_important_for_scientific_community ? 'text-green-600' : 'text-red-600'}>
                                      {review.is_important_for_scientific_community ? '✓ Yes' : '✗ No'}
                                    </span>
                                  </div>
                                )}
                                {review.is_title_suitable !== null && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Title suitable?</span>
                                    <span className={review.is_title_suitable ? 'text-green-600' : 'text-red-600'}>
                                      {review.is_title_suitable ? '✓ Yes' : '✗ No'}
                                    </span>
                                  </div>
                                )}
                                {review.is_abstract_comprehensive !== null && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Abstract comprehensive?</span>
                                    <span className={review.is_abstract_comprehensive ? 'text-green-600' : 'text-red-600'}>
                                      {review.is_abstract_comprehensive ? '✓ Yes' : '✗ No'}
                                    </span>
                                  </div>
                                )}
                                {review.is_intro_conclusion_sufficient !== null && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Intro & conclusion?</span>
                                    <span className={review.is_intro_conclusion_sufficient ? 'text-green-600' : 'text-red-600'}>
                                      {review.is_intro_conclusion_sufficient ? '✓ Yes' : '✗ No'}
                                    </span>
                                  </div>
                                )}
                                {review.is_structure_appropriate !== null && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Structure appropriate?</span>
                                    <span className={review.is_structure_appropriate ? 'text-green-600' : 'text-red-600'}>
                                      {review.is_structure_appropriate ? '✓ Yes' : '✗ No'}
                                    </span>
                                  </div>
                                )}
                                {review.are_references_sufficient !== null && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">References sufficient?</span>
                                    <span className={review.are_references_sufficient ? 'text-green-600' : 'text-red-600'}>
                                      {review.are_references_sufficient ? '✓ Yes' : '✗ No'}
                                    </span>
                                  </div>
                                )}
                                {review.is_language_quality_suitable !== null && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Language quality?</span>
                                    <span className={review.is_language_quality_suitable ? 'text-green-600' : 'text-red-600'}>
                                      {review.is_language_quality_suitable ? '✓ Yes' : '✗ No'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {review.review_report && (
                            <div className="mb-3">
                              <a
                                href={review.review_report}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm"
                              >
                                <Download size={16} />
                                Download Review Report
                              </a>
                            </div>
                          )}

                          {review.plagiarism_report && (
                            <div className="mb-3">
                              <a
                                href={review.plagiarism_report}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm"
                              >
                                <Download size={16} />
                                Download Plagiarism Report
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Fragment>
            ))}
          </div>

          {/* Pagination */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">
              Showing {startIndex + 1}–{endIndex} of {submissions.length} submissions
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span>Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
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
    </div>
  );
}