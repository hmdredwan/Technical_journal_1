'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import UserDashboardLayout from '@/components/user/UserDashboardLayout';
import { apiUrl } from '@/utils/api';
import { CheckCircle, RefreshCw, Receipt, ArrowLeft } from 'lucide-react';
import { Suspense } from 'react';

type TxStatus = {
  tran_id: string;
  status: string;
  amount_bdt: string;
  submission_id: number;
  submission_title: string;
};

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <UserDashboardLayout role="author">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl shadow border p-8">
              <div className="flex items-center gap-3 text-gray-600">
                <RefreshCw size={18} className="animate-spin" />
                Loading...
              </div>
            </div>
          </div>
        </UserDashboardLayout>
      }
    >
      <PaymentSuccessInner />
    </Suspense>
  );
}

function PaymentSuccessInner() {
  const token = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }, []);
  const searchParams = useSearchParams();
  const tranId = (searchParams.get('tran_id') || '').trim();

  const [tx, setTx] = useState<TxStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      setLoading(true);
      setError('');
      try {
        const res = await fetch(apiUrl(`author/payments/transaction-status/?tran_id=${encodeURIComponent(tranId)}`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.detail || `Request failed (${res.status})`);
        setTx(data);
      } catch (e: any) {
        setError(e?.message || 'Failed to verify payment status.');
        setTx(null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token, tranId]);

  return (
    <UserDashboardLayout role="author">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow border p-8">
          <div className="flex items-start gap-4">
            <CheckCircle className="text-green-600" size={42} />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Payment Successful</h1>
              <p className="text-gray-600 mt-2">
                Your payment has been received. You can keep this page as a reference.
              </p>
            </div>
          </div>

          <div className="mt-6 border-t pt-6">
            {loading ? (
              <div className="flex items-center gap-3 text-gray-600">
                <RefreshCw size={18} className="animate-spin" />
                Verifying transaction...
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl">{error}</div>
            ) : tx ? (
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Transaction ID:</strong> {tx.tran_id}</p>
                <p><strong>Status:</strong> {tx.status}</p>
                <p><strong>Amount:</strong> BDT {tx.amount_bdt}</p>
                <p><strong>Submission:</strong> #{tx.submission_id} — {tx.submission_title}</p>
              </div>
            ) : (
              <div className="text-gray-600">No transaction details available.</div>
            )}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/author-dashboard/payments"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
            >
              <Receipt size={16} />
              Go to Payments
            </Link>
            <Link
              href="/author-dashboard/my-submissions"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200 transition"
            >
              <ArrowLeft size={16} />
              Back to Submissions
            </Link>
          </div>
        </div>
      </div>
    </UserDashboardLayout>
  );
}

