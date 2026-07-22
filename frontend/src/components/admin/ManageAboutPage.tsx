'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl } from '@/utils/api';
import { Edit, Save, Trash2, X, Info, Eye, BookOpen, Target, Users, List } from 'lucide-react';

type AboutSection = {
  id: number;
  section: string;
  section_display: string;
  title: string;
  content: string;
  topics: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const SECTION_CHOICES = [
  { value: 'mission', label: 'Mission', icon: Target },
  { value: 'vision', label: 'Vision', icon: Eye },
  { value: 'history', label: 'History', icon: BookOpen },
  { value: 'scope_topics', label: 'Scope & Topics', icon: List },
  { value: 'key_facts', label: 'Key Facts', icon: Info },
  { value: 'editorial_team', label: 'Editorial Team', icon: Users },
];

export default function ManageAboutPage() {
  const token = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }, []);

  const [items, setItems] = useState<AboutSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [section, setSection] = useState('mission');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [topicsInput, setTopicsInput] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState<number>(0);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const formRef = useRef<HTMLFormElement | null>(null);

  const fetchAboutContent = async () => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(apiUrl('admin/about-page/'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.detail || data?.message || data?.error || `Request failed (${res.status})`);
      }

      const list = Array.isArray(data) ? data : data?.results || [];
      setItems(list);
    } catch (err: any) {
      setError(err?.message || 'Failed to load About page content');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAboutContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (editingId && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editingId]);

  const resetForm = () => {
    setEditingId(null);
    setSection('mission');
    setTitle('');
    setContent('');
    setTopicsInput('');
    setIsActive(true);
    setSortOrder(0);
    setSuccess('');
    setError('');
  };

  const startEdit = (item: AboutSection) => {
    setEditingId(item.id);
    setSection(item.section || 'mission');
    setTitle(item.title || '');
    setContent(item.content || '');
    setTopicsInput(Array.isArray(item.topics) ? item.topics.join('\n') : '');
    setIsActive(Boolean(item.is_active));
    setSortOrder(Number(item.sort_order) || 0);
    setSuccess('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    
    if (!trimmedTitle) {
      setError('Title is required.');
      return;
    }

    if (!trimmedContent) {
      setError('Content is required.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Parse topics from textarea (one per line)
      const topics = topicsInput
        .split('\n')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const payload: Record<string, any> = {
        section,
        title: trimmedTitle,
        content: trimmedContent,
        topics: section === 'scope_topics' ? topics : [],
        is_active: isActive,
        sort_order: Number(sortOrder) || 0,
      };

      const url = editingId
        ? apiUrl(`admin/about-page/${editingId}/`)
        : apiUrl('admin/about-page/');

      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.detail || data?.message || data?.error || `Request failed (${res.status})`);
      }

      setSuccess(editingId ? 'Section updated successfully.' : 'Section created successfully.');
      await fetchAboutContent();
      resetForm();
    } catch (err: any) {
      setError(err?.message || 'Failed to save content');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    if (!confirm('Delete this section?')) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(apiUrl(`admin/about-page/${id}/`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || data?.message || data?.error || `Delete failed (${res.status})`);
      }

      setSuccess('Section deleted successfully.');
      await fetchAboutContent();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete section');
    } finally {
      setSubmitting(false);
    }
  };

  const getSectionIcon = (sectionValue: string) => {
    const choice = SECTION_CHOICES.find(s => s.value === sectionValue);
    return choice ? choice.icon : Info;
  };

  const getSectionLabel = (sectionValue: string) => {
    const choice = SECTION_CHOICES.find(s => s.value === sectionValue);
    return choice ? choice.label : sectionValue;
  };

  // Check which sections are already used
  const usedSections = items.map(item => item.section);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {editingId ? 'Edit Section' : 'Add New Section'}
        </h3>
        
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Section Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section Type
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                disabled={!!editingId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {SECTION_CHOICES.map(choice => (
                  <option 
                    key={choice.value} 
                    value={choice.value}
                    disabled={!editingId && usedSections.includes(choice.value)}
                  >
                    {choice.label}{!editingId && usedSections.includes(choice.value) ? ' (Already exists)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort Order
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`e.g., ${getSectionLabel(section)} of Technical Journal`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="Enter the main content for this section... Use blank lines for paragraphs, start lines with - or 1. for bullets, and wrap text with **bold** if needed."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Topics (only for Scope & Topics) */}
          {section === 'scope_topics' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topics (one per line)
              </label>
              <textarea
                value={topicsInput}
                onChange={(e) => setTopicsInput(e.target.value)}
                rows={6}
                placeholder="River Hydrology & Hydraulics&#10;River Basin Management&#10;Climate Change & Rivers&#10;Water Quality & Pollution"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter each topic on a new line. These will be displayed as a grid of topic cards.
              </p>
            </div>
          )}

          {/* Active Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Active (visible on About page)
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save size={18} />
              )}
              {editingId ? 'Update Section' : 'Add Section'}
            </button>
            
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                <X size={18} />
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Existing Sections List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Existing Sections ({items.length})
        </h3>

        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Info size={48} className="mx-auto mb-3 text-gray-300" />
            <p>No About page sections created yet.</p>
            <p className="text-sm">Use the form above to add your first section.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const IconComponent = getSectionIcon(item.section);
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    item.is_active 
                      ? 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm' 
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  } transition`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${item.is_active ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                      <IconComponent size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {item.title}
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {item.section_display}
                        </span>
                      </h4>
                      <p className="text-sm text-gray-500 line-clamp-1">
                        {item.content?.substring(0, 100)}...
                      </p>
                      {item.topics && item.topics.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          {item.topics.length} topics
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                    
                    <button
                      onClick={() => startEdit(item)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={submitting}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Info */}
      <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
        <h4 className="font-medium text-blue-900 mb-2">💡 About Page Preview</h4>
        <p className="text-sm text-blue-800">
          The About page will display all active sections in the order of their <strong>sort_order</strong> value. 
          Lower numbers appear first. Sections not marked as active will be hidden from the public page.
        </p>
      </div>
    </div>
  );
}