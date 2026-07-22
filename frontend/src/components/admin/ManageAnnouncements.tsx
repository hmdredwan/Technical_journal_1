'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl } from '@/utils/api';
import { Edit, Plus, Save, Trash2, X } from 'lucide-react';

type Announcement = {
  id: number;
  message: string;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export default function ManageAnnouncements() {
  const token = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }, []);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [message, setMessage] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState<number>(0);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (editingId && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editingId]);

  const fetchAnnouncements = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('admin/announcements/'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          data?.detail || data?.message || data?.error || `Request failed (${res.status})`
        );
      }
      setAnnouncements(Array.isArray(data) ? data : data?.results || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const resetForm = () => {
    setEditingId(null);
    setMessage('');
    setLinkUrl('');
    setIsActive(true);
    setSortOrder(0);
    setSuccess('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setError('Announcement message is required.');
      return;
    }

    setSubmitting(true);
    setSuccess('');
    setError('');
    try {
      const payload = {
        message: trimmedMessage,
        link_url: linkUrl.trim() ? linkUrl.trim() : null,
        is_active: isActive,
        sort_order: Number(sortOrder) || 0,
      };

      if (editingId) {
        const res = await fetch(apiUrl(`admin/announcements/${editingId}/`), {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.detail || data?.message || data?.error || `Update failed (${res.status})`);
        }

        setSuccess('Announcement updated successfully.');
      } else {
        const res = await fetch(apiUrl('admin/announcements/'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.detail || data?.message || data?.error || `Create failed (${res.status})`);
        }
        setSuccess('Announcement created successfully.');
      }

      await fetchAnnouncements();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to save announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (a: Announcement) => {
    setEditingId(a.id);
    setMessage(a.message || '');
    setLinkUrl(a.link_url || '');
    setIsActive(Boolean(a.is_active));
    setSortOrder(Number(a.sort_order) || 0);
    setSuccess('');
    setError('');
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    if (!confirm('Delete this announcement?')) return;

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(apiUrl(`admin/announcements/${id}/`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || data?.message || data?.error || `Delete failed (${res.status})`);
      }
      setSuccess('Announcement deleted successfully.');
      await fetchAnnouncements();
      if (editingId === id) resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to delete announcement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-3">
            <Plus size={22} className="text-blue-600" />
            Manage Announcements Bar
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Admin can create, update, delete announcement items shown in the top marquee.
          </p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl">{success}</div>}

      <div className="bg-white p-6 rounded-2xl shadow border">
        <h4 className="text-xl font-semibold mb-4">{editingId ? 'Edit Announcement' : 'Create New Announcement'}</h4>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Message *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder='Example: "📢 New Call for Papers... Deadline: March 31, 2026"'
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
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

            <div>
              <label className="block text-sm font-medium mb-2">Sort Order</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="isActive"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Active (shown in Navbar)
            </label>
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
        </form>
      </div>

      <div>
        <h4 className="text-xl font-semibold mb-4">Existing Items</h4>
        {loading ? (
          <div className="text-center py-10 text-gray-600">Loading announcements...</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-10 text-gray-600">No announcement items yet.</div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="bg-white border rounded-2xl p-4 shadow-sm hover:shadow transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${a.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                        {a.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-xs text-gray-500">Sort: {a.sort_order}</span>
                    </div>
                    <p className="mt-2 text-gray-900 font-medium break-words">{a.message}</p>
                    {a.link_url ? (
                      <a
                        href={a.link_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-700 hover:underline text-sm mt-2 inline-block"
                      >
                        {a.link_url}
                      </a>
                    ) : (
                      <p className="text-sm text-gray-500 mt-2">No link</p>
                    )}
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleEdit(a)}
                      disabled={submitting}
                      className="px-3 py-2 rounded-xl border hover:bg-gray-50 transition text-blue-700 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Edit size={18} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      disabled={submitting}
                      className="px-3 py-2 rounded-xl border hover:bg-red-50 transition text-red-700 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Trash2 size={18} />
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

