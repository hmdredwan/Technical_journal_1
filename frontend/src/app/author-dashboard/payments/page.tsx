'use client';

import { useEffect, useMemo, useState } from 'react';
import UserDashboardLayout from '@/components/user/UserDashboardLayout';
import { apiUrl } from '@/utils/api';
import { CreditCard, FileText, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';

type PaymentOverviewItem = {
  submission_id: number;
  title: string;
  created_at: string;
  fee: null | {
    amount_bdt: string;
    is_enabled: boolean;
    note: string;
    set_at: string;
  };
  payment: null | {
    tran_id: string;
    status: string;
    amount_bdt: string;
    created_at: string;
  };
  has_success_payment: boolean;
};

export default function AuthorPaymentsPage() {
  const token = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }, []);

  const [items, setItems] = useState<PaymentOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchOverview = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('author/payments/overview/'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.detail || data?.message || data?.error || `Request failed (${res.status})`);
      }
      setItems(Array.isArray(data) ? data : data?.results || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load payments overview');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const initiatePayment = async (submissionId: number) => {
    if (!token) return;
    setActionLoadingId(submissionId);
    setError('');
    try {
      const res = await fetch(apiUrl(`author/submissions/${submissionId}/pay/`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.detail || data?.message || data?.error || `Payment init failed (${res.status})`);
      }
      const url = data?.gateway_page_url as string;
      if (!url) throw new Error('Gateway URL missing from server response');
      window.location.href = url;
    } catch (e: any) {
      setError(e?.message || 'Failed to initiate payment');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <UserDashboardLayout role="author">
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <CreditCard className="text-blue-600" />
              Payments
            </h2>
            <p className="text-gray-600 mt-2">
              Pay transcript/manuscript processing fees (if enabled) using SSLCommerz.
            </p>
          </div>
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-white hover:bg-gray-50 transition disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl">{error}</div>
        ) : null}

        {/* <div className="bg-white rounded-2xl shadow border p-5 md:p-6">
          <div className="mb-4">
            <h3 className="text-lg md:text-xl font-bold text-gray-900">Supported Payment Methods</h3>
            <p className="text-sm text-gray-600 mt-1">
              SSLCommerz supports cards, mobile banking, and other local payment channels.
            </p>
          </div>
          <div className="relative w-full overflow-hidden rounded-xl border border-gray-100">
            <img
              src="/images/payments/Payment gateway.png"
              alt="SSLCommerz supported payment methods: Visa, Mastercard, bKash, Nagad, Rocket and more"
              className="w-full mx-auto h-auto block"
              loading="eager"
            />
          </div>
        </div> */}

        {loading ? (
          <div className="flex items-center gap-3 text-gray-600">
            <RefreshCw size={18} className="animate-spin" />
            Loading payment info...
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl shadow border p-10 text-center text-gray-600">
            No submissions found.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {items.map((it) => {
              const feeEnabled = Boolean(it.fee?.is_enabled) && Number(it.fee?.amount_bdt || 0) > 0;
              const paid = it.has_success_payment;
              return (
                <div key={it.submission_id} className="bg-white rounded-2xl shadow border p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 line-clamp-2">{it.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">Submission ID: {it.submission_id}</p>
                    </div>
                    {paid ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        <ShieldCheck size={14} />
                        Paid
                      </span>
                    ) : feeEnabled ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900">
                        <FileText size={14} />
                        Fee due
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                        <XCircle size={14} />
                        No fee
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-gray-700">
                    <p>
                      <strong>Fee:</strong>{' '}
                      {feeEnabled ? `BDT ${it.fee?.amount_bdt}` : 'Not enabled'}
                    </p>
                    {it.fee?.note ? (
                      <p className="text-gray-600">
                        <strong>Note:</strong> {it.fee.note}
                      </p>
                    ) : null}
                    {it.payment ? (
                      <p className="text-gray-600">
                        <strong>Last transaction:</strong> {it.payment.tran_id} ({it.payment.status})
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-5 flex gap-3 flex-wrap">
                    <button
                      onClick={() => initiatePayment(it.submission_id)}
                      disabled={!feeEnabled || paid || actionLoadingId === it.submission_id}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      <CreditCard size={16} />
                      {actionLoadingId === it.submission_id ? 'Redirecting...' : paid ? 'Paid' : 'Pay Now'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
                   <div className="bg-white rounded-2xl shadow border p-5 md:p-6">
          <div className="mb-4">
            <h3 className="text-lg md:text-xl font-bold text-gray-900">Supported Payment Methods</h3>
            <p className="text-sm text-gray-600 mt-1">
              SSLCommerz supports cards, mobile banking, and other local payment channels.
            </p>
          </div>
          <div className="relative w-full overflow-hidden rounded-xl border border-gray-100">
            <img
              src="/images/payments/Payment gateway.png"
              alt="SSLCommerz supported payment methods: Visa, Mastercard, bKash, Nagad, Rocket and more"
              className="w-full mx-auto h-auto block"
              loading="eager"
            />
          </div>
        </div>  
      </div>
    </UserDashboardLayout>
  );
}

