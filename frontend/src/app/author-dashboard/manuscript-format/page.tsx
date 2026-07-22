'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import UserDashboardLayout from '@/components/user/UserDashboardLayout';
import { apiUrl } from '@/utils/api';
import { FileText, DownloadCloud } from 'lucide-react';

type ManuscriptFormatDocument = {
  id: number;
  title: string;
  file: string;
  rendered_pdf?: string | null;
  file_extension?: string;
  extracted_text?: string;
  extraction_error?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export default function AuthorManuscriptFormatsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [doc, setDoc] = useState<ManuscriptFormatDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const t = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');

    if (!t || role !== 'author') {
      router.push('/login');
      return;
    }

    setToken(t);
  }, [router]);

  useEffect(() => {
    if (!token) return;

    const fetchFormats = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await fetch(apiUrl('manuscript-formats/public/'));

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(
            data?.detail ||
              data?.message ||
              data?.error ||
              `Request failed (${res.status})`
          );
        }

        const list = Array.isArray(data)
          ? data
          : data?.results || [];

        setDoc(list[0] || null);
      } catch (err: any) {
        setError(
          err?.message ||
            'Failed to load manuscript format templates.'
        );
        setDoc(null);
      } finally {
        setLoading(false);
      }
    };

    fetchFormats();
  }, [token]);

  const renderContent = () => {
    if (!doc) {
      return (
        <div className="bg-white border border-gray-200 rounded-3xl p-10 text-center">
          <p className="text-gray-600 text-lg">
            No active manuscript format template is available right now.
          </p>
        </div>
      );
    }

    const fileUrl = doc.file;
    const pdfUrl = doc.rendered_pdf || doc.file;

    const ext = (doc.file_extension || '')
      .toLowerCase()
      .trim();

    const isPdfLike =
      ext === 'pdf' ||
      (pdfUrl || '').toLowerCase().includes('.pdf');

    const isWord =
      ext === 'doc' ||
      ext === 'docx' ||
      fileUrl.toLowerCase().includes('.doc') ||
      fileUrl.toLowerCase().includes('.docx');

    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
      fileUrl
    )}`;

    return (
      <div className="space-y-8">
        {/* Header Card */}
        <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {doc.title}
              </h1>

              <p className="text-sm text-gray-500 mt-2">
                Template type:{' '}
                {doc.file_extension?.toUpperCase() || 'Unknown'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={doc.file}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition"
              >
                <DownloadCloud size={18} />
                Download Template
              </a>
            </div>
          </div>
        </div>

        {/* PDF Preview */}
        {isPdfLike && pdfUrl ? (
          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
            <iframe
              src={pdfUrl}
              className="w-full"
              style={{ minHeight: '72vh' }}
              title="PDF Preview"
            />
          </div>
        ) : isWord ? (
          /* DOC/DOCX Preview */
          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
            <iframe
              src={officeViewerUrl}
              className="w-full"
              style={{ minHeight: '72vh' }}
              title="Word Document Preview"
            />
          </div>
        ) : doc.extracted_text ? (
          /* Text Fallback */
          <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm prose prose-lg text-gray-700">
            <pre className="whitespace-pre-wrap">
              {doc.extracted_text}
            </pre>
          </div>
        ) : (
          /* Final Fallback */
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 p-8 rounded-3xl shadow-sm">
            <p className="font-semibold">
              This file cannot be previewed in your browser.
            </p>

            {doc.extraction_error ? (
              <p className="mt-3 text-sm opacity-90">
                {doc.extraction_error}
              </p>
            ) : null}

            <p className="mt-3 text-sm opacity-90">
              Please download the file to view the template.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <UserDashboardLayout role="author">
      <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
        <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <p className="text-sm text-blue-600 font-semibold uppercase tracking-[0.2em] flex items-center gap-2">
                <FileText size={18} />
                Manuscript Format Template
              </p>

              <h2 className="text-4xl font-bold text-gray-900 mt-3">
                Download Instructions
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-gray-600">
              Loading manuscript format templates...
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-3xl">
              {error}
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </div>
    </UserDashboardLayout>
  );
}