// src/app/guidelines/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiUrl } from '@/utils/api';

type PublicGuidelineDoc = {
  id: number;
  title: string;
  file: string;
  rendered_pdf?: string | null;
  file_extension?: string;
  extracted_text: string;
  extraction_error?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export default function GuidelinesPage() {
  const [doc, setDoc] = useState<PublicGuidelineDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchActiveGuidelines = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(apiUrl('guidelines/public/'));
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.detail || data?.message || data?.error || `Request failed (${res.status})`);
        }

        const list = Array.isArray(data) ? data : data?.results || [];
        const firstActive = list?.[0] ?? null;
        setDoc(firstActive);
      } catch (err: any) {
        setError(err?.message || 'Failed to load guidelines.');
        setDoc(null);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveGuidelines();
  }, []);

  // Render the main content based on document type
  const renderContent = () => {
    if (!doc) return null;

    const pdfUrl = doc.rendered_pdf || doc.file;
    const ext = (doc.file_extension || '').toLowerCase().trim();
    const isPdfLike = ext === 'pdf' || (pdfUrl || '').toLowerCase().includes('.pdf');

    if (isPdfLike && pdfUrl) {
      return (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50">
            <p className="text-sm text-gray-700 font-medium">
              Reading mode: PDF viewer 
            </p>
          </div>
          <iframe
            src={pdfUrl}
            className="w-full"
            style={{ height: '70vh' }}
            title="Guidelines PDF"
          />
        </div>
      );
    }

    if (doc.extracted_text) {
      return (
        <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
          {doc.extracted_text}
        </div>
      );
    }

    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 p-5 rounded-xl">
        <p className="font-semibold mb-2">Text rendering is unavailable for this file.</p>
        {doc.extraction_error && <p className="text-sm opacity-90">{doc.extraction_error}</p>}
        <p className="mt-3 text-sm opacity-90">Please use the download button to view the original document.</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section
        className="relative bg-cover bg-center bg-no-repeat py-24 md:py-32 text-white overflow-hidden"
        style={{
          backgroundImage: "url('/images/guidelines-header-bg.jpg')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/75 to-indigo-950/75" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight drop-shadow-2xl">
            Author Guidelines
          </h1>
          <p className="text-xl md:text-2xl max-w-4xl mx-auto opacity-95 drop-shadow-lg">
            Everything you need to know before submitting to River Research &amp; Innovation Journal
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-5xl mx-auto px-4 py-16 md:py-24">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 border border-gray-100 prose prose-lg max-w-none text-gray-700">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                {doc?.title || 'Author Guidelines'}
              </h2>
              <p className="text-gray-600 text-sm">
                {doc?.file_extension 
                  ? `File type: ${doc.file_extension.toUpperCase()}` 
                  : 'Latest active document'}
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              {doc?.file && (
                <a
                  href={doc.file}
                  download
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-bold text-base rounded-xl hover:bg-blue-700 transition shadow-sm hover:shadow-md"
                >
                  Download File
                </a>
              )}
            </div>
          </div>

          {/* Conditional Content Rendering */}
          {loading ? (
            <div className="text-center py-10 text-gray-600">Loading guidelines...</div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl">{error}</div>
          ) : !doc ? (
            <div className="text-center py-10">
              <p className="text-gray-600">No active guideline document is available yet.</p>
            </div>
          ) : (
            renderContent()
          )}

          {/* Call to Action */}
          <div className="bg-blue-50 p-8 rounded-xl mt-12 text-center">
            <h3 className="text-2xl font-bold text-blue-800 mb-4">Ready to Submit?</h3>
            <p className="text-lg mb-6">Use our online submission system below.</p>
            <Link
              href="/submit"
              className="inline-block px-10 py-5 bg-blue-600 text-white font-bold text-xl rounded-xl hover:bg-blue-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Go to Submission Portal →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}