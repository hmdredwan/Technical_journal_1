'use client';

import { useState, useEffect } from 'react';
import { apiUrl } from '@/utils/api';
import { Plus, Edit, Trash, Calendar, File, AlertCircle, CheckCircle } from 'lucide-react';

interface CallForPaperAdvertize {
  id: number;
  file: string;
  file_type: 'pdf' | 'image';
  title: string;
  description: string;
  is_active: boolean;
  inactive_after: string | null;
  created_by_email: string;
  created_at: string;
  updated_at: string;
}

export default function ManageCallForPaperAdvertize() {
  const [advertisements, setAdvertisements] = useState<CallForPaperAdvertize[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [existingFileName, setExistingFileName] = useState<string>('');
  const [formData, setFormData] = useState({
    file: null as File | null,
    file_type: 'pdf' as 'pdf' | 'image',
    title: '',
    description: '',
    is_active: true,
    inactive_after: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const token = localStorage.getItem('access_token');

  const fetchAdvertisements = async () => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(apiUrl('admin/call-for-paper-advertize/'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to load advertisements');
      const data = await res.json();
      setAdvertisements(Array.isArray(data) ? data : data.results || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load advertisements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvertisements();
  }, [token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Detect file type based on extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      const fileType = ext === 'pdf' ? 'pdf' : 'image';
      setFormData(prev => ({ ...prev, file, file_type: fileType }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const formDataObj = new FormData();
      if (formData.file) formDataObj.append('file', formData.file);
      formDataObj.append('file_type', formData.file_type);
      formDataObj.append('title', formData.title);
      formDataObj.append('description', formData.description);
      formDataObj.append('is_active', formData.is_active.toString());
      if (formData.inactive_after) {
        formDataObj.append('inactive_after', new Date(formData.inactive_after).toISOString());
      }

      const method = editingId ? 'PATCH' : 'POST';
      const endpoint = editingId
        ? `admin/call-for-paper-advertize/${editingId}/`
        : 'admin/call-for-paper-advertize/';

      const res = await fetch(apiUrl(endpoint), {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formDataObj,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          typeof errData === 'object'
            ? Object.values(errData).flat().join(', ')
            : 'Save failed'
        );
      }

      setFormData({
        file: null,
        file_type: 'pdf',
        title: '',
        description: '',
        is_active: true,
        inactive_after: '',
      });
      setEditingId(null);
      setShowForm(false);
      await fetchAdvertisements();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (ad: CallForPaperAdvertize) => {
    // Extract filename from the file path
    const fileName = ad.file.split('/').pop() || 'File';
    
    setFormData({
      file: null,
      file_type: ad.file_type,
      title: ad.title,
      description: ad.description,
      is_active: ad.is_active,
      inactive_after: ad.inactive_after
        ? new Date(ad.inactive_after).toISOString().split('T')[0]
        : '',
    });
    setExistingFileName(fileName);
    setEditingId(ad.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this advertisement?')) return;

    try {
      const res = await fetch(apiUrl(`admin/call-for-paper-advertize/${id}/`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Delete failed');
      await fetchAdvertisements();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setExistingFileName('');
    setFormData({
      file: null,
      file_type: 'pdf',
      title: '',
      description: '',
      is_active: true,
      inactive_after: '',
    });
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Call for Paper Advertisements</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} /> New Advertisement
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white border border-gray-200 p-6 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold">
            {editingId ? 'Edit Advertisement' : 'New Advertisement'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File (PDF or Image) {!editingId && <span className="text-red-600">*</span>}
              </label>
              {editingId && existingFileName && (
                <div className="bg-blue-50 border-2 border-blue-200 p-3 rounded-lg mb-3">
                  <p className="text-sm text-blue-900 font-medium">Current File:</p>
                  <p className="text-sm text-blue-700 mt-1">{existingFileName}</p>
                  <p className="text-xs text-blue-600 mt-2 italic">Upload a new file to replace it (optional)</p>
                </div>
              )}
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,image/*"
                required={!editingId}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              {formData.file ? (
                <p className="text-sm text-green-600 font-medium mt-2">✓ New file selected: {formData.file.name}</p>
              ) : editingId ? (
                <p className="text-xs text-gray-500 mt-2">No new file selected - existing file will be kept</p>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Advertisement title"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-Deactivate Date/Time
              </label>
              <input
                type="datetime-local"
                value={formData.inactive_after}
                onChange={e => setFormData(prev => ({ ...prev, inactive_after: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to keep active indefinitely
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="h-4 w-4 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Active (Show on homepage)
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {advertisements.length === 0 ? (
          <div className="text-center py-8 text-gray-600">No advertisements yet</div>
        ) : (
          advertisements.map(ad => (
            <div
              key={ad.id}
              className="bg-white border border-gray-200 p-6 rounded-lg hover:shadow-md transition"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {ad.title || 'Untitled Advertisement'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Created by {ad.created_by_email} on{' '}
                    {new Date(ad.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(ad)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Edit size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(ad.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash size={20} />
                  </button>
                </div>
              </div>

              {ad.description && (
                <p className="text-gray-700 mb-3">{ad.description}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <File size={16} /> {ad.file_type.toUpperCase()}
                </div>
                <div className="flex items-center gap-2">
                  {ad.is_active ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle size={16} /> Active
                    </span>
                  ) : (
                    <span className="text-gray-500">Inactive</span>
                  )}
                </div>
                {ad.inactive_after && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar size={16} /> Deactivates:{' '}
                    {new Date(ad.inactive_after).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
