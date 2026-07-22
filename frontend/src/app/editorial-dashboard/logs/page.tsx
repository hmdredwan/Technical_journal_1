'use client';

import { CheckCircle, Clock, FileText } from 'lucide-react';

interface Assignment {
  id: number;
  submission_title?: string;
  status: string;
  status_display?: string;
  assigned_at?: string;
  due_date?: string;
  submitted_at?: string;
}

interface ReviewLogsProps {
  assignments: Assignment[] | undefined; // ← allow undefined from parent
}

export default function ReviewLogsContent({ assignments }: ReviewLogsProps) {
  // Safe guard: treat undefined/null as empty array
  const completed = (assignments || []).filter(a => a.status === 'completed');
  const inProgress = (assignments || []).filter(a => a.status === 'in_progress');

  // Helper to format dates safely
  const formatDate = (dateStr?: string, fallback = '—') => {
    if (!dateStr) return fallback;
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return fallback;
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8">My Review History</h2>

      {assignments?.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-10 text-center">
          <FileText className="mx-auto text-gray-400 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No Review History Yet
          </h3>
          <p className="text-gray-600">
            You haven't been assigned any manuscripts for review yet.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Completed */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <h3 className="text-xl font-semibold mb-5 flex items-center gap-3">
                <CheckCircle className="text-green-600" size={24} />
                Completed Reviews ({completed.length})
              </h3>

              {completed.length === 0 ? (
                <p className="text-gray-500 py-4">No completed reviews yet.</p>
              ) : (
                <ul className="space-y-4">
                  {completed.map(log => (
                    <li
                      key={log.id}
                      className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-4 bg-green-50/40 rounded-lg border border-green-100"
                    >
                      <div className="font-medium text-gray-900">
                        {log.submission_title || 'Untitled Manuscript'}
                      </div>
                      <div className="text-sm text-gray-600">
                        Submitted: {formatDate(log.submitted_at)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* In Progress */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <h3 className="text-xl font-semibold mb-5 flex items-center gap-3">
                <Clock className="text-yellow-600" size={24} />
                In Progress ({inProgress.length})
              </h3>

              {inProgress.length === 0 ? (
                <p className="text-gray-500 py-4">No reviews currently in progress.</p>
              ) : (
                <ul className="space-y-4">
                  {inProgress.map(log => (
                    <li
                      key={log.id}
                      className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-4 bg-yellow-50/40 rounded-lg border border-yellow-100"
                    >
                      <div className="font-medium text-gray-900">
                        {log.submission_title || 'Untitled Manuscript'}
                      </div>
                      <div className="text-sm text-gray-600">
                        Due: {formatDate(log.due_date, 'Not set')}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Full Activity Table */}
          <div className="bg-white rounded-2xl shadow border overflow-hidden">
            <h3 className="text-xl font-semibold p-6 border-b bg-gray-50">
              All Review Activity
            </h3>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Manuscript Title
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Assigned Date
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Due Date
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Submitted
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {(assignments || []).map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {log.submission_title || 'Untitled'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(log.assigned_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(log.due_date, '—')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                            log.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : log.status === 'in_progress'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {log.status_display || log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(log.submitted_at, '—')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {assignments?.length === 0 && (
              <div className="p-10 text-center text-gray-500">
                No review activity recorded yet.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}