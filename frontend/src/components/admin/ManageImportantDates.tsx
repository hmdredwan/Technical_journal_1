'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl } from '@/utils/api';
import { Calendar, Edit, Save, Trash2, X } from 'lucide-react';

type ImportantDateItem = {
  id: number;
  title: string;
  date: string;
  description: string;
  is_active: boolean;
  sort_order: number;
};

export default function ManageImportantDates() {
  const token = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }, []);

  const [items, setItems] = useState<ImportantDateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const formRef = useRef<HTMLFormElement | null>(null);
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const formatDMY = (dateStr: string) => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const fetchItems = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('admin/important-dates/'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || `Failed (${res.status})`);
      setItems(Array.isArray(data) ? data : data?.results || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load important dates');
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
    setTitle('');
    setDate('');
    setDescription('');
    setSortOrder(0);
    setIsActive(true);
  };

  const startEdit = (item: ImportantDateItem) => {
    setEditingId(item.id);
    setTitle(item.title || '');
    setDate(item.date || '');
    setDescription(item.description || '');
    setSortOrder(Number(item.sort_order) || 0);
    setIsActive(Boolean(item.is_active));
    setError('');
    setSuccess('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!title.trim() || !date) {
      setError('Title and date are required.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        title: title.trim(),
        date,
        description: description.trim(),
        sort_order: Number(sortOrder) || 0,
        is_active: isActive,
      };

      const url = editingId ? apiUrl(`admin/important-dates/${editingId}/`) : apiUrl('admin/important-dates/');
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || `Save failed (${res.status})`);
      setSuccess(editingId ? 'Important date updated.' : 'Important date created.');
      await fetchItems();
      resetForm();
    } catch (e: any) {
      setError(e?.message || 'Failed to save important date');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: number) => {
    if (!token) return;
    if (!confirm('Delete this important date?')) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(apiUrl(`admin/important-dates/${id}/`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setSuccess('Important date deleted.');
      await fetchItems();
      if (editingId === id) resetForm();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete important date');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h3 className="text-2xl font-bold flex items-center gap-3">
          <Calendar size={24} className="text-indigo-600" />
          Manage Important Dates
        </h3>
        <p className="text-sm text-gray-600 mt-1">Control the Important Dates section shown on the homepage.</p>
      </div>

      {error ? <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl">{error}</div> : null}
      {success ? <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl">{success}</div> : null}

      <div className="bg-white p-6 rounded-2xl shadow border">
        <h4 className="text-xl font-semibold mb-4">{editingId ? 'Edit Important Date' : 'Add Important Date'}</h4>
        <form ref={formRef} onSubmit={submit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (e.g., Manuscript Submission Deadline)"
              className="w-full px-4 py-3 border rounded-xl"
              required
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl"
              required
            />
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Optional short description"
            className="w-full px-4 py-3 border rounded-xl"
          />

          <div className="grid md:grid-cols-3 gap-4">
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
              <input id="importantDateActive" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <label htmlFor="importantDateActive" className="text-sm font-medium text-gray-700">Active</label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={18} />
              {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition flex items-center gap-2"
            >
              <X size={18} />
              Cancel
            </button>
          </div>
        </form>
      </div>

      <div>
        <h4 className="text-xl font-semibold mb-4"> Important Dates</h4>
        {loading ? (
          <div className="text-gray-600">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-gray-600">No important dates yet.</div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="bg-white border rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-xs text-gray-500">Sort: {item.sort_order}</span>
                      <span className="text-xs text-gray-500">{formatDMY(item.date)}</span>
                    </div>
                    <p className="mt-2 font-semibold text-gray-900">{item.title}</p>
                    {item.description ? <p className="text-sm text-gray-600 mt-1">{item.description}</p> : null}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(item)} className="px-3 py-2 rounded-xl border hover:bg-gray-50 text-indigo-700 flex items-center gap-2">
                      <Edit size={16} />
                      Edit
                    </button>
                    <button onClick={() => remove(item.id)} className="px-3 py-2 rounded-xl border hover:bg-red-50 text-red-700 flex items-center gap-2">
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

