'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl } from '@/utils/api';
import { Edit, Newspaper, Save, Trash2, X } from 'lucide-react';

type NewsItem = {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  attachment: string | null;
  is_active: boolean;
  sort_order: number;
  published_at: string;
  created_at: string;
  updated_at: string;
};

export default function ManageNews() {
  const token = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }, []);

  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const formRef = useRef<HTMLFormElement | null>(null);
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [attachment, setAttachment] = useState<File | null>(null);

  const fetchNews = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('admin/news/'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || data?.message || `Failed (${res.status})`);
      setItems(Array.isArray(data) ? data : data?.results || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load news');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (editingId && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editingId]);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setExcerpt('');
    setContent('');
    setSortOrder(0);
    setIsActive(true);
    setAttachment(null);
  };

  const startEdit = (item: NewsItem) => {
    setEditingId(item.id);
    setTitle(item.title || '');
    setExcerpt(item.excerpt || '');
    setContent(item.content || '');
    setSortOrder(Number(item.sort_order) || 0);
    setIsActive(Boolean(item.is_active));
    setAttachment(null);
    setSuccess('');
    setError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('excerpt', excerpt.trim());
      fd.append('content', content.trim());
      fd.append('is_active', String(isActive));
      fd.append('sort_order', String(Number(sortOrder) || 0));
      if (attachment) fd.append('attachment', attachment);

      const url = editingId ? apiUrl(`admin/news/${editingId}/`) : apiUrl('admin/news/');
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || data?.message || `Save failed (${res.status})`);

      setSuccess(editingId ? 'News updated successfully.' : 'News created successfully.');
      await fetchNews();
      resetForm();
    } catch (e: any) {
      setError(e?.message || 'Failed to save news');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: number) => {
    if (!token) return;
    if (!confirm('Delete this news item?')) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(apiUrl(`admin/news/${id}/`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || data?.message || `Delete failed (${res.status})`);
      }
      setSuccess('News deleted.');
      await fetchNews();
      if (editingId === id) resetForm();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete news');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h3 className="text-2xl font-bold flex items-center gap-3">
          <Newspaper size={24} className="text-blue-600" />
          Manage News
        </h3>
        <p className="text-sm text-gray-600 mt-1">Create, edit, publish and manage homepage news cards.</p>
      </div>

      {error ? <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl">{error}</div> : null}
      {success ? <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl">{success}</div> : null}

      <div className="bg-white p-6 rounded-2xl shadow border">
        <h4 className="text-xl font-semibold mb-4">{editingId ? 'Edit News' : 'Create News'}</h4>
        <form ref={formRef} onSubmit={submit} className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border rounded-xl"
            placeholder="News title"
            required
          />
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 border rounded-xl"
            placeholder="Short excerpt shown on card"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="w-full px-4 py-3 border rounded-xl"
            placeholder="Full news content"
            required
          />
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Attachment (optional)</label>
              <input type="file" onChange={(e) => setAttachment(e.target.files?.[0] || null)} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Sort Order</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full px-4 py-3 border rounded-xl"
              />
            </div>
            <div className="flex items-center gap-3 pt-8">
              <input id="newsActive" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <label htmlFor="newsActive" className="text-sm font-medium text-gray-700">Active</label>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={18} />
              {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition disabled:opacity-50 flex items-center gap-2"
            >
              <X size={18} />
              Cancel
            </button>
          </div>
        </form>
      </div>

      <div>
        <h4 className="text-xl font-semibold mb-4">Existing News</h4>
        {loading ? (
          <div className="text-gray-600">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-gray-600">No news items yet.</div>
        ) : (
          <div className="space-y-3">
            {items.map((n) => (
              <div key={n.id} className="bg-white border rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${n.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                        {n.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-xs text-gray-500">Sort: {n.sort_order}</span>
                      <span className="text-xs text-gray-500">{new Date(n.published_at).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-2 font-semibold text-gray-900">{n.title}</p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{n.excerpt || n.content}</p>
                    {n.attachment ? (
                      <a href={n.attachment} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline text-sm mt-2 inline-block">
                        Open attachment
                      </a>
                    ) : null}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startEdit(n)} className="px-3 py-2 rounded-xl border hover:bg-gray-50 text-blue-700 flex items-center gap-2">
                      <Edit size={16} />
                      Edit
                    </button>
                    <button onClick={() => remove(n.id)} className="px-3 py-2 rounded-xl border hover:bg-red-50 text-red-700 flex items-center gap-2">
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

