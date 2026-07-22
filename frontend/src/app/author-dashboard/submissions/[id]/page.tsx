// src/app/author-dashboard/submissions/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import UserDashboardLayout from '@/components/user/UserDashboardLayout';
import { 
  ArrowLeft, FileText, Download, User, Clock, AlertCircle, 
  CheckCircle, XCircle, Info, Gavel
} from 'lucide-react';
import { apiUrl } from '@/utils/api';
import ManuscriptDiscussion from '@/components/ManuscriptDiscussion';

export const dynamic = 'force-dynamic';

export default function SubmissionDetail() {
  const { id } = useParams();
  const router = useRouter();
  const numericSubmissionId = Number(Array.isArray(id) ? id[0] : id);

  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('access_token');
      setToken(storedToken);

      if (!storedToken) {
        router.replace('/login');
      }
    }
  }, [router]);

  useEffect(() => {
    if (token === null) return;
    if (!token) {
      setError('Authentication required. Please log in.');
      setLoading(false);
      return;
    }

    const fetchSubmission = async () => {
      try {
        const res = await fetch(apiUrl(`submissions/${id}/detail/`), {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => 'No response body');
          if (res.status === 401 || res.status === 403) {
            setError('Session expired or unauthorized. Please log in again.');
          } else if (res.status === 404) {
            setError('Submission not found.');
          } else {
            throw new Error(`Failed to load (${res.status}): ${errText}`);
          }
        } else {
          const data = await res.json();
          setSubmission(data);
        }
      } catch (err: any) {
        setError(err.message || 'Could not load submission details.');
      } finally {
        setLoading(false);
      }
    };

    fetchSubmission();
  }, [id, token, router]);

  const getStatusIcon = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('submitted'))    return <Clock className="text-blue-500" size={24} />;
    if (s.includes('review') || s.includes('desk')) return <AlertCircle className="text-yellow-500" size={24} />;
    if (s.includes('accepted'))     return <CheckCircle className="text-green-500" size={24} />;
    if (s.includes('rejected'))     return <XCircle className="text-red-500" size={24} />;
    return <FileText className="text-gray-500" size={24} />;
  };

  const getStatusStyles = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('submitted'))    return 'bg-blue-100 text-blue-800 border-blue-200';
    if (s.includes('review') || s.includes('desk')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (s.includes('accepted'))     return 'bg-green-100 text-green-800 border-green-200';
    if (s.includes('rejected'))     return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatDecisionLabel = (decision?: string) => {
    const d = (decision || '').toLowerCase();
    if (!d || d === 'pending') return 'Pending';
    if (d === 'accept') return 'Accept for Publication';
    if (d === 'minor_revision') return 'Minor Revision Required';
    if (d === 'major_revision') return 'Major Revision Required';
    if (d === 'reject') return 'Reject';
    return decision || 'Pending';
  };

  const getDecisionBadgeStyles = (decision?: string) => {
    const d = (decision || '').toLowerCase();
    if (d === 'accept') return 'bg-green-100 text-green-800 border-green-200';
    if (d === 'minor_revision') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (d === 'major_revision') return 'bg-orange-100 text-orange-800 border-orange-200';
    if (d === 'reject') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileUrl = (filePath?: string) => {
    if (!filePath) return '#';
    if (filePath.startsWith('http') || filePath.startsWith('//')) return filePath;
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    return apiUrl(cleanPath);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
        <p className="text-gray-600 font-medium">Loading submission details...</p>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-8 rounded-xl text-center max-w-2xl mx-auto mt-10">
        <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
        <h3 className="text-xl font-semibold mb-3">Error</h3>
        <p className="text-lg mb-6">{error || 'Submission not found'}</p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center px-8 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition"
          >
            Go Back
          </button>

          <Link
            href="/author-dashboard/my-submissions"
            className="inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            Back to My Submissions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <UserDashboardLayout role="author">
      <div className="space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"
              title="Go back"
            >
              <ArrowLeft size={24} className="text-gray-700" />
            </button>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Manuscript Details
            </h2>
          </div>

          <span className={`px-5 py-2 rounded-full text-sm font-medium border ${getStatusStyles(submission.current_status || submission.status)}`}>
            {(submission.current_status || submission.status || 'Unknown').replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
          {/* Title & Basic Info */}
          <div className="p-6 md:p-10 border-b bg-gradient-to-r from-gray-50 to-white">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              {submission.title || 'Untitled Manuscript'}
            </h1>

            <div className="flex flex-wrap gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock size={18} />
                <span>Submitted: {formatDate(submission.created_at)}</span>
              </div>

              {submission.manuscript_type && (
                <div className="flex items-center gap-2">
                  <FileText size={18} />
                  <span>Type: {submission.manuscript_type.replace('-', ' ')}</span>
                </div>
              )}

              {submission.editor_assigned_name && (
                <div className="flex items-center gap-2">
                  <User size={18} />
                  <span>Editor: {submission.editor_assigned_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Abstract */}
          <section className="p-6 md:p-10 border-b">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Abstract</h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {submission.abstract || 'No abstract provided.'}
            </p>
          </section>

          {/* Keywords */}
          {submission.keywords && (
            <section className="p-6 md:p-10 border-b">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {submission.keywords.split(',').map((kw: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {kw.trim()}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Authors - Combined Registered + Manual */}
          <section className="p-6 md:p-10 border-b">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Authors</h3>
            <div className="space-y-6">
              {/* Registered Authors */}
              {submission.authors?.length > 0 ? (
                <div>
                  <h4 className="font-medium text-gray-800 mb-3">Registered Authors</h4>
                  <ul className="space-y-3">
                    {submission.authors.map((author: any, idx: number) => (
                      <li
                        key={author.id}
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {author.full_name}
                            {submission.corresponding_author?.id === author.id && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                Corresponding Author
                              </span>
                            )}
                          </p>
                          {author.email && (
                            <p className="text-sm text-gray-600">{author.email}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Manual Authors */}
              {submission.manual_authors && (
                <div>
                  <h4 className="font-medium text-gray-800 mb-3">Additional Authors (Manual)</h4>
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <p className="text-gray-700 whitespace-pre-line">
                      {submission.manual_authors}
                    </p>
                  </div>
                </div>
              )}

              {!submission.authors?.length && !submission.manual_authors && (
                <p className="text-gray-600 italic">No authors listed.</p>
              )}
            </div>
          </section>

          {/* Conflict of Interest */}
          <section className="p-6 md:p-10 border-b">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle size={20} className="text-amber-600" />
              Conflict of Interest
            </h3>
            <p className="text-gray-700 whitespace-pre-line">
              {submission.conflict_of_interest || 'None declared.'}
            </p>
          </section>

          {/* Acknowledgements */}
          <section className="p-6 md:p-10 border-b">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Info size={20} className="text-blue-600" />
              Acknowledgements
            </h3>
            <p className="text-gray-700 whitespace-pre-line">
              {submission.acknowledgement || 'None provided.'}
            </p>
          </section>

          {/* Status */}
          <section className="p-6 md:p-10 bg-gray-50">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Current Status</h3>
            <div className="flex items-center gap-4 mb-4">
              {getStatusIcon(submission.current_status || submission.status)}
              <span className={`text-xl font-bold px-5 py-2 rounded-full border ${getStatusStyles(submission.current_status || submission.status)}`}>
                {(submission.current_status || submission.status || 'Unknown').replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <p className="text-gray-600">
              Last updated: {formatDate(submission.updated_at || submission.created_at)}
            </p>
          </section>

          {/* Final Decision */}
          <section className="p-6 md:p-10 border-t">
            <div className="flex items-center gap-3 mb-4">
              <Gavel size={20} className="text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900">Final Editorial Decision</h3>
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-4">
              <span
                className={`px-5 py-2 rounded-full text-sm font-semibold border ${getDecisionBadgeStyles(submission.final_decision)}`}
              >
                {(submission.final_decision || 'pending').replace('_', ' ').toUpperCase()}
              </span>

              <span className="text-sm text-gray-600">
                {submission.decision_date ? `Decision date: ${formatDate(submission.decision_date)}` : 'Decision date: N/A'}
              </span>
            </div>

            {submission.final_decision ? (
              <p className="text-gray-700 whitespace-pre-line">
                <span className="font-medium">Summary: </span>
                {formatDecisionLabel(submission.final_decision)}
              </p>
            ) : (
              <p className="text-gray-600">No final decision has been published yet.</p>
            )}

            {submission.decision_remarks ? (
              <div className="mt-4 p-4 rounded-xl bg-gray-50 border">
                <h4 className="font-semibold text-gray-900 mb-2">Decision Remarks</h4>
                <p className="text-gray-700 whitespace-pre-line">{submission.decision_remarks}</p>
              </div>
            ) : null}
          </section>

          {/* Reviewer-Author Discussion */}
          {/* <section className="p-6 md:p-10 border-t bg-gray-50/40">
            <ManuscriptDiscussion
              submissionId={numericSubmissionId}
              title="Anonymous Discussion With Reviewer"
            />
          </section> */}

          {/* Files */}
          {submission.files && (
            <section className="p-6 md:p-10">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Manuscript File</h3>
              <a
                href={getFileUrl(submission.files)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
              >
                <Download size={20} />
                Download Manuscript
              </a>
            </section>
          )}

          {/* Back */}
          <div className="p-6 md:p-10">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              <ArrowLeft size={18} />
              Back to My Submissions
            </button>
          </div>
        </div>
      </div>
    </UserDashboardLayout>
  );
}