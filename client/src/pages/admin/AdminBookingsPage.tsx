import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { listBookings, AdminBooking } from "@/api/admin";
import { extractErrorMessage } from "@/api/client";
import { formatCurrency, formatDateTime } from "@/utils/format";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<AdminBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    listBookings().then(setBookings).catch((err) => setError(extractErrorMessage(err)));
  }
  useEffect(load, []);

  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!bookings) return <LoadingSpinner label="Loading bookings…" />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink-900">All bookings ({bookings.length})</h1>
      <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white shadow-card">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Window</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {bookings.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3 font-medium text-ink-800">{b.bookingCode}</td>
                <td className="px-4 py-3 text-ink-600">{b.customer.name}</td>
                <td className="px-4 py-3 text-ink-600">{b.storageLocation.name}</td>
                <td className="px-4 py-3 text-ink-600">
                  {formatDateTime(b.dropoffAt)} → {formatDateTime(b.pickupAt)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={b.status} />
                </td>
                <td className="px-4 py-3 text-right font-medium text-ink-800">{formatCurrency(b.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
