// src/components/admin/ManageRoles.tsx
'use client';

import { useState, useEffect } from 'react';
import { apiUrl } from '@/utils/api';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface Role {
  id: number;
  name: string;
  description?: string;
}

export default function ManageRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(apiUrl('roles/'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let errMsg = `Failed to load roles (${res.status})`;
        try {
          const errData = await res.json();
          errMsg = errData.detail || errData.message || (Object.values(errData)[0] as string[] | undefined)?.[0] || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      setRoles(Array.isArray(data) ? data : data.results || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error loading roles';
      setError(message);
      console.error('Fetch roles error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const url = editingRole 
      ? apiUrl(`roles/${editingRole.id}/`) 
      : apiUrl('roles/');
    const method = editingRole ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRole),
      });

      if (!res.ok) {
        let errMsg = 'Failed to save role';
        try {
          const errData = await res.json();
          errMsg = errData.detail || errData.message || (Object.values(errData)[0] as string[] | undefined)?.[0] || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const result = await res.json();

      if (editingRole) {
        setRoles(prev => prev.map(r => r.id === result.id ? result : r));
        setEditingRole(null);
      } else {
        setRoles(prev => [...prev, result]);
      }

      setNewRole({ name: '', description: '' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(message);
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setNewRole({ name: role.name, description: role.description || '' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this role? Users with this role will lose it.')) return;

    try {
      const res = await fetch(apiUrl(`roles/${id}/`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let errMsg = 'Failed to delete role';
        try {
          const errData = await res.json();
          errMsg = errData.detail || errData.message || (Object.values(errData)[0] as string[] | undefined)?.[0] || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      setRoles(prev => prev.filter(r => r.id !== id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete role';
      setError(message);
    }
  };

  const cancelEdit = () => {
    setEditingRole(null);
    setNewRole({ name: '', description: '' });
  };

  if (loading) return <p className="text-center py-10">Loading roles...</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">
        {editingRole ? 'Edit Role' : 'Add New Role'}
      </h2>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6 mb-12">
        <div>
          <label className="block text-sm font-medium mb-2">Role Name *</label>
          <input
            type="text"
            value={newRole.name}
            onChange={e => setNewRole(prev => ({ ...prev, name: e.target.value }))}
            required
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">Description (optional)</label>
          <textarea
            value={newRole.description}
            onChange={e => setNewRole(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="md:col-span-2 flex gap-4">
          <button type="submit" className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            {editingRole ? 'Update Role' : 'Create Role'}
          </button>
          {editingRole && (
            <button type="button" onClick={cancelEdit} className="px-8 py-3 bg-gray-300 rounded-lg hover:bg-gray-400">
              Cancel
            </button>
          )}
        </div>
      </form>

      <h2 className="text-2xl font-bold mb-6">All Roles</h2>

      {roles.length === 0 ? (
        <p>No roles found. Add one above.</p>
      ) : (
        <div className="divide-y border rounded-xl overflow-hidden">
          {roles.map(role => (
            <div key={role.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50">
              <div>
                <h3 className="font-semibold text-lg">{role.name}</h3>
                {role.description && <p className="text-gray-600 mt-1">{role.description}</p>}
              </div>
              <div className="flex gap-4">
                <button onClick={() => handleEdit(role)} className="text-blue-600 hover:text-blue-800">
                  <Edit size={20} />
                </button>
                <button onClick={() => handleDelete(role.id)} className="text-red-600 hover:text-red-800">
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