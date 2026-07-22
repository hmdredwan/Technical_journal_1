// src/components/admin/DecisionLogsTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { apiUrl } from '@/utils/api';
import { Clock, User, FileText, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

interface DecisionLog {
  id: number;
  submission_title?: string;
  user_name?: string;
  action: string;
  remarks?: string;
  timestamp: string;
}

export default function DecisionLogsTab() {
  const [logs, setLogs] = useState<DecisionLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<DecisionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [reportRange, setReportRange] = useState('all');

  const token = localStorage.getItem('access_token');

  useEffect(() => {
    fetchDecisionLogs();
  }, []);

  const fetchDecisionLogs = async () => {
    if (!token) {
      setError('Authentication token missing. Please log in.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await fetch(apiUrl('decision-logs/'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let errMsg = `Failed to load decision logs (${res.status})`;
        try {
          const errData = await res.json();
          errMsg = errData.detail || errData.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      const newLogs = Array.isArray(data) ? data : (data.results || data.data || []);
      setLogs(newLogs);
      setFilteredLogs(newLogs);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading decision logs');
      setLogs([]);
      setFilteredLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const openReport = () => {
    const url = `/dashboard/decision-logs/report?range=${encodeURIComponent(reportRange)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(filteredLogs.length, startIndex + rowsPerPage);
  const currentPageLogs = filteredLogs.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

  const handleRowsPerPageChange = (newRows: number) => {
    setRowsPerPage(newRows);
    setCurrentPage(1);           // Reset to first page
    setExpandedRows(new Set());  // Collapse expanded cards
  };

  const toggleRow = (id: number) => {
    const newSet = new Set(expandedRows);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setExpandedRows(newSet);
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return <p className="text-red-600 text-center py-10">{error}</p>;
  }

  const displayStartIndex = (currentPage - 1) * rowsPerPage + 1;
  const displayEndIndex = Math.min(currentPage * rowsPerPage, filteredLogs.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 className="text-2xl font-bold text-gray-900">Decision Logs</h3>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2 text-gray-700">
            <span className="font-medium">Duration</span>
            <select
              value={reportRange}
              onChange={(e) => setReportRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All time</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </label>

          <button
            type="button"
            onClick={openReport}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            Generate Report
          </button>

          <span className="text-gray-600">Show per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            disabled={loading}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <p className="text-gray-600 text-center py-12 bg-white rounded-xl border border-gray-100">
          No decision logs found yet.
        </p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-xl shadow-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submission</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentPageLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FileText size={18} className="text-gray-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-900 line-clamp-2">
                          {log.submission_title || 'Untitled Submission'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <User size={18} className="text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{log.user_name || 'System'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-md">
                      {log.remarks || <span className="text-gray-400 italic">-</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {currentPageLogs.map((log) => {
              const isExpanded = expandedRows.has(log.id);
              return (
                <div key={log.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div
                    onClick={() => toggleRow(log.id)}
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText size={20} className="text-gray-400" />
                        <p className="font-medium text-gray-900 line-clamp-2">
                          {log.submission_title || 'Untitled Submission'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <User size={16} /> {log.user_name || 'System'}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={16} /> {new Date(log.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                        {log.action}
                      </span>
                      <ChevronDown className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} size={20} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t bg-gray-50">
                      <p className="text-gray-500 mb-1 text-sm font-medium">Remarks</p>
                      <p className="text-gray-700">{log.remarks || 'No remarks provided.'}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination (same style as ManageReviewerApplications) */}
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-b-xl">
            <p className="text-sm text-gray-600">
              Showing {displayStartIndex}–{displayEndIndex} of {filteredLogs.length} logs
            </p>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span>Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-2">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <p className="text-xs sm:text-sm text-gray-500 text-center md:text-left">
        Showing all editorial and review decisions made by editors and admins.
      </p>
    </div>
  );
}