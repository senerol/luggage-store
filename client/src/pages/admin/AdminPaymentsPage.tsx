import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { listPayments, AdminPayment } from "@/api/admin";
import { extractErrorMessage } from "@/api/client";
import { formatCurrency, formatDateTime } from "@/utils/format";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPayment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    listPayments().then(setPayments).catch((err) => setError(extractErrorMessage(err)));
  }
  useEffect(load, []);

  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!payments) return <LoadingSpinner label="Loading payments…" />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink-900">Payments ({payments.length})</h1>
      <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Razorpay order</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-medium text-ink-800">{p.booking.bookingCode}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-500">{p.razorpayOrderId}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-ink-500">{formatDateTime(p.createdAt)}</td>
                <td className="px-4 py-3 text-right font-medium text-ink-800">{formatCurrency(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
