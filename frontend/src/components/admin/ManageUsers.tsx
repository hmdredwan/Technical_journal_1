// src/components/admin/ManageUsers.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiUrl } from '@/utils/api';
import { Edit, Trash2, Search, X, Filter, RefreshCw } from 'lucide-react';

interface User {
  id: number;
  full_name: string;
  email: string;
  role?: { id: number; name: string };
  designation?: string;
  department?: string;
  is_active: boolean;
  last_login?: string | null;
}

interface Role {
  id: number;
  name: string;
}

export default function ManageUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({});

  // Filters & search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const formatLastLogin = (value?: string | null) => {
    if (!value) return 'Never logged in';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Never logged in';
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('users/'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to load users: ${res.status} - ${errText}`);
      }
      const data = await res.json();
      setUsers(data);
      setFilteredUsers(data);
    } catch (err: any) {
      setError(err.message || 'Could not load users');
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch(apiUrl('roles/public/'));
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
      }
    } catch (err) {
      console.error('Failed to load roles for filter', err);
    }
  };

  const refreshUsers = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([fetchUsers(), fetchRoles()]);
    } catch (err) {
      console.error('Refresh users error:', err);
    }
  };

  // Apply filters & search in real-time
  useMemo(() => {
    let result = [...users];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(user =>
        (user.full_name || '').toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        (user.designation || '').toLowerCase().includes(q) ||
        (user.department || '').toLowerCase().includes(q)
      );
    }

    // Role filter
    if (selectedRoleId !== '') {
      result = result.filter(user => user.role?.id === selectedRoleId);
    }

    // Status filter
    if (selectedStatus === 'active') {
      result = result.filter(user => user.is_active);
    } else if (selectedStatus === 'inactive') {
      result = result.filter(user => !user.is_active);
    }

    setFilteredUsers(result);
  }, [users, searchQuery, selectedRoleId, selectedStatus]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedRoleId('');
    setSelectedStatus('all');
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name || '',
      designation: user.designation || '',
      department: user.department || '',
      role: user.role ? { id: user.role.id, name: user.role.name } : undefined,  // ← fixed: use undefined instead of null
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'role') {
      const roleId = value ? Number(value) : undefined;
      const selectedRole = roles.find(r => r.id === roleId);
      setFormData(prev => ({
        ...prev,
        role: selectedRole ? { id: selectedRole.id, name: selectedRole.name } : undefined,
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.id) {
      setError('User ID is missing');
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        role: formData.role?.id || null,  // Send only role ID (or null)
      };

      const res = await fetch(apiUrl(`users/${editingUser.id}/`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        let message = 'Failed to update user';
        if (errData.detail) message = errData.detail;
        else if (errData.non_field_errors?.[0]) message = errData.non_field_errors[0];
        else if (Object.keys(errData).length > 0) {
          const key = Object.keys(errData)[0];
          message = `${key}: ${errData[key][0] || errData[key]}`;
        }
        throw new Error(message);
      }

      const updatedUser = await res.json();
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      setFilteredUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      await refreshUsers();
      setEditingUser(null);
      setFormData({});
    } catch (err: any) {
      setError(err.message || 'Update failed');
      console.error('Update error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;

    setActionLoading(true);
    setError('');

    try {
      const res = await fetch(apiUrl(`users/${id}/`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json();
        let message = 'Failed to delete user';
        if (errData.detail) message = errData.detail;
        else if (Object.keys(errData).length > 0) {
          const key = Object.keys(errData)[0];
          message = `${key}: ${errData[key][0] || errData[key]}`;
        }
        throw new Error(message);
      }

      setUsers(prev => prev.filter(u => u.id !== id));
      setFilteredUsers(prev => prev.filter(u => u.id !== id));
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    } finally {
      setActionLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setFormData({});
  };

  if (loading) return <div className="text-center py-10 text-lg">Loading users...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Manage Users</h2>
        <button
          onClick={() => refreshUsers()}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Search + Filters */}
      <div className="bg-white p-6 rounded-xl shadow-md border">
        <div className="flex flex-col md:flex-row md:items-end gap-6">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, email, designation..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Role Filter */}
          <div className="min-w-[180px]">
            <label className="block text-sm font-medium mb-2">Role</label>
            <select
              value={selectedRoleId}
              onChange={e => setSelectedRoleId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Roles</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="min-w-[140px]">
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Clear Filters */}
          <button
            onClick={clearFilters}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center gap-2 whitespace-nowrap"
          >
            <X size={18} />
            Clear Filters
          </button>
        </div>
      </div>

      {/* Edit Form */}
      {editingUser && (
        <div className="bg-white p-6 rounded-xl shadow-md border mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">
              Edit User: {editingUser.full_name || editingUser.email}
            </h3>
            <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>

          {error && <p className="text-red-600 mb-4">{error}</p>}

          <form onSubmit={handleUpdate} className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Designation</label>
              <input
                type="text"
                name="designation"
                value={formData.designation || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Department</label>
              <input
                type="text"
                name="department"
                value={formData.department || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Role Change Dropdown */}
            <div>
              <label className="block text-sm font-medium mb-2">Role</label>
              <select
                name="role"
                value={formData.role?.id || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No Role</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex gap-4">
              <button
                type="submit"
                disabled={actionLoading}
                className={`px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 ${
                  actionLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={actionLoading}
                className="px-8 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <h3 className="text-xl font-bold">
            All Users ({filteredUsers.length})
          </h3>
          {filteredUsers.length !== users.length && (
            <span className="text-sm text-gray-500">
              Filtered from {users.length}
            </span>
          )}
        </div>

        {filteredUsers.length === 0 ? (
          <p className="p-8 text-center text-gray-500">
            {searchQuery || selectedRoleId || selectedStatus !== 'all'
              ? 'No users match your filters'
              : 'No users found in the system'}
          </p>
        ) : (
          <div className="divide-y">
            {filteredUsers.map(user => (
              <div
                key={user.id}
                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-lg">
                      {user.full_name || 'Unnamed'}
                    </h4>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        user.is_active
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-gray-600">{user.email}</p>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-1">
                    <span>
                      Role: <span className="font-medium">{user.role?.name || 'No Role Assigned'}</span>
                    </span>
                    <span>
                      Last login: <span className="font-medium">{formatLastLogin(user.last_login)}</span>
                    </span>
                  </div>
                  {(user.designation || user.department) && (
                    <p className="text-sm text-gray-500 mt-1">
                      {user.designation} {user.designation && user.department ? '•' : ''} {user.department}
                    </p>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => handleEdit(user)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Edit User"
                  >
                    <Edit size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete User"
                  >
                    <Trash2 size={20} />
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