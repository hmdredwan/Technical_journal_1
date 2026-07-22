'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar, AlertCircle, FileText } from 'lucide-react';
import { apiUrl } from '@/utils/api';

interface SubmissionPeriod {
  id: number;
  volume: string;
  issue: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  submissions_count: number;
  created_at: string;
}

export default function ManageSubmissionPeriods() {
  const [periods, setPeriods] = useState<SubmissionPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateError, setDateError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<SubmissionPeriod | null>(null);

  const [formData, setFormData] = useState({
    volume: '',
    issue: '',
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    is_active: true,
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  // Fetch periods
  const fetchData = async () => {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const periodsRes = await fetch(apiUrl('admin/submission-periods/'), { headers });

      if (!periodsRes.ok) {
        throw new Error('Failed to fetch periods');
      }

      const periodsData = await periodsRes.json();

      setPeriods(Array.isArray(periodsData) ? periodsData : periodsData.results || []);
    } catch (error) {
      setError('Failed to load submission periods');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate date range
    setDateError('');

    if (!formData.start_date || !formData.end_date) {
      setDateError('Both start date and end date are required.');
      return;
    }

    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);

    if (endDate < startDate) {
      setDateError('End date cannot be earlier than start date. Please select a valid date range.');
      return;
    }

    if (!token) return;

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const payload = {
        volume: formData.volume,
        issue: formData.issue,
        title: formData.title,
        description: formData.description,
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_active: formData.is_active,
      };

      let response;
      if (editingPeriod) {
        response = await fetch(apiUrl(`admin/submission-periods/${editingPeriod.id}/`), {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(apiUrl('admin/submission-periods/'), {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.volume?.[0] || errorData.issue?.[0] || 'Failed to save submission period');
      }

      setShowForm(false);
      setEditingPeriod(null);
      setDateError('');
      setFormData({
        volume: '',
        issue: '',
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        is_active: true,
      });
      fetchData();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save submission period');
    }
  };

  const handleEdit = (period: SubmissionPeriod) => {
    setEditingPeriod(period);
    setFormData({
      volume: period.volume,
      issue: period.issue,
      title: period.title,
      description: period.description,
      start_date: period.start_date.split('T')[0],
      end_date: period.end_date.split('T')[0],
      is_active: period.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (periodId: number) => {
    if (!token) return;

    if (!confirm('Are you sure you want to delete this submission period?')) {
      return;
    }

    try {
      const response = await fetch(apiUrl(`admin/submission-periods/${periodId}/`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete submission period');
      }

      fetchData();
    } catch (error) {
      setError('Failed to delete submission period');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingPeriod(null);
    setDateError('');
    setFormData({
      volume: '',
      issue: '',
      title: '',
      description: '',
      start_date: '',
      end_date: '',
      is_active: true,
    });
  };

  const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    // Real-time validation
    if (newFormData.start_date && newFormData.end_date) {
      const startDate = new Date(newFormData.start_date);
      const endDate = new Date(newFormData.end_date);

      if (endDate < startDate) {
        setDateError('End date cannot be earlier than start date. Please select a valid date range.');
      } else {
        setDateError('');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading submission periods...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Submission Periods</h3>
          <p className="text-gray-600 mt-1">Manage submission periods for specific journal volumes and issues</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Add Period
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto">
            <h4 className="text-xl font-bold mb-4">
              {editingPeriod ? 'Edit Submission Period' : 'Add Submission Period'}
            </h4>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Date Validation Error */}
              {dateError && (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900">Invalid Date Range</p>
                    <p className="text-red-700 text-sm mt-1">{dateError}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Volume *</label>
                  <input
                    type="text"
                    value={formData.volume}
                    onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                    placeholder="e.g., Volume 1, Vol 2024"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue *</label>
                  <input
                    type="text"
                    value={formData.issue}
                    onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
                    placeholder="e.g., Issue 1, Special Issue"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Spring 2024 Submissions"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description or call for papers details"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleDateChange('start_date', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                      dateError 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleDateChange('end_date', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                      dateError 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Active Period
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={dateError ? true : false}
                  className={`flex-1 py-2 px-4 rounded-lg transition font-medium ${
                    dateError
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {editingPeriod ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Periods List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900">Submission Periods</h4>
        </div>

        <div className="divide-y divide-gray-200">
          {periods.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No submission periods found. Create your first period to get started.
            </div>
          ) : (
            periods.map((period) => (
              <div key={period.id} className="px-6 py-6 hover:bg-gray-50 border-b last:border-b-0 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-4">
                    {/* Title and Description */}
                    <div>
                      <h5 className="font-bold text-lg text-gray-900">{period.title}</h5>
                      {period.description && (
                        <p className="text-sm text-gray-600 mt-2">{period.description}</p>
                      )}
                    </div>

                    {/* Main Info Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
                      {/* Volume & Issue */}
                      <div className="bg-blue-50 rounded-xl p-3">
                        <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Volume & Issue</p>
                        <p className="text-sm font-bold text-gray-900 mt-1">
                          Vol. {period.volume}
                        </p>
                        <p className="text-sm text-gray-700">Issue {period.issue}</p>
                      </div>

                      {/* Date Range */}
                      <div className="bg-purple-50 rounded-xl p-3">
                        <p className="text-xs text-purple-600 font-semibold uppercase tracking-wide">Period</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1 flex items-center gap-1">
                          <Calendar size={14} className="text-purple-600" />
                          {new Date(period.start_date).toLocaleDateString('en-GB')}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          to {new Date(period.end_date).toLocaleDateString('en-GB')}
                        </p>
                      </div>

                      {/* Manuscript Count - PROMINENT */}
                      <div className={`rounded-xl p-3 ${
                        period.submissions_count > 10 
                          ? 'bg-green-50' 
                          : period.submissions_count > 5 
                          ? 'bg-yellow-50' 
                          : 'bg-orange-50'
                      }`}>
                        <p className={`text-xs font-semibold uppercase tracking-wide ${
                          period.submissions_count > 10 
                            ? 'text-green-600' 
                            : period.submissions_count > 5 
                            ? 'text-yellow-600' 
                            : 'text-orange-600'
                        }`}>
                          Manuscripts
                        </p>
                        <p className={`text-2xl font-extrabold mt-2 flex items-center gap-2 ${
                          period.submissions_count > 10 
                            ? 'text-green-900' 
                            : period.submissions_count > 5 
                            ? 'text-yellow-900' 
                            : 'text-orange-900'
                        }`}>
                          <FileText size={18} />
                          {period.submissions_count}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          submission{period.submissions_count !== 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center">
                        {period.is_active ? (
                          <span className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                            <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 rounded-full text-sm font-semibold">
                            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleEdit(period)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition font-medium text-sm"
                      title="Edit this submission period"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(period.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition font-medium text-sm"
                      title="Delete this submission period"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}