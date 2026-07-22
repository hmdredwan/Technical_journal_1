'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl } from '@/utils/api';
import { Edit, FileText, Save, Trash2, Upload } from 'lucide-react';

type ManuscriptFormat = {
  id: number;
  title: string;
  file: string | null;
  file_extension?: string;
  extracted_text_preview?: string;
  extraction_error?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export default function ManageManuscriptFormats() {
  const token = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }, []);

  const [items, setItems] = useState<ManuscriptFormat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState<number>(0);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const formRef = useRef<HTMLFormElement | null>(null);

  const fetchFormats = async () => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(apiUrl('admin/manuscript-formats/'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.detail || data?.message || data?.error || `Request failed (${res.status})`);
      }
      const list = Array.isArray(data) ? data : data?.results || [];
      setItems(list);
    } catch (err: any) {
      setError(err?.message || 'Failed to load manuscript formats');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormats();
  }, [token]);

  useEffect(() => {
    if (editingId && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editingId]);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setFormFile(null);
    setIsActive(true);
    setSortOrder(0);
    setSuccess('');
    setError('');
  };

  const startEdit = (item: ManuscriptFormat) => {
    setEditingId(item.id);
    setTitle(item.title || '');
    setFormFile(null);
    setIsActive(Boolean(item.is_active));
    setSortOrder(Number(item.sort_order) || 0);
    setSuccess('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required.');
      return;
    }

    if (!editingId && !formFile) {
      setError('Please choose a PDF or Word file.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const fd = new FormData();
      fd.append('title', trimmedTitle);
      fd.append('is_active', String(isActive));
      fd.append('sort_order', String(Number(sortOrder) || 0));
      if (formFile) {
        fd.append('file', formFile);
      }

      const url = editingId
        ? apiUrl(`admin/manuscript-formats/${editingId}/`)
        : apiUrl('admin/manuscript-formats/');

      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.detail || data?.message || data?.error || `Request failed (${res.status})`);
      }

      setSuccess(editingId ? 'Format updated successfully.' : 'Format uploaded successfully.');
      await fetchFormats();
      resetForm();
    } catch (err: any) {
      setError(err?.message || 'Failed to save manuscript format.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    if (!confirm('Delete this manuscript format template?')) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(apiUrl(`admin/manuscript-formats/${id}/`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || data?.message || data?.error || `Delete failed (${res.status})`);
      }
      setSuccess('Format template deleted successfully.');
      await fetchFormats();
      if (editingId === id) resetForm();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete manuscript format.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-3">
            <FileText size={24} className="text-blue-600" />
            Manage Manuscript Formats
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Upload a PDF or Word format template for authors to download and preview.
          </p>
        </div>
      </div>

      {error ? <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl">{error}</div> : null}
      {success ? <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl">{success}</div> : null}

      <div className="bg-white p-6 rounded-2xl shadow border">
        <h4 className="text-xl font-semibold mb-4">{editingId ? 'Edit Manuscript Format' : 'Upload Manuscript Format'}</h4>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Manuscript Format Template"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">File {editingId ? '(optional to replace)' : '*'}</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use PDF, DOC, or DOCX. DOCX will be converted for preview when possible.
                </p>
                {formFile ? (
                  <p className="text-sm text-gray-700 mt-2">
                    Selected: <span className="font-medium">{formFile.name}</span>
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Sort Order</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <input
                  id="formatActive"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="formatActive" className="text-sm font-medium text-gray-700">
                  Active format
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Save size={18} />
              {submitting ? (editingId ? 'Updating...' : 'Uploading...') : editingId ? 'Update Format' : 'Upload Format'}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow border">
        <h4 className="text-xl font-semibold mb-4">Manuscript Formats</h4>

        {loading ? (
          <div className="text-gray-600">Loading manuscript formats...</div>
        ) : items.length === 0 ? (
          <div className="text-gray-600">No manuscript format templates uploaded yet.</div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h5 className="font-semibold text-gray-900">{item.title}</h5>
                  <p className="text-sm text-gray-600">Uploaded: {new Date(item.created_at).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-600">
                    Type: {item.file_extension?.toUpperCase() || 'Unknown'} · {item.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  {item.file ? (
                    <a
                      href={item.file}
                      download
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
                    >
                      Download
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
