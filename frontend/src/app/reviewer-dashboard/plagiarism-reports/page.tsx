'use client';

import { useState, useEffect } from 'react';
import { apiUrl } from '@/utils/api';
import { ExternalLink, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default function PlagiarismReportsPage() {
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchScans = async (showSpinner = true) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      if (showSpinner) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const res = await fetch(apiUrl('plagiarism-scans/'), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      setScans(Array.isArray(data) ? data : []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load plagiarism reports');
      setScans([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchScans();
    const interval = setInterval(() => fetchScans(false), 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return <p className="text-red-600 text-center py-10">{error}</p>;
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <h3 className="text-3xl font-bold text-gray-900">Plagiarism Reports</h3>
        <button
          type="button"
          onClick={() => fetchScans(false)}
          className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {refreshing ? 'Refreshing…' : 'Refresh Reports'}
        </button>
      </div>

      {scans.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No plagiarism scans found yet.</p>
          <p className="text-sm text-gray-500 mt-2">Upload a manuscript in the Plagiarism Check tab to see results here.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {scans.map((scan) => (
            <div key={scan.scan_id} className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-mono text-sm text-gray-500">Scan ID: {scan.scan_id}</p>
                  <p className="font-semibold text-lg mt-2">{scan.paper_title || 'Uploaded Manuscript'}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(scan.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                <div className={`px-5 py-2 rounded-full text-sm font-medium ${
                  scan.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : scan.status === 'error'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {scan.status === 'completed'
                    ? 'Completed'
                    : scan.status === 'error'
                      ? 'Failed'
                      : 'Processing'}
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="bg-gray-50 p-4 rounded-2xl">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900 capitalize">
                    {scan.status || 'processing'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Completed</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">
                    {scan.completed_at ? new Date(scan.completed_at).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Pending'}
                  </p>
                </div>
              </div>

              {scan.similarity_score !== null && scan.similarity_score !== undefined ? (
                <div className="mt-6">
                  <p className="text-sm text-gray-600">Similarity Score</p>
                  <p className={`text-5xl font-bold mt-1 ${
                    scan.similarity_score > 30 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {scan.similarity_score}%
                  </p>
                </div>
              ) : (
                scan.status === 'completed' ? (
                  <p className="mt-6 text-sm text-gray-500">No similarity score was available for this report.</p>
                ) : null
              )}

              {scan.ai_score !== null && scan.ai_score !== undefined ? (
                <p className="text-sm text-gray-600 mt-3">
                  AI Generated Probability: <span className="font-semibold">{scan.ai_score}%</span>
                </p>
              ) : (
                scan.status === 'completed' ? (
                  <p className="text-sm text-gray-500 mt-3">No AI probability is available for this report.</p>
                ) : null
              )}

              {scan.report_url && (
                <a
                  href={scan.report_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl transition font-medium"
                >
                  View Detailed Report <ExternalLink size={20} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}