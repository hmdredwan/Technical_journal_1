'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiUrl } from '@/utils/api';
import { ArrowLeft, Download, Eye, User, Calendar, FileText, MessageSquare, AlertCircle } from 'lucide-react';

interface ReviewAssignment {
  id: number;
  submission: number;
  submission_title: string;
  submission_file: string;
  submission_abstract: string;
  submission_keywords: string;
  assigned_to: number;
  assigned_to_name: string;
  assigned_to_email: string;
  assigned_at: string;
  due_date: string;
  admin_remarks: string;
  status: string;
  status_display: string;
  invite_response: string;
  invite_response_display: string;
  invitation_sent_at: string | null;
  invite_responded_at: string | null;
  invite_rejection_reasons: string[] | null;
  invite_rejection_note: string | null;
  review_report: string;
  reviewer_remarks: string;
  submitted_at: string;
  comment_to_author: string;
  comment_to_editor: string;
  recommendation: string;
}

interface Submission {
  id: number;
  title: string;
  abstract: string;
  keywords: string;
  file: string;
  created_at: string;
  status: string;
}

export default function ReviewDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
          <p className="ml-4 text-gray-600 font-medium">Loading review details...</p>
        </div>
      }
    >
      <ReviewDetailsInner />
    </Suspense>
  );
}

function ReviewDetailsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const submissionId = searchParams.get('submission');

  const [token, setToken] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [reviews, setReviews] = useState<ReviewAssignment[]>([]);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('access_token');
      setToken(t);
      if (!t) {
        router.replace('/login');
      }
    }
  }, [router]);

  useEffect(() => {
    if (!isMounted || !token || !submissionId) return;
    fetchReviewDetails();
  }, [isMounted, token, submissionId]);

  const fetchReviewDetails = async () => {
    if (!token || !submissionId) return;

    try {
      setLoading(true);
      setError('');

      // Fetch submission details
      const submissionRes = await fetch(apiUrl(`submissions/${submissionId}/`), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!submissionRes.ok) {
        throw new Error('Failed to load submission details');
      }

      const submissionData = await submissionRes.json();
      setSubmission(submissionData);

      // Fetch all review assignments for this submission
      const reviewsRes = await fetch(apiUrl(`review-assignments/?submission=${submissionId}`), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!reviewsRes.ok) {
        throw new Error('Failed to load review assignments');
      }

      const reviewsData = await reviewsRes.json();
      setReviews(Array.isArray(reviewsData) ? reviewsData : reviewsData.results || []);

    } catch (err: any) {
      console.error('Error fetching review details:', err);
      setError(err.message || 'Failed to load review details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFile = (filePath: string, filename: string) => {
    const fullUrl = filePath.startsWith('http') ? filePath : apiUrl(filePath);
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec?.toLowerCase()) {
      case 'accept': return 'bg-green-100 text-green-800';
      case 'minor_revision': return 'bg-yellow-100 text-yellow-800';
      case 'major_revision': return 'bg-orange-100 text-orange-800';
      case 'reject': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isMounted || loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
        <p className="ml-4 text-gray-600 font-medium">Loading review details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-8 rounded-2xl text-center max-w-2xl mx-auto mt-10">
        <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
        <h3 className="text-xl font-semibold mb-3">Error</h3>
        <p className="text-lg mb-6">{error}</p>
        <button
          onClick={fetchReviewDetails}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition mb-4"
          >
            <ArrowLeft size={18} />
            Back to Monitor Reviews
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Review Details</h1>
          {submission && (
            <p className="text-lg text-gray-600 mt-2">{submission.title}</p>
          )}
        </div>

        {/* Submission Info */}
        {submission && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <FileText className="text-blue-600" size={24} />
              Manuscript Information
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Abstract</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{submission.abstract}</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Keywords</h3>
                <p className="text-gray-700 text-sm">{submission.keywords}</p>
                <div className="mt-4">
                  <button
                    onClick={() => handleDownloadFile(submission.file, `${submission.title}.pdf`)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <Download size={16} />
                    Download Manuscript
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <MessageSquare className="text-blue-600" size={24} />
            Peer Reviews ({reviews.length})
          </h2>

          {reviews.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No reviews assigned yet.</p>
          ) : (
            <div className="space-y-8">
              {reviews.map((review) => (
                <div key={review.id} className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                  {/* Reviewer Info */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <User className="text-gray-600" size={20} />
                      <div>
                        <h3 className="font-semibold text-gray-900">{review.assigned_to_name}</h3>
                        <p className="text-sm text-gray-600">{review.assigned_to_email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(review.status)}`}>
                        {review.status_display}
                      </span>
                      {review.recommendation && (
                        <div className="mt-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRecommendationColor(review.recommendation)}`}>
                            {review.recommendation.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Review Dates */}
                  <div className="grid md:grid-cols-3 gap-4 mb-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      <span>Assigned: {new Date(review.assigned_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      <span>Due: {new Date(review.due_date).toLocaleDateString()}</span>
                    </div>
                    {review.submitted_at && (
                      <div className="flex items-center gap-2">
                        <Calendar size={16} />
                        <span>Submitted: {new Date(review.submitted_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Review Content */}
                  <div className="space-y-6">
                    {/* Comments to Author */}
                    {review.comment_to_author && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <Eye className="text-green-600" size={16} />
                          Comments to Author
                        </h4>
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <p className="text-gray-700 whitespace-pre-wrap">{review.comment_to_author}</p>
                        </div>
                      </div>
                    )}

                    {/* Comments to Editor */}
                    {review.comment_to_editor && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <Eye className="text-blue-600" size={16} />
                          Comments to Editor (Private)
                        </h4>
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <p className="text-gray-700 whitespace-pre-wrap">{review.comment_to_editor}</p>
                        </div>
                      </div>
                    )}

                    {/* Reviewer Remarks */}
                    {review.reviewer_remarks && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Reviewer Remarks</h4>
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <p className="text-gray-700 whitespace-pre-wrap">{review.reviewer_remarks}</p>
                        </div>
                      </div>
                    )}

                    {/* Review Report */}
                    {review.review_report && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Review Report</h4>
                        <button
                          onClick={() => handleDownloadFile(review.review_report, `review_report_${review.id}.pdf`)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                        >
                          <Download size={16} />
                          Download Review Report
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}