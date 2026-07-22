// src/app/admin/submissions/[id]/view/page.tsx
import { apiUrl } from '@/utils/api';
import { AlertCircle, Download, User, FileText } from 'lucide-react';
import { Clock } from "lucide-react";

async function getSubmission(id: string, token: string) {
  try {
    const res = await fetch(apiUrl(`submissions/${id}/detail/`), {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function SubmissionViewPage({ params }: { params: { id: string } }) {
  // For real app: get token from cookies or headers
  // For testing, use a dummy or env var - replace with proper auth
  const token = process.env.ADMIN_TOKEN || ''; // ← IMPORTANT: use real auth in production

  const submission = await getSubmission(params.id, token);

  if (!submission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-10 bg-white rounded-2xl shadow-xl max-w-lg">
          <AlertCircle className="mx-auto text-red-500 mb-6" size={80} />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Submission Not Found</h1>
          <p className="text-lg text-gray-600 mb-8">
            The submission may not exist or you do not have permission to view it.
          </p>
          <a
            href="/dashboard"
            className="inline-block px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-lg"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  const fileUrl = submission.files 
    ? (submission.files.startsWith('http') ? submission.files : apiUrl(submission.files.replace(/^\//, '')))
    : null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="p-6 md:p-10 border-b bg-gradient-to-r from-blue-50 to-white">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {submission.title || 'Untitled Submission'}
            </h1>
            <div className="flex flex-wrap gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock size={18} />
                <span>Submitted: {new Date(submission.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <User size={18} />
                <span>By: {submission.submitted_by?.full_name || 'Unknown'}</span>
              </div>
              <div>
                <span className="font-medium">Status:</span>{' '}
                <span className="capitalize">{submission.current_status || submission.status}</span>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-0">
            {/* Left: Details */}
            <div className="p-6 md:p-10 border-b lg:border-b-0 lg:border-r">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900">Submission Details</h2>

              <div className="space-y-8">
                <section>
                  <h3 className="text-lg font-semibold mb-3">Abstract</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {submission.abstract || 'No abstract provided.'}
                  </p>
                </section>

                {submission.keywords && (
                  <section>
                    <h3 className="text-lg font-semibold mb-3">Keywords</h3>
                    <div className="flex flex-wrap gap-2">
                      {submission.keywords.split(',').map((kw: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                          {kw.trim()}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <h3 className="text-lg font-semibold mb-3">Authors</h3>
                  <ul className="space-y-3">
                    {submission.authors?.map((author: any, i: number) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium">
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-medium">{author.full_name}</p>
                          {author.email && <p className="text-sm text-gray-600">{author.email}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {submission.corresponding_author && (
                    <div className="mt-6 pt-4 border-t">
                      <p className="font-semibold">Corresponding Author:</p>
                      <p>{submission.corresponding_author.full_name}</p>
                    </div>
                  )}
                </section>
              </div>
            </div>

            {/* Right: Manuscript Viewer */}
            <div className="p-6 md:p-10 bg-gray-50">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900">Manuscript Preview</h2>

              {fileUrl ? (
                <div className="border border-gray-300 rounded-lg overflow-hidden bg-white h-[70vh] lg:h-[80vh]">
                  <iframe
                    src={fileUrl}
                    className="w-full h-full"
                    title={`Manuscript - ${submission.title}`}
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 bg-white rounded-lg border border-dashed border-gray-300">
                  <FileText size={64} className="text-gray-400 mb-4" />
                  <p className="text-gray-600 text-lg">No manuscript file attached</p>
                </div>
              )}

              {/* Download option */}
              {fileUrl && (
                <div className="mt-6 text-center">
                  <a
                    href={fileUrl}
                    download={`${submission.title || 'manuscript'}.pdf`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    <Download size={20} />
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}