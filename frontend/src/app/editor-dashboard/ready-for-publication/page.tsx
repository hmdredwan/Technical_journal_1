'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl } from '@/utils/api';
import { AlertCircle, RefreshCw, Eye, Archive, FileText } from 'lucide-react';

interface Author {
  id: number;
  full_name: string;
  email?: string;
}

interface CorrespondingAuthor {
  id: number;
  full_name: string;
  email?: string;
}

interface Submission {
  id: number;
  title: string;
  submission_code?: string | null;
  abstract: string;
  keywords: string;
  manuscript_type: string;
  submitted_by: {
    id: number;
    full_name: string;
    email: string;
  };
  corresponding_author: CorrespondingAuthor | null;
  authors: Author[];
  manual_authors?: string;
  conflict_of_interest?: string;
  acknowledgement?: string;
  current_status: string;
  latest_version?: { id: number; version_number: number; version_type: string; file: string | null; created_at: string } | null;
  created_at: string;
  files: string;
  versions?: Array<{ id: number; version_number: number; version_type: string; file: string | null; revision_note?: string; created_at: string }>;
}

export default function ReadyForPublicationContent() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('access_token');
      setToken(t);
      if (!t) {
        setError('Please log in to view ready manuscrips.');
        setTimeout(() => router.replace('/login'), 1500);
      }
    }
  }, [router]);

  const fetchReadySubmissions = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const res = await fetch(apiUrl('editor-submissions/?status=ready_for_publication'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError('Session expired or unauthorized. Redirecting to login...');
          localStorage.clear();
          setTimeout(() => router.replace('/login'), 2000);
          return;
        }
        const errText = await res.text().catch(() => 'Unknown error');
        throw new Error(`Failed to load submissions (${res.status}): ${errText}`);
      }
      const data = await res.json();
      setSubmissions(Array.isArray(data) ? data : data.results || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load ready-for-publication manuscripts.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [router, token]);

  useEffect(() => {
    if (!isMounted || !token) return;
    fetchReadySubmissions();
  }, [fetchReadySubmissions, isMounted, token]);

  const confirmPublishSubmission = (submissionId: number) => {
    const confirmed = window.confirm(
      'Are you sure this paper has already been published? Click Ok to move it to archives and send the author notification email.'
    );
    if (!confirmed) return;
    publishSubmission(submissionId);
  };

  const publishSubmission = async (submissionId: number) => {
    if (!token) {
      setError('Authentication token missing. Please log in again.');
      return;
    }

    setError('');
    setSuccess('');
    setPublishingId(submissionId);

    try {
      const res = await fetch(apiUrl(`submissions/${submissionId}/publish/`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.message || `Publish failed (${res.status})`);
      }

      setSuccess('Submission published and moved to completed archive. The author has been notified.');
      fetchReadySubmissions();
      setSelectedId(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Publish request failed.';
      setError(message);
    } finally {
      setPublishingId(null);
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const formatVersionType = (versionType?: string) => {
    if (!versionType) return 'Unknown';
    const vt = versionType.toLowerCase();
    if (vt === 'initial') return 'Initial Submission';
    if (vt === 'minor_revision') return 'Minor Revision';
    if (vt === 'major_revision') return 'Major Revision';
    if (vt === 'editor_update') return 'Editorial Update';
    return versionType.replace('_', ' ');
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

    return backendOrigin ? `${backendOrigin}/${clean}` : `/${clean}`;
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

  const getPreviewUrl = (filePath: string | null) => {
    if (!filePath) return '';
    if (isPdfFile(filePath)) return getFileUrl(filePath);
    if (isWordFile(filePath)) return getOfficeViewerUrl(filePath);
    return '';
  };

  const formatAuthorName = (author: CorrespondingAuthor | null | undefined) => {
    if (!author) return 'Unknown';
    return author.full_name || author.email || `User#${author.id}`;
  };

  if (!isMounted || loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
        <p className="ml-4 text-gray-600 font-medium">Loading ready-for-publication manuscripts...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Ready for Publication</h2>
            <p className="text-gray-600 mt-2">Manuscripts that are accepted and waiting to be published.</p>
          </div>
          <button
            onClick={fetchReadySubmissions}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle size={20} />
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl">
            {success}
          </div>
        )}

        {submissions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-10 text-center">
            <Archive size={40} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">No manuscripts are ready for publication yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {submissions.map((sub) => {
              const isExpanded = selectedId === sub.id;
              const fileUrl = sub.latest_version?.file || sub.files;

              return (
                <div key={sub.id} className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="space-y-2">
                      <h3 className="text-2xl font-semibold text-gray-900">{sub.title}</h3>
                      {sub.submission_code && (
                        <p className="text-sm font-semibold text-indigo-700">Manuscript ID: {sub.submission_code}</p>
                      )}
                      <p className="text-sm text-gray-600">Status: <span className="font-medium text-emerald-700">Ready for Publication</span></p>
                      <p className="text-sm text-gray-600">Submitted: {formatDate(sub.created_at)}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => setSelectedId(isExpanded ? null : sub.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition"
                      >
                        <Eye size={18} />
                        {isExpanded ? 'Hide Details' : 'View Details'}
                      </button>
                      <button
                        onClick={() => confirmPublishSubmission(sub.id)}
                        disabled={publishingId === sub.id}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${publishingId === sub.id ? 'bg-gray-300 text-gray-700 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                      >
                        {publishingId === sub.id ? 'Publishing...' : 'Publish'}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-6 space-y-6 border-t border-gray-200 pt-6">
                      <div>
                        <h4 className="font-semibold text-lg text-gray-900 mb-2">Abstract</h4>
                        <p className="text-gray-700 whitespace-pre-line">{sub.abstract || 'No abstract provided.'}</p>
                      </div>

                      {sub.keywords && (
                        <div>
                          <h4 className="font-semibold text-lg text-gray-900 mb-2">Keywords</h4>
                          <div className="flex flex-wrap gap-2">
                            {sub.keywords.split(',').map((keyword, index) => (
                              <span key={index} className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">{keyword.trim()}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2 text-gray-900">Authors</h4>
                            <p className="text-gray-700">{sub.authors?.map((a) => a.full_name).join(', ') || 'No registered authors'}</p>
                            {sub.manual_authors && <p className="text-gray-700 mt-2 whitespace-pre-line">{sub.manual_authors}</p>}
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2 text-gray-900">Corresponding Author</h4>
                            <p className="text-gray-700">{formatAuthorName(sub.corresponding_author)}</p>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2 text-gray-900">Latest Version</h4>
                            <p className="text-gray-700">{sub.latest_version ? `V${sub.latest_version.version_number} (${formatVersionType(sub.latest_version.version_type)})` : 'N/A'}</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2 text-gray-900">Conflict of Interest</h4>
                            <p className="text-gray-700 whitespace-pre-line">{sub.conflict_of_interest || 'None declared'}</p>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2 text-gray-900">Acknowledgement</h4>
                            <p className="text-gray-700 whitespace-pre-line">{sub.acknowledgement || 'None provided'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <h4 className="font-semibold mb-2 text-gray-900">Manuscript File</h4>
                        {fileUrl ? (
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              onClick={() => {
                                const previewUrl = getPreviewUrl(fileUrl);
                                if (previewUrl) {
                                  setViewerUrl(previewUrl);
                                  setViewerTitle(sub.title);
                                } else {
                                  window.open(getFileUrl(fileUrl), '_blank', 'noopener,noreferrer');
                                }
                              }}
                              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
                            >
                              <Archive size={16} />
                              Open Manuscript File
                            </button>
                            <a
                              href={getFileUrl(fileUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                            >
                              <FileText size={16} />
                              Download File
                            </a>
                          </div>
                        ) : (
                          <p className="text-gray-700">No file attached for this submission.</p>
                        )}
                      </div>

                      {viewerUrl && (
                        <div id="manuscript-viewer" className="mt-6">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">Viewing: {viewerTitle || 'Manuscript'}</h4>
                            <div className="flex items-center gap-2">
                              <button onClick={() => { setViewerUrl(null); setViewerTitle(null); }} className="text-sm text-gray-600 hover:text-gray-800">Close</button>
                            </div>
                          </div>
                          <div className="w-full h-[80vh] border rounded overflow-hidden bg-white">
                            {isPdfFile(viewerUrl) || viewerUrl.includes('view.officeapps.live.com') ? (
                              <iframe src={viewerUrl} title="Manuscript Viewer" className="w-full h-full" />
                            ) : (
                              <div className="flex h-full flex-col items-center justify-center gap-3 bg-gray-50 p-6 text-center">
                                <FileText size={40} className="text-gray-400" />
                                <p className="text-gray-700">This file type cannot be previewed directly in the browser.</p>
                                <a href={getFileUrl(fileUrl)} target="_blank" rel="noreferrer" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">Open in new tab</a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
