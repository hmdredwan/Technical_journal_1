'use client';

import { useState, useEffect } from 'react';
import { apiUrl } from '@/utils/api';
import { Calendar, Clock, Save, Trash2 } from 'lucide-react';

export default function ManageSubmissionDeadline() {
  // Store date/time in explicit DD/MM/YYYY + HH:mm parts (stable formatting).
  const [deadlineDay, setDeadlineDay] = useState('');
  const [deadlineMonth, setDeadlineMonth] = useState('');
  const [deadlineYear, setDeadlineYear] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [note, setNote] = useState('');
  const [current, setCurrent] = useState<any>(null);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const token = localStorage.getItem('access_token');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [currentRes, listRes] = await Promise.all([
        fetch(apiUrl('submission-deadline/'), {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(apiUrl('admin/deadlines/'), {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!currentRes.ok) {
        throw new Error('Failed to fetch current deadline');
      }
      if (!listRes.ok) {
        throw new Error('Failed to fetch deadline history');
      }

      const currentData = await currentRes.json();
      const listData = await listRes.json();

      setCurrent(currentData);
      setDeadlines(Array.isArray(listData) ? listData : listData.results || []);

      if (currentData.has_deadline) {
        const dt = new Date(currentData.deadline);
        setDeadlineDay(String(dt.getDate()).padStart(2, '0'));
        setDeadlineMonth(String(dt.getMonth() + 1).padStart(2, '0'));
        setDeadlineYear(String(dt.getFullYear()));
        setDeadlineTime(`${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`);
        setNote(currentData.note || '');
      } else {
        setDeadlineDay('');
        setDeadlineMonth('');
        setDeadlineYear('');
        setDeadlineTime('');
        setNote('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load deadlines');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDeadline = async () => {
    if (!deadlineDay || !deadlineMonth || !deadlineYear || !deadlineTime) {
      setError('Please select a valid date and time');
      return;
    }

    const day = Number(deadlineDay);
    const month = Number(deadlineMonth);
    const year = Number(deadlineYear);

    const timeParts = deadlineTime.split(':');
    const hour = Number(timeParts[0]);
    const minute = Number(timeParts[1]);

    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year) || !Number.isFinite(hour) || !Number.isFinite(minute)) {
      setError('Invalid date/time values');
      return;
    }

    // Build local Date to preserve the user-selected wall-clock time.
    const dt = new Date(year, month - 1, day, hour, minute, 0, 0);
    // Validate that the Date didn't overflow (e.g., 31/02).
    if (dt.getFullYear() !== year || dt.getMonth() !== (month - 1) || dt.getDate() !== day) {
      setError('Invalid calendar date');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(apiUrl('admin/deadlines/'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deadline: dt.toISOString(),
          note: note.trim(),
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(errText || 'Failed to set deadline');
      }

      setSuccess('Deadline set/extended successfully!');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Error while setting deadline');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDeadline = async (deadlineId: number) => {
    if (!deadlineId) {
      setError('Invalid deadline selected for deletion');
      return;
    }

    if (!confirm('Are you sure you want to delete this deadline? This action cannot be undone.')) {
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(apiUrl(`admin/deadlines/${deadlineId}/`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(errText || `Failed to delete (status ${res.status})`);
      }

      setSuccess('Deadline deleted successfully');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete deadline');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-600">Loading current deadline...</div>;
  }

  const formatDeadlineDisplay = (iso: string) => {
    const dt = new Date(iso);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = String(dt.getFullYear());
    const hh = String(dt.getHours()).padStart(2, '0');
    const min = String(dt.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <Calendar size={28} className="text-blue-600" />
        Manage Manuscript Submission Deadline
      </h2>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow border">
        <h3 className="text-xl font-semibold mb-4">Current Active Deadline</h3>

        {current?.has_deadline ? (
          <>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-600">Deadline Date & Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatDeadlineDisplay(current.deadline)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p
                  className={`text-xl font-bold ${
                    current.is_expired ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {current.is_expired ? 'Expired' : 'Active'}
                </p>
              </div>
            </div>

            {current.note && (
              <div className="mb-6 pt-4 border-t">
                <p className="text-sm text-gray-600">Note / Reason:</p>
                <p className="text-gray-800 mt-1">{current.note}</p>
              </div>
            )}

            <button
              onClick={() => handleDeleteDeadline(current.id)}
              disabled={actionLoading}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={18} />
              {actionLoading ? 'Removing...' : 'Remove Current Deadline'}
            </button>
          </>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-6 rounded-xl">
            No submission deadline is currently set. Authors can submit freely.
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xl font-semibold">Deadline History</h3>
            <p className="text-sm text-gray-500">All deadlines are shown here, including expired ones.</p>
          </div>
        </div>

        {deadlines.length === 0 ? (
          <p className="text-gray-500">No deadlines have been created yet.</p>
        ) : (
          <div className="space-y-4">
            {deadlines.map((deadline) => {
              const isCurrent = current?.id === deadline.id;
              const isExpired = new Date(deadline.deadline) <= new Date();
              return (
                <div
                  key={deadline.id}
                  className={`rounded-2xl border px-5 py-4 ${
                    isCurrent ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Deadline</p>
                      <p className="font-semibold text-lg text-gray-900">{formatDeadlineDisplay(deadline.deadline)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        isExpired ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isExpired ? 'Expired' : 'Active'}
                      </span>
                      {isCurrent && (
                        <span className="rounded-full px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700">
                          Current
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm text-gray-600">
                    <p>Created: {formatDeadlineDisplay(deadline.created_at)}</p>
                    <p>Set by: {deadline.extended_by_name || 'System'}</p>
                  </div>

                  {deadline.note && (
                    <p className="mt-3 text-sm text-gray-700">Note: {deadline.note}</p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-3 items-center">
                    <button
                      onClick={() => handleDeleteDeadline(deadline.id)}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                    {isCurrent && (
                      <span className="text-xs uppercase tracking-[0.2em] text-blue-600 font-semibold">
                        Current deadline
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Set / Extend Form */}
      <div className="bg-white p-8 rounded-xl shadow border">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Clock size={22} />
          {current?.has_deadline ? 'Extend Deadline' : 'Set New Deadline'}
        </h3>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deadline Date & Time <span className="text-red-600">*</span>
            </label>
            <div className="grid md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Day</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={deadlineDay}
                  onChange={(e) => setDeadlineDay(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="DD"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={deadlineMonth}
                  onChange={(e) => setDeadlineMonth(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="MM"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  value={deadlineYear}
                  onChange={(e) => setDeadlineYear(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="YYYY"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
                <input
                  type="time"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Use format <span className="font-medium">DD/MM/YYYY</span> and <span className="font-medium">HH:mm</span>.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason / Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Extended due to high demand / special call for papers"
            />
          </div>

          <button
            onClick={handleSetDeadline}
            disabled={
              actionLoading ||
              !deadlineDay ||
              !deadlineMonth ||
              !deadlineYear ||
              !deadlineTime
            }
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {actionLoading
              ? 'Saving...'
              : current?.has_deadline
              ? 'Extend Deadline'
              : 'Set Deadline'}
          </button>
        </div>
      </div>
    </div>
  );
}