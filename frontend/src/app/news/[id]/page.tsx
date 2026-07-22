'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiUrl } from '@/utils/api';
import { Calendar, Download, ChevronLeft } from 'lucide-react';

type News = {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  attachment: string | null;
  published_at: string;
};

export default function NewsDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [item, setItem] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(apiUrl(`news/public/${id}/`), { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.detail || `Failed (${res.status})`);
        setItem(data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load news details');
      } finally {
        setLoading(false);
      }
    };
    if (id) run();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">Loading...</div>;
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border p-8 max-w-xl w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">News not found</h2>
          <p className="text-gray-600 mb-6">{error || 'The requested news article could not be loaded.'}</p>
          <Link href="/news" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
            <ChevronLeft size={16} />
            Back to News
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <article className="bg-white rounded-2xl shadow border p-8 md:p-10">
          <Link href="/news" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6">
            <ChevronLeft size={16} />
            Back to News
          </Link>

          <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
            <Calendar className="h-4 w-4" />
            <span>{new Date(item.published_at).toLocaleString()}</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">{item.title}</h1>

          <div className="prose prose-lg max-w-none text-gray-800 whitespace-pre-wrap">
            {item.content}
          </div>

          {item.attachment ? (
            <div className="mt-10 pt-6 border-t">
              <a
                href={item.attachment}
                download
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                <Download size={18} />
                Download Attachment
              </a>
            </div>
          ) : null}
        </article>
      </div>
    </div>
  );
}

