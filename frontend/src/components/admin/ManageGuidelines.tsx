'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl } from '@/utils/api';
import { Edit, FileText, Save, Trash2, Upload, X } from 'lucide-react';

type Guideline = {
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

export default function ManageGuidelines() {
  const token = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }, []);

  const [items, setItems] = useState<Guideline[]>([]);
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

  const fetchGuidelines = async () => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(apiUrl('admin/guidelines/'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.detail || data?.message || data?.error || `Request failed (${res.status})`);
      }

      const list = Array.isArray(data) ? data : data?.results || [];
      setItems(list);
    } catch (err: any) {
      setError(err?.message || 'Failed to load guidelines');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuidelines();
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
    setFormFile(null);
    setIsActive(true);
    setSortOrder(0);
    setSuccess('');
    setError('');
  };

  const startEdit = (item: Guideline) => {
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
      setError('Please choose a PDF or DOCX file.');
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

      // For edit, upload is optional (keep existing file if omitted).
      if (formFile) {
        fd.append('file', formFile);
      }

      const url = editingId
        ? apiUrl(`admin/guidelines/${editingId}/`)
        : apiUrl('admin/guidelines/');

      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.detail || data?.message || data?.error || `Request failed (${res.status})`);
      }

      setSuccess(editingId ? 'Guideline updated successfully.' : 'Guideline created successfully.');
      await fetchGuidelines();
      resetForm();
    } catch (err: any) {
      setError(err?.message || 'Failed to save guidelines');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    if (!confirm('Delete this guideline document?')) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(apiUrl(`admin/guidelines/${id}/`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || data?.message || data?.error || `Delete failed (${res.status})`);
      }

      setSuccess('Guideline deleted successfully.');
      await fetchGuidelines();
      if (editingId === id) resetForm();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete guideline');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-3">
            <FileText size={24} className="text-blue-600" />
            Manage Guidelines
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Upload PDF or DOCX. The active guideline will be shown on the public Guidelines page.
          </p>
        </div>
      </div>

      {error ? <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl">{error}</div> : null}
      {success ? <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl">{success}</div> : null}

      <div className="bg-white p-6 rounded-2xl shadow border">
        <h4 className="text-xl font-semibold mb-4">
          {editingId ? 'Edit Guideline Document' : 'Create New Guideline Document'}
        </h4>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. Author Guidelines (2026)"
                required
              />

              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Guideline File {editingId ? '(optional to replace)' : '*'}</label>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Extraction is reliable for PDF and DOCX. DOC may not render as text.
                </p>
                {formFile ? (
                  <p className="text-sm text-gray-700 mt-2">
                    Selected: <span className="font-medium">{formFile.name}</span>
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
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
                    id="guidelineActive"
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="guidelineActive" className="text-sm font-medium text-gray-700">
                    Active
                  </label>
                </div>
              </div>

              <div className="flex gap-3 flex-wrap pt-2">
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

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm font-medium text-blue-900">Tip</p>
                <p className="text-sm text-blue-900/90 mt-1">
                  When you set a document to <span className="font-semibold">Active</span>, the system keeps
                  only one active guideline for a deterministic public display.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div>
        <h4 className="text-xl font-semibold mb-4">Author Guidelines</h4>
        {loading ? (
          <div className="text-center py-10 text-gray-600">Loading documents...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 text-gray-600">No guideline documents yet.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {items.map((a) => (
              <div key={a.id} className="bg-white border rounded-2xl p-4 shadow-sm hover:shadow transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          a.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {a.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-xs text-gray-500">Sort: {a.sort_order}</span>
                    </div>

                    <p className="mt-2 text-gray-900 font-medium break-words">{a.title}</p>

                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {a.file ? (
                        <a
                          href={a.file}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-700 hover:underline text-sm inline-flex items-center gap-2"
                        >
                          <Upload size={16} />
                          Open File
                        </a>
                      ) : (
                        <span className="text-sm text-gray-500">No file</span>
                      )}
                    </div>

                    {a.extraction_error ? (
                      <p className="mt-2 text-sm text-red-700">
                        Extraction issue: {a.extraction_error}
                      </p>
                    ) : null}

                    {a.extracted_text_preview ? (
                      <p className="mt-3 text-xs text-gray-600 whitespace-pre-wrap">
                        {a.extracted_text_preview}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => startEdit(a)}
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

