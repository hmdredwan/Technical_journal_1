// src/components/admin/ManageEditorialBoard.tsx
'use client';

import { useState, useEffect } from 'react';
import { apiUrl } from '@/utils/api';
import { Edit, Trash2 } from 'lucide-react';

// Minimal interface for member data
interface EditorialMember {
  id: number;
  name: string;
  title: string;
  affiliation: string;
  expertise?: string;
  country?: string;
  email?: string;
  role_type: string;
  order: number;
  photo?: string;
}

export default function ManageEditorialBoard() {
  const [members, setMembers] = useState<EditorialMember[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    affiliation: '',
    expertise: '',
    country: '',
    email: '',
    role_type: 'associate_editor',
    order: 0,
    photo: null as File | null,
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    if (!token) {
      setError('Authentication token missing');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(apiUrl('editorial-board/'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Failed to load members (${res.status})`);
      }

      const data = await res.json();
      setMembers(Array.isArray(data) ? data : data.results || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    // Handle file input separately (only <input type="file"> has .files)
    if (e.target instanceof HTMLInputElement && e.target.type === 'file') {
      const file = e.target.files?.[0] || null;
      setFormData(prev => ({ ...prev, [name]: file }));
    } else {
      // Text, select, textarea
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Authentication token missing');
      return;
    }

    const data = new FormData();

    // Append all fields safely
    (Object.keys(formData) as Array<keyof typeof formData>).forEach((key) => {
      const value = formData[key];

      if (value === null || value === '') return;

      if (value instanceof File) {
        data.append(key as string, value);
      } else {
        data.append(key as string, value.toString().trim());
      }
    });

    const url = editingId 
      ? apiUrl(`editorial-board/${editingId}/`) 
      : apiUrl('editorial-board/');
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        let errMsg = 'Failed to save member';
        if (errData.detail) errMsg = errData.detail;
        else if (errData.message) errMsg = errData.message;
        else if (typeof errData === 'object' && errData !== null) {
          const values = Object.values(errData);
          if (values.length > 0) {
            const first = values[0];
            errMsg = Array.isArray(first) && first.length > 0 ? String(first[0]) : String(first);
          }
        }
        throw new Error(errMsg);
      }

      const result = await res.json();

      if (editingId) {
        setMembers(prev => prev.map(m => m.id === result.id ? result : m));
        setEditingId(null);
      } else {
        setMembers(prev => [...prev, result]);
      }

      setFormData({
        name: '', title: '', affiliation: '', expertise: '', country: '', email: '',
        role_type: 'associate_editor', order: 0, photo: null
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(message);
    }
  };

  const handleEdit = (member: EditorialMember) => {
    setEditingId(member.id);
    setFormData({
      name: member.name,
      title: member.title,
      affiliation: member.affiliation,
      expertise: member.expertise || '',
      country: member.country || '',
      email: member.email || '',
      role_type: member.role_type,
      order: member.order,
      photo: null
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this member?')) return;

    if (!token) {
      setError('Authentication token missing');
      return;
    }

    try {
      const res = await fetch(apiUrl(`editorial-board/${id}/`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to delete member');

      setMembers(prev => prev.filter(m => m.id !== id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete';
      setError(message);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      name: '', title: '', affiliation: '', expertise: '', country: '', email: '',
      role_type: 'associate_editor', order: 0, photo: null
    });
  };

  if (loading) return <p className="text-center py-10">Loading...</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">
        {editingId ? 'Edit Member' : 'Add New Editorial Board Member'}
      </h2>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6 mb-12">
        <div>
          <label className="block text-sm font-medium mb-2">Name <span className="text-red-600">*</span></label>
          <input 
            type="text" 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            required 
            className="w-full px-4 py-3 border rounded-lg" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Title <span className="text-red-600">*</span></label>
          <input 
            type="text" 
            name="title" 
            value={formData.title} 
            onChange={handleChange} 
            required 
            className="w-full px-4 py-3 border rounded-lg" 
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">Affiliation <span className="text-red-600">*</span></label>
          <input 
            type="text" 
            name="affiliation" 
            value={formData.affiliation} 
            onChange={handleChange} 
            required 
            className="w-full px-4 py-3 border rounded-lg" 
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">Expertise</label>
          <textarea 
            name="expertise" 
            value={formData.expertise} 
            onChange={handleChange} 
            rows={3} 
            className="w-full px-4 py-3 border rounded-lg" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Country</label>
          <input 
            type="text" 
            name="country" 
            value={formData.country} 
            onChange={handleChange} 
            className="w-full px-4 py-3 border rounded-lg" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input 
            type="email" 
            name="email" 
            value={formData.email} 
            onChange={handleChange} 
            className="w-full px-4 py-3 border rounded-lg" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Role Type <span className="text-red-600">*</span></label>
          <select 
            name="role_type" 
            value={formData.role_type} 
            onChange={handleChange} 
            required 
            className="w-full px-4 py-3 border rounded-lg"
          >
            <option value="editor_in_chief">Editor-in-Chief</option>
            <option value="executive_editor">Executive Editor</option>
            <option value="managing_editor">Managing Editor</option>
            <option value="associate_editor">Associate Editor</option>
            <option value="advisory_board">Advisory Board Member</option>
            <option value="member">Member</option>
            <option value="reviewers_panel">Reviewers Panel</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Display Order</label>
          <input 
            type="number" 
            name="order" 
            value={formData.order} 
            onChange={handleChange} 
            min="0" 
            className="w-full px-4 py-3 border rounded-lg" 
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">Photo</label>
          <input 
            type="file" 
            name="photo" 
            accept="image/*" 
            onChange={handleChange} 
            className="w-full px-4 py-3 border rounded-lg" 
          />
          {editingId && formData.photo === null && (
            <p className="text-sm text-gray-500 mt-1">Current photo will remain if no new file selected</p>
          )}
        </div>

        <div className="md:col-span-2 flex gap-4">
          <button 
            type="submit" 
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {editingId ? 'Update' : 'Add'}
          </button>
          {editingId && (
            <button 
              type="button" 
              onClick={cancelEdit} 
              className="px-8 py-3 bg-gray-300 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* List */}
      <h2 className="text-2xl font-bold mb-6">Current Members</h2>
      {members.length === 0 ? (
        <p>No members added yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map(member => (
            <div key={member.id} className="bg-white p-6 rounded-xl shadow-md border">
              {member.photo && (
                <img 
                  src={member.photo} 
                  alt={member.name} 
                  className="w-24 h-24 rounded-full object-cover mx-auto mb-4" 
                />
              )}
              <h3 className="text-xl font-bold">{member.name}</h3>
              <p className="text-blue-700">{member.title}</p>
              <p className="text-gray-600">{member.affiliation}</p>
              <p className="text-sm text-gray-500 italic mt-2">{member.expertise}</p>
              <div className="flex gap-4 mt-4">
                <button 
                  onClick={() => handleEdit(member)} 
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Edit size={20} />
                </button>
                <button 
                  onClick={() => handleDelete(member.id)} 
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}