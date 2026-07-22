// src/app/author-dashboard/my-submissions/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import UserDashboardLayout from '@/components/user/UserDashboardLayout';
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, Eye, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';
import { apiUrl } from '@/utils/api';

export default function MySubmissions() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [expandedFeedback, setExpandedFeedback] = useState<number | null>(null);
  const [expandedManuscript, setExpandedManuscript] = useState<number | null>(null);

  // Read token only on client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('access_token');
      setToken(storedToken);
    }
  }, []);

  // Fetch submissions
  useEffect(() => {
    if (token === null) return; // wait for token

    if (!token) {
      setError('You need to be logged in to view your submissions.');
      setLoading(false);
      return;
    }

    const fetchMySubmissions = async () => {
      try {
        const res = await fetch(apiUrl('author-submissions/'), {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            setError('Session expired. Please log in again.');
            // Optional: auto-redirect to login
            // setTimeout(() => window.location.href = '/login', 2000);
          } else {
            const errText = await res.text().catch(() => 'Unknown server error');
            throw new Error(`Failed to load submissions (${res.status}): ${errText}`);
          }
        } else {
          const data = await res.json();
          setSubmissions(Array.isArray(data) ? data : data.results || []);
        }
      } catch (err: any) {
        setError(err.message || 'Could not load your submissions. Please try again later.');
        console.error('Submissions fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMySubmissions();
  }, [token]);

  const getStatusIcon = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('submitted'))    return <Clock className="text-blue-500" size={22} />;
    if (s.includes('review') || s.includes('desk')) return <AlertCircle className="text-yellow-500" size={22} />;
    if (s.includes('accepted'))     return <CheckCircle className="text-green-500" size={22} />;
    if (s.includes('rejected'))     return <XCircle className="text-red-500" size={22} />;
    return <FileText className="text-gray-500" size={22} />;
  };

  const getStatusStyles = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('submitted'))    return 'bg-blue-100 text-blue-800 border border-blue-200';
    if (s.includes('review') || s.includes('desk')) return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    if (s.includes('accepted'))     return 'bg-green-100 text-green-800 border border-green-200';
    if (s.includes('rejected'))     return 'bg-red-100 text-red-800 border border-red-200';
    return 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getFileUrl = (filePath?: string) => {
    if (!filePath) return '#';
    if (filePath.startsWith('http') || filePath.startsWith('//')) return filePath;

    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    const normalized = cleanPath.startsWith('api/') ? cleanPath.replace(/^api\//, '') : cleanPath;

    return apiUrl(normalized.startsWith('media/') ? normalized : `media/${normalized}`);
  };

  const getFileExtension = (filePath: string) => {
    const withoutQuery = filePath.split('?')[0] || filePath;
    const parts = withoutQuery.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase().trim() : '';
  };

  const isPdfFile = (filePath: string) => getFileExtension(filePath) === 'pdf';
  const isWordFile = (filePath: string) => {
    const ext = getFileExtension(filePath);
    return ext === 'doc' || ext === 'docx';
  };

  const getOfficeViewerUrl = (filePath: string) => {
    const absoluteUrl = typeof window !== 'undefined'
      ? new URL(getFileUrl(filePath), window.location.origin).href
      : getFileUrl(filePath);

    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`;
  };

  const getPreviewUrl = (filePath?: string) => {
    if (!filePath) return '';
    if (isPdfFile(filePath)) return getFileUrl(filePath);
    if (isWordFile(filePath)) return getOfficeViewerUrl(filePath);
    return '';
  };

  return (
    <UserDashboardLayout role="author">
      <div className="space-y-8">
        {/* Page Title */}
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
          My Submissions
        </h2>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
            <p className="text-gray-600 font-medium">Loading your submissions...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-8 rounded-xl text-center max-w-2xl mx-auto">
            <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
            <h3 className="text-xl font-semibold mb-3">Cannot Access Submissions</h3>
            <p className="text-lg mb-6">{error}</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-md"
              >
                Go to Login
              </Link>

              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center px-8 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition"
              >
                Retry
              </button>
            </div>
          </div>
        ) : submissions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border p-10 md:p-16 text-center">
            <FileText className="mx-auto text-gray-400 mb-6" size={80} />
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">
              No submissions found
            </h3>
            <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
              You haven't submitted any manuscripts yet (or none where you are listed as author/co-author).
            </p>
            <Link
              href="/author-dashboard/submit"
              className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white font-semibold text-lg rounded-xl hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
            >
              Submit Your First Manuscript
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {submissions.map((sub: any) => (
              <div
                key={sub.id}
                className="bg-white rounded-2xl shadow-md border overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                <div className="p-6 md:p-8 flex flex-col flex-grow">
                  {/* Title + Status */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 line-clamp-2">
                      {sub.title || 'Untitled Manuscript'}
                    </h3>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {getStatusIcon(sub.current_status || sub.status)}
                      <span
                        className={`px-4 py-1.5 rounded-full text-sm font-medium border ${getStatusStyles(
                          sub.current_status || sub.status
                        )}`}
                      >
                        {(sub.current_status || sub.status || 'Unknown')
                          .replace('_', ' ')
                          .toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600 mb-6 flex-grow">
                    <div className="space-y-1.5">
                      <p><strong>Submission ID:</strong> {sub.submission_code || `#${sub.id}`}</p>
                      <p><strong>Submitted:</strong> {formatDate(sub.created_at)}</p>
                      {sub.manuscript_type && (
                        <p><strong>Type:</strong> {sub.manuscript_type.replace('-', ' ')}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {sub.editor_assigned_name && (
                        <p><strong>Editor:</strong> {sub.editor_assigned_name}</p>
                      )}
                      {sub.keywords && (
                        <p><strong>Keywords:</strong> {sub.keywords}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-4 mt-auto pt-6 border-t">
                    {sub.files && (
                      <button
                        onClick={() => setExpandedManuscript(expandedManuscript === sub.id ? null : sub.id)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-sm hover:shadow"
                      >
                        <FileText size={18} />
                        {expandedManuscript === sub.id ? 'Hide' : 'View'} Manuscript
                      </button>
                    )}

                    <Link
                      href={`/author-dashboard/submissions/${sub.id}`}
                      className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                    >
                      <Eye size={18} />
                      View Details
                    </Link>
                  </div>

                  {/* Manuscript Viewer Section */}
                  {expandedManuscript === sub.id && sub.files && (
                    <div className="mt-6 pt-6 border-t">
                      <div className="mb-4">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Manuscript Preview</h4>
                        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                          {getPreviewUrl(sub.files) ? (
                            <iframe
                              src={getPreviewUrl(sub.files)}
                              title="Manuscript Viewer"
                              className="w-full"
                              style={{ height: '600px', border: 'none' }}
                              allowFullScreen
                            />
                          ) : (
                            <div className="flex h-[600px] flex-col items-center justify-center gap-3 bg-white p-6 text-center">
                              <FileText size={40} className="text-gray-400" />
                              <p className="text-gray-700">This file type cannot be previewed directly in the browser.</p>
                              <a href={getFileUrl(sub.files)} target="_blank" rel="noreferrer" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">Open in new tab</a>
                            </div>
                          )}
                        </div>
                        <div className="mt-4">
                          <a
                            href={getFileUrl(sub.files)}
                            download
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm"
                          >
                            <FileText size={16} />
                            Download Manuscript
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reviewer Feedback Section */}
                  {sub.reviewer_feedback && sub.reviewer_feedback.length > 0 && (
                    <div className="mt-6 pt-6 border-t">
                      <button
                        onClick={() => setExpandedFeedback(expandedFeedback === sub.id ? null : sub.id)}
                        className="flex items-center gap-2 text-indigo-700 font-semibold hover:text-indigo-900 transition"
                      >
                        <MessageSquare size={18} />
                        <span>Reviewer Feedback ({sub.reviewer_feedback.length})</span>
                        {expandedFeedback === sub.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </button>

                      {expandedFeedback === sub.id && (
                        <div className="mt-4 space-y-4">
                          {sub.reviewer_feedback.map((feedback: any, index: number) => (
                            <div key={index} className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
                              <div className="flex items-center justify-between mb-3">
                                {/* <h5 className="font-semibold text-indigo-900">{feedback.reviewer_name}</h5> */}
                                <span className="text-xs text-indigo-600">
                                  Sent: {feedback.sent_at ? new Date(feedback.sent_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                                </span>
                              </div>

                              {feedback.comment_to_author && (
                                <div className="mb-4">
                                  <h6 className="text-sm font-medium text-gray-700 mb-2">Comment to Author</h6>
                                  <p className="text-sm text-gray-600 bg-white p-4 rounded-lg border">
                                    {feedback.comment_to_author}
                                  </p>
                                </div>
                              )}

                              {feedback.checklist && (
                                <div className="mb-4 p-4 bg-white rounded-lg border">
                                  <h6 className="text-sm font-semibold text-gray-700 mb-3">Manuscript Quality Assessment</h6>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {feedback.checklist.is_important_for_scientific_community !== null && (
                                      <div className="text-sm">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-gray-600">Important for scientific community?</span>
                                          <span className={`font-medium ${feedback.checklist.is_important_for_scientific_community ? 'text-green-600' : 'text-red-600'}`}>
                                            {feedback.checklist.is_important_for_scientific_community ? '✓ Yes' : '✗ No'}
                                          </span>
                                        </div>
                                        {feedback.checklist.is_important_for_scientific_community === false && feedback.checklist.is_important_for_scientific_community_comment && (
                                          <p className="text-xs text-gray-500 bg-red-50 p-2 rounded mt-1">{feedback.checklist.is_important_for_scientific_community_comment}</p>
                                        )}
                                      </div>
                                    )}
                                    {feedback.checklist.is_title_suitable !== null && (
                                      <div className="text-sm">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-gray-600">Title suitable?</span>
                                          <span className={`font-medium ${feedback.checklist.is_title_suitable ? 'text-green-600' : 'text-red-600'}`}>
                                            {feedback.checklist.is_title_suitable ? '✓ Yes' : '✗ No'}
                                          </span>
                                        </div>
                                        {feedback.checklist.is_title_suitable === false && feedback.checklist.alternative_title && (
                                          <p className="text-xs text-gray-500 bg-red-50 p-2 rounded mt-1">{feedback.checklist.alternative_title}</p>
                                        )}
                                      </div>
                                    )}
                                    {feedback.checklist.is_abstract_comprehensive !== null && (
                                      <div className="text-sm">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-gray-600">Abstract comprehensive?</span>
                                          <span className={`font-medium ${feedback.checklist.is_abstract_comprehensive ? 'text-green-600' : 'text-red-600'}`}>
                                            {feedback.checklist.is_abstract_comprehensive ? '✓ Yes' : '✗ No'}
                                          </span>
                                        </div>
                                        {feedback.checklist.is_abstract_comprehensive === false && feedback.checklist.is_abstract_comprehensive_comment && (
                                          <p className="text-xs text-gray-500 bg-red-50 p-2 rounded mt-1">{feedback.checklist.is_abstract_comprehensive_comment}</p>
                                        )}
                                      </div>
                                    )}
                                    {feedback.checklist.is_intro_conclusion_sufficient !== null && (
                                      <div className="text-sm">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-gray-600">Intro & conclusion sufficient?</span>
                                          <span className={`font-medium ${feedback.checklist.is_intro_conclusion_sufficient ? 'text-green-600' : 'text-red-600'}`}>
                                            {feedback.checklist.is_intro_conclusion_sufficient ? '✓ Yes' : '✗ No'}
                                          </span>
                                        </div>
                                        {feedback.checklist.is_intro_conclusion_sufficient === false && feedback.checklist.is_intro_conclusion_sufficient_comment && (
                                          <p className="text-xs text-gray-500 bg-red-50 p-2 rounded mt-1">{feedback.checklist.is_intro_conclusion_sufficient_comment}</p>
                                        )}
                                      </div>
                                    )}
                                    {feedback.checklist.is_structure_appropriate !== null && (
                                      <div className="text-sm">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-gray-600">Structure appropriate?</span>
                                          <span className={`font-medium ${feedback.checklist.is_structure_appropriate ? 'text-green-600' : 'text-red-600'}`}>
                                            {feedback.checklist.is_structure_appropriate ? '✓ Yes' : '✗ No'}
                                          </span>
                                        </div>
                                        {feedback.checklist.is_structure_appropriate === false && feedback.checklist.is_structure_appropriate_comment && (
                                          <p className="text-xs text-gray-500 bg-red-50 p-2 rounded mt-1">{feedback.checklist.is_structure_appropriate_comment}</p>
                                        )}
                                      </div>
                                    )}
                                    {feedback.checklist.are_references_sufficient !== null && (
                                      <div className="text-sm">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-gray-600">References sufficient?</span>
                                          <span className={`font-medium ${feedback.checklist.are_references_sufficient ? 'text-green-600' : 'text-red-600'}`}>
                                            {feedback.checklist.are_references_sufficient ? '✓ Yes' : '✗ No'}
                                          </span>
                                        </div>
                                        {feedback.checklist.are_references_sufficient === false && feedback.checklist.additional_references && (
                                          <p className="text-xs text-gray-500 bg-red-50 p-2 rounded mt-1">{feedback.checklist.additional_references}</p>
                                        )}
                                      </div>
                                    )}
                                    {feedback.checklist.is_language_quality_suitable !== null && (
                                      <div className="text-sm">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-gray-600">Language quality suitable?</span>
                                          <span className={`font-medium ${feedback.checklist.is_language_quality_suitable ? 'text-green-600' : 'text-red-600'}`}>
                                            {feedback.checklist.is_language_quality_suitable ? '✓ Yes' : '✗ No'}
                                          </span>
                                        </div>
                                        {feedback.checklist.is_language_quality_suitable === false && feedback.checklist.is_language_quality_suitable_comment && (
                                          <p className="text-xs text-gray-500 bg-red-50 p-2 rounded mt-1">{feedback.checklist.is_language_quality_suitable_comment}</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {feedback.recommendation && (
                                <div>
                                  <h6 className="text-sm font-medium text-gray-700 mb-2">Recommendation</h6>
                                  <p className="text-sm bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg text-gray-700">
                                    {feedback.recommendation}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </UserDashboardLayout>
  );
}