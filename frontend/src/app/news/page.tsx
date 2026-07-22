'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiUrl } from '@/utils/api';
import { Calendar, Newspaper } from 'lucide-react';

type News = {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  attachment: string | null;
  published_at: string;
};

export default function NewsPage() {
  const [items, setItems] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(apiUrl('news/public/'));
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.detail || `Failed (${res.status})`);
        setItems(Array.isArray(data) ? data : data?.results || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load news');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <Newspaper className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">News & Announcements</h1>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-600">Loading news...</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl">{error}</div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-600">No news found.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((news) => (
              <div key={news.id} className="bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-300">
                <div className="p-6">
                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(news.published_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">{news.title}</h3>
                  <p className="text-gray-700 mb-6 line-clamp-3">{news.excerpt || news.content}</p>
                  <Link href={`/news/${news.id}`} className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium">
                    Read More →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

