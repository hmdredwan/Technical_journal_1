'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { apiUrl } from '@/utils/api';

interface DecisionLog {
  id: number;
  submission_title?: string;
  user_name?: string;
  action: string;
  remarks?: string;
  timestamp: string;
}

const durationLabels: Record<string, string> = {
  all: 'All time',
  '7': 'Last 7 days',
  '30': 'Last 30 days',
  '90': 'Last 90 days',
};

export default function DecisionLogsReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-slate-600">Loading report...</div>}>
      <DecisionLogsReportContent />
    </Suspense>
  );
}

function DecisionLogsReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const range = searchParams.get('range') || 'all';
  const [logs, setLogs] = useState<DecisionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');

    const fetchLogs = async () => {
      if (!token) {
        setError('Authentication token missing. Please log in.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(apiUrl('decision-logs/'), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error('Unable to load decision logs.');
        }

        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.results || data.data || []);
        setLogs(items);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error loading decision logs';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const days = Number(range);
    if (!Number.isFinite(days) || days <= 0 || range === 'all') return logs;

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return logs.filter((log) => new Date(log.timestamp).getTime() >= cutoff);
  }, [logs, range]);

  const generatedAt = new Date().toLocaleString();

  return (
    <main className="min-h-screen bg-white text-slate-900 print:bg-white">
      <div className="mx-auto max-w-6xl p-6 print:p-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={() => router.push('/editor-dashboard?tab=decision-logs')}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Print / Save as PDF
          </button>
        </div>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:shadow-none print:border-0">
          <header className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:h-20 md:w-20">
                  <Image
                    src="/images/journal_logo.jpeg"
                    alt="Technical Journal Logo"
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-blue-700">Technical Journal</p>
                  <h1 className="text-2xl font-black text-slate-900 md:text-3xl">Decision Logs Report</h1>
                  <p className="text-sm text-slate-600">Editorial decisions and review activity summary</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
                <p><span className="font-semibold">Generated:</span> {generatedAt}</p>
                <p><span className="font-semibold">Duration:</span> {durationLabels[range] || 'All time'}</p>
                <p><span className="font-semibold">Entries:</span> {filteredLogs.length}</p>
              </div>
            </div>
          </header>

          <section className="mt-6">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
                Preparing report…
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
            ) : filteredLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
                No decision logs are available for the selected duration.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Submission</th>
                      <th className="px-4 py-3 font-semibold">User</th>
                      <th className="px-4 py-3 font-semibold">Action</th>
                      <th className="px-4 py-3 font-semibold">Remarks</th>
                      <th className="px-4 py-3 font-semibold">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="align-top hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-medium text-slate-900">{log.submission_title || 'Untitled submission'}</td>
                        <td className="px-4 py-3">{log.user_name || 'System'}</td>
                        <td className="px-4 py-3">{log.action}</td>
                        <td className="px-4 py-3 text-slate-600">{log.remarks || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </article>
      </div>
    </main>
  );
}
