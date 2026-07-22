'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl } from '@/utils/api';
import { Image as ImageIcon, Edit, Trash2, X, Save, Plus } from 'lucide-react';

type HeroSlide = {
  id: number;
  image: string;
  alt_text: string;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export default function ManageHeroImages() {
  const token = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }, []);

  const [items, setItems] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formImage, setFormImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const [altText, setAltText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState<number>(0);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  const fetchItems = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('admin/hero-images/'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.detail || data?.message || `Failed (${res.status})`);
      }
      const list = Array.isArray(data) ? data : data?.results || [];
      setItems(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load hero images');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (editingId && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editingId]);

  const resetForm = () => {
    setEditingId(null);
    setFormImage(null);
    setPreviewUrl('');
    setAltText('');
    setLinkUrl('');
    setIsActive(true);
    setSortOrder(0);
    setSuccess('');
    setError('');
  };

  useEffect(() => {
    if (!formImage) return;
    const url = URL.createObjectURL(formImage);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [formImage]);

  const startEdit = (item: HeroSlide) => {
    setEditingId(item.id);
    setFormImage(null);
    setPreviewUrl(item.image);
    setAltText(item.alt_text || '');
    setLinkUrl(item.link_url || '');
    setIsActive(Boolean(item.is_active));
    setSortOrder(Number(item.sort_order) || 0);
    setSuccess('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const fd = new FormData();

      // For new slide require an image.
      if (!editingId && !formImage) {
        throw new Error('Please choose an image file.');
      }

      if (formImage) {
        fd.append('image', formImage);
      }
      fd.append('alt_text', altText);
      fd.append('link_url', linkUrl.trim() ? linkUrl.trim() : '');
      fd.append('is_active', String(isActive));
      fd.append('sort_order', String(Number(sortOrder) || 0));

      const method = editingId ? 'PATCH' : 'POST';
      const url = editingId
        ? apiUrl(`admin/hero-images/${editingId}/`)
        : apiUrl('admin/hero-images/');

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.detail || data?.message || data?.error || `Request failed (${res.status})`);
      }

      setSuccess(editingId ? 'Hero image updated successfully.' : 'Hero image created successfully.');
      await fetchItems();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to save hero image');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    if (!confirm('Delete this hero slide?')) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(apiUrl(`admin/hero-images/${id}/`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || data?.message || `Delete failed (${res.status})`);
      }

      setSuccess('Hero image deleted.');
      await fetchItems();
      if (editingId === id) resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to delete hero image');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-3">
            <ImageIcon size={24} className="text-blue-600" />
            Manage Hero Carousel Images
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Upload, reorder, activate/deactivate hero slides shown on the homepage.
          </p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl">{success}</div>}

      <div className="bg-white p-6 rounded-2xl shadow border">
        <h4 className="text-xl font-semibold mb-4">
          {editingId ? 'Edit Hero Slide' : 'Create New Hero Slide'}
        </h4>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Hero Image *</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFormImage(e.target.files?.[0] || null)}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                {editingId ? 'Optional when editing (leave empty to keep current image).' : 'Required for creating a new slide.'}
              </p>

              {previewUrl ? (
                <div className="mt-3 rounded-xl overflow-hidden border bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Hero preview" className="w-full h-56 object-cover" />
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Alt Text</label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Accessibility alt text"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Link URL (optional)</label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Sort Order</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-3 pt-7">
                  <input
                    id="heroActive"
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="heroActive" className="text-sm font-medium text-gray-700">
                    Active
                  </label>
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  <Save size={18} />
                  {submitting ? (editingId ? 'Updating...' : 'Creating...') : editingId ? 'Update' : 'Create'}
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
            </div>
          </div>
        </form>
      </div>

      <div>
        <h4 className="text-xl font-semibold mb-4">Existing Slides</h4>
        {loading ? (
          <div className="text-center py-10 text-gray-600">Loading slides...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 text-gray-600">No slides created yet.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {items.map((a) => (
              <div key={a.id} className="bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow transition">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.image} alt={a.alt_text || `Hero slide ${a.id}`} className="w-full h-48 object-cover" />
                  <div className="absolute top-3 left-3">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        a.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {a.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white/90 text-gray-700 border">
                      Sort: {a.sort_order}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <p className="text-sm text-gray-600 break-words">
                    {a.link_url ? `Link: ${a.link_url}` : 'No link URL'}
                  </p>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => startEdit(a)}
                      disabled={submitting}
                      className="flex-1 px-3 py-2 border hover:bg-gray-50 transition text-blue-700 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Edit size={16} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      disabled={submitting}
                      className="flex-1 px-3 py-2 border hover:bg-red-50 transition text-red-700 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                    >
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

