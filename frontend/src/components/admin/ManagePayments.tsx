'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiUrl } from '@/utils/api';
import { CreditCard, FileText, Save, Search, RefreshCw } from 'lucide-react';

type Tx = {
  id: number;
  submission: number;
  submission_title: string;
  payer_email: string | null;
  amount_bdt: string;
  status: string;
  tran_id: string;
  val_id: string;
  created_at: string;
};

type SubmissionRow = {
  id: number;
  title: string;
  submitted_by?: { email?: string; full_name?: string };
  processing_fee?: { amount_bdt: string; is_enabled: boolean; note: string } | null;
  has_success_payment?: boolean;
};

export default function ManagePayments() {
  const token = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }, []);

  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [reviewAssignments, setReviewAssignments] = useState<any[]>([]);
  const [financialTab, setFinancialTab] = useState<'author' | 'reviewer'>('author');
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [q, setQ] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [amount, setAmount] = useState<string>('0');
  const [enabled, setEnabled] = useState<boolean>(false);
  const [note, setNote] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [payingReviewerId, setPayingReviewerId] = useState<number | null>(null);
  const [reviewerAmounts, setReviewerAmounts] = useState<Record<number, string>>({});

  const fetchAll = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [subsRes, txRes, assignmentsRes, payoutsRes] = await Promise.all([
        fetch(apiUrl('submissions/'), { headers }),
        fetch(apiUrl('admin/payments/transactions/'), { headers }),
        fetch(apiUrl('review-assignments/'), { headers }),
        fetch(apiUrl('admin/reviewer-payouts/'), { headers }),
      ]);

      const subsData = await subsRes.json().catch(() => null);
      const txData = await txRes.json().catch(() => null);
      const assignmentsData = await assignmentsRes.json().catch(() => null);
      const payoutsData = await payoutsRes.json().catch(() => null);

      if (!subsRes.ok) throw new Error(subsData?.detail || `Submissions load failed (${subsRes.status})`);
      if (!txRes.ok) throw new Error(txData?.detail || `Transactions load failed (${txRes.status})`);
      if (!assignmentsRes.ok) throw new Error(assignmentsData?.detail || `Assignments load failed (${assignmentsRes.status})`);
      if (!payoutsRes.ok) throw new Error(payoutsData?.detail || `Payout history load failed (${payoutsRes.status})`);

      setSubmissions(Array.isArray(subsData) ? subsData : subsData?.results || []);
      setTransactions(Array.isArray(txData) ? txData : txData?.results || []);
      setReviewAssignments(Array.isArray(assignmentsData) ? assignmentsData : assignmentsData?.results || []);
      setPayouts(Array.isArray(payoutsData) ? payoutsData : payoutsData?.results || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load payments data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const startEdit = (s: SubmissionRow) => {
    setEditingId(s.id);
    setAmount(String(s.processing_fee?.amount_bdt ?? '0'));
    setEnabled(Boolean(s.processing_fee?.is_enabled));
    setNote(String(s.processing_fee?.note ?? ''));
    setSuccess('');
    setError('');
  };

  const payReviewer = async (assignmentId: number) => {
    if (!token) return;
    const amount = Number(reviewerAmounts[assignmentId] || 0);
    if (!amount || amount <= 0) {
      setError('Enter a valid payment amount before generating a reviewer payout.');
      return;
    }
    setPayingReviewerId(assignmentId);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(apiUrl('admin/reviewer-payouts/'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignment_id: assignmentId, amount_bdt: amount, payment_method: 'bank_transfer', notes: 'Reviewer payment generated from Financials tab.' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || data?.message || `Payout failed (${res.status})`);
      setSuccess(`Reviewer payout generated successfully. Invoice ${data.invoice?.invoice_number || 'created'}.`);
      await fetchAll();
    } catch (e: any) {
      setError(e?.message || 'Failed to generate reviewer payout');
    } finally {
      setPayingReviewerId(null);
    }
  };

  const saveFee = async () => {
    if (!token || !editingId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(apiUrl(`admin/submissions/${editingId}/fee/`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount_bdt: Number(amount) || 0,
          is_enabled: enabled,
          note,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || `Save failed (${res.status})`);
      setSuccess('Fee updated successfully.');
      await fetchAll();
      setEditingId(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to update fee');
    } finally {
      setSaving(false);
    }
  };

  const filteredSubs = submissions.filter((s) => {
    const qq = q.trim().toLowerCase();
    if (!qq) return true;
    return (
      String(s.id).includes(qq) ||
      (s.title || '').toLowerCase().includes(qq) ||
      (s.submitted_by?.email || '').toLowerCase().includes(qq) ||
      (s.submitted_by?.full_name || '').toLowerCase().includes(qq)
    );
  });

  return (
    <div className="w-full min-w-0 space-y-6 px-1 sm:px-2 lg:px-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-3">
            <CreditCard size={24} className="text-blue-600" />
            Financial Management
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage author payment settings, SSLCommerz transactions, and reviewer payout generation in separate tabs.
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-white hover:bg-gray-50 transition disabled:opacity-50 self-start"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error ? <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl">{error}</div> : null}
      {success ? <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl">{success}</div> : null}

      <div className="w-full bg-white rounded-2xl shadow border p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'author', label: 'Author' },
            { id: 'reviewer', label: 'Reviewer Payout' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFinancialTab(tab.id as 'author' | 'reviewer')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                financialTab === tab.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {financialTab === 'author' ? (
        <>
          <div className="w-full bg-white rounded-2xl shadow border p-4 sm:p-6">
            <div className="flex items-center gap-3 w-full">
              <Search size={18} className="text-gray-500 flex-shrink-0" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search submissions by ID, title, author..."
                className="flex-1 px-4 py-3 border rounded-xl text-sm sm:text-base"
              />
            </div>
          </div>

          <div className="grid w-full grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="w-full bg-white rounded-2xl shadow border p-4 sm:p-6">
              <h4 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText size={18} />
                Submission Fees
              </h4>

              {loading ? (
                <div className="text-gray-600 py-8 text-center">Loading...</div>
              ) : (
                <div className="space-y-3 max-h-[60vh] sm:max-h-[70vh] overflow-auto">
                  {filteredSubs.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => startEdit(s)}
                      className="w-full text-left border rounded-xl p-3 sm:p-4 hover:bg-gray-50 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 line-clamp-1 text-sm sm:text-base">
                            #{s.id} {s.title}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Fee: {s.processing_fee?.is_enabled ? `BDT ${s.processing_fee.amount_bdt}` : 'Not enabled'} • Paid:{' '}
                            {s.has_success_payment ? 'Yes' : 'No'}
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 flex-shrink-0">
                          Edit
                        </span>
                      </div>
                    </button>
                  ))}
                  {filteredSubs.length === 0 ? (
                    <div className="text-gray-600 py-8 text-center">No submissions match your search.</div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="w-full bg-white rounded-2xl shadow border p-4 sm:p-6">
              <h4 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
                <Save size={18} />
                Set Fee
              </h4>

              {!editingId ? (
                <div className="text-gray-600 py-8 text-center">Select a submission on the left to set a fee.</div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Amount (BDT)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-4 py-3 border rounded-xl text-sm sm:text-base"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      id="feeEnabled"
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="feeEnabled" className="text-sm font-medium text-gray-700">
                      Enable fee for this submission
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Note (optional)</label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border rounded-xl text-sm sm:text-base resize-none"
                    />
                  </div>
                  <button
                    onClick={saveFee}
                    disabled={saving}
                    className="w-full px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50 text-sm sm:text-base"
                  >
                    {saving ? 'Saving...' : 'Save Fee'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="w-full bg-white rounded-2xl shadow border p-4 sm:p-6 overflow-x-hidden">
            <h4 className="text-lg sm:text-xl font-semibold mb-4">Transactions</h4>
            {loading ? (
              <div className="text-gray-600 py-8 text-center">Loading...</div>
            ) : transactions.length === 0 ? (
              <div className="text-gray-600 py-8 text-center">No transactions yet.</div>
            ) : (
              <>
                <div className="hidden md:block w-full overflow-x-auto">
                  <table className="min-w-full w-full table-fixed border-collapse text-sm">
                    <thead className="text-left text-gray-600 align-top">
                      <tr>
                        <th className="w-[14%] py-2 pr-4 align-top">Date</th>
                        <th className="w-[24%] py-2 pr-4 align-top">Submission</th>
                        <th className="w-[18%] py-2 pr-4 align-top">Payer</th>
                        <th className="w-[10%] py-2 pr-4 align-top">Amount</th>
                        <th className="w-[10%] py-2 pr-4 align-top">Status</th>
                        <th className="w-[12%] py-2 pr-4 align-top">Tran ID</th>
                        <th className="w-[12%] py-2 pr-4 align-top">Val ID</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-800 align-top">
                      {transactions.map((t) => (
                        <tr key={t.id} className="border-t align-top">
                          <td className="py-2 pr-4 align-top whitespace-normal break-words">{new Date(t.created_at).toLocaleString()}</td>
                          <td className="py-2 pr-4 align-top break-words whitespace-normal">{t.submission_title}</td>
                          <td className="py-2 pr-4 align-top break-words whitespace-normal">{t.payer_email || '-'}</td>
                          <td className="py-2 pr-4 align-top whitespace-normal break-words min-w-0">BDT {t.amount_bdt}</td>
                          <td className="py-2 pr-4 align-top whitespace-normal break-words min-w-0">{t.status}</td>
                          <td className="py-2 pr-4 align-top font-mono text-xs break-all">{t.tran_id}</td>
                          <td className="py-2 pr-4 align-top font-mono text-xs break-all">{t.val_id || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden w-full space-y-4">
                  {transactions.map((t) => (
                    <div key={t.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="font-medium text-gray-900 line-clamp-2 flex-1">{t.submission_title}</div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            t.status.toLowerCase() === 'success' ? 'bg-green-100 text-green-800' :
                            t.status.toLowerCase() === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {t.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Amount:</span>
                            <div className="font-medium">BDT {t.amount_bdt}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Payer:</span>
                            <div className="font-medium truncate">{t.payer_email || '-'}</div>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-500">Date:</span>
                            <div className="font-medium">{new Date(t.created_at).toLocaleString()}</div>
                          </div>
                        </div>

                        <div className="border-t pt-3 space-y-2">
                          <div>
                            <span className="text-gray-500 text-xs">Transaction ID:</span>
                            <div className="font-mono text-xs bg-white px-2 py-1 rounded border break-all">{t.tran_id}</div>
                          </div>
                          {t.val_id && (
                            <div>
                              <span className="text-gray-500 text-xs">Validation ID:</span>
                              <div className="font-mono text-xs bg-white px-2 py-1 rounded border break-all">{t.val_id}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="w-full bg-white rounded-2xl shadow border p-4 sm:p-6 overflow-x-hidden">
          <h4 className="text-lg sm:text-xl font-semibold mb-4">Reviewer Payouts</h4>
          <p className="text-sm text-gray-600 mb-4">Generate a professional payout record for any assigned review paper. The invoice includes the manuscript details and reviewer payment information.</p>
          <div className="grid gap-4 xl:grid-cols-2">
            {reviewAssignments.length === 0 ? (
              <div className="text-gray-600 py-4 text-sm">No review assignments available for payout generation.</div>
            ) : reviewAssignments.map((ra: any) => (
              <div key={ra.id} className="border rounded-2xl p-4 bg-gray-50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-blue-700">Paper review</p>
                    <h5 className="text-base font-semibold text-gray-900 mt-1">{ra.submission_title || 'Untitled manuscript'}</h5>
                    <p className="text-sm text-gray-600 mt-1">Reviewer: {ra.assigned_to_name || ra.assigned_to_email || 'Reviewer'}</p>
                    <p className="text-xs text-gray-500 mt-1">Assignment ID: {ra.id} • Due: {ra.due_date ? new Date(ra.due_date).toLocaleDateString() : 'Not set'}</p>
                  </div>
                  <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">{ra.status_display || ra.status}</span>
                </div>
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={reviewerAmounts[ra.id] ?? ''}
                    onChange={(e) => setReviewerAmounts((prev) => ({ ...prev, [ra.id]: e.target.value }))}
                    placeholder="Amount (BDT)"
                    className="w-full sm:w-40 px-3 py-2 border rounded-xl text-sm"
                  />
                  <button
                    onClick={() => payReviewer(ra.id)}
                    disabled={payingReviewerId === ra.id}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {payingReviewerId === ra.id ? 'Generating...' : 'Generate payout & invoice'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 border-t pt-4">
            <h5 className="text-sm font-semibold text-gray-900 mb-3">Recent reviewer payouts</h5>
            {payouts.length === 0 ? (
              <p className="text-sm text-gray-600">No reviewer payouts have been generated yet.</p>
            ) : (
              <div className="space-y-3">
                {payouts.slice(0, 6).map((p: any) => (
                  <div key={p.id} className="border rounded-xl p-3 bg-gray-50 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{p.submission_title || 'Manuscript review'}</p>
                        <p className="text-gray-600">Reviewer: {p.reviewer_name || p.reviewer_email} • Invoice: {p.invoice_number}</p>
                      </div>
                      <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">BDT {p.amount_bdt}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Status: {p.status} • Method: {p.payment_method} • Generated by: {p.generated_by_name || 'Admin'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

