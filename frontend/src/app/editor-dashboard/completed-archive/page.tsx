'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl } from '@/utils/api';
import { AlertCircle, RefreshCw, Eye, Archive } from 'lucide-react';

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
  corresponding_author: {
    id: number;
    full_name: string;
  } | null;
  authors: Array<{ id: number; full_name: string }>;
  manual_authors?: string;
  conflict_of_interest?: string;
  acknowledgement?: string;
  current_status: string;
  latest_version?: { id: number; version_number: number; version_type: string; file: string | null; created_at: string } | null;
  created_at: string;
  files: string;
  versions?: Array<{ id: number; version_number: number; version_type: string; file: string | null; revision_note?: string; created_at: string }>;
}

export default function CompletedArchiveContent() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('access_token');
      setToken(t);
      if (!t) {
        setError('Please log in to view completed manuscripts.');
        setTimeout(() => router.replace('/login'), 1500);
      }
    }
  }, [router]);

  useEffect(() => {
    if (!isMounted || !token) return;
    fetchCompletedSubmissions();
  }, [isMounted, token]);

  const fetchCompletedSubmissions = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const res = await fetch(apiUrl('editor-submissions/?status=completed'), {
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
        throw new Error(`Failed to load completed manuscripts (${res.status}): ${errText}`);
      }
      const data = await res.json();
      setSubmissions(Array.isArray(data) ? data : data.results || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load completed manuscripts.');
    } finally {
      setLoading(false);
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
    let clean = filePath.replace(/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?/, '').replace(/^https?:\/\/[^/]+\/?/, '').trim();
    if (clean.startsWith('/')) clean = clean.slice(1);
    if (!clean.startsWith('media/') && !clean.startsWith('api/media/')) {
      clean = 'media/' + clean;
    }
    return `/${clean}`;
  };

  const formatAuthorName = (author: any) => {
    if (!author) return 'Unknown';
    return author.full_name || author.email || `User#${author.id}`;
  };

  if (!isMounted || loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
        <p className="ml-4 text-gray-600 font-medium">Loading completed manuscripts...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Completed Manuscript Archive</h2>
            <p className="text-gray-600 mt-2">Archived manuscripts that have finished the publication workflow.</p>
          </div>
          <button
            onClick={fetchCompletedSubmissions}
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

        {submissions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-10 text-center">
            <Archive size={40} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">No completed manuscripts are archived yet.</p>
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
                      <p className="text-sm text-gray-600">Status: <span className="font-medium text-slate-700">Completed</span></p>
                      <p className="text-sm text-gray-600">Submitted: {formatDate(sub.created_at)}</p>
                    </div>

                    <button
                      onClick={() => setSelectedId(isExpanded ? null : sub.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition"
                    >
                      <Eye size={18} />
                      {isExpanded ? 'Hide Details' : 'View Details'}
                    </button>
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
                          <a href={getFileUrl(fileUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">
                            <Archive size={16} />
                            Open Manuscript File
                          </a>
                        ) : (
                          <p className="text-gray-700">No file attached for this submission.</p>
                        )}
                      </div>
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
