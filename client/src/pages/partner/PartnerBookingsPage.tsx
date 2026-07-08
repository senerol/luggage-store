import { useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getPartnerBookings } from "@/api/partner";
import { Booking } from "@/types";
import { extractErrorMessage } from "@/api/client";
import { formatCurrency, formatDateTime, luggageLabel } from "@/utils/format";

export default function PartnerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [todayOnly, setTodayOnly] = useState(false);

  function load() {
    setBookings(null);
    getPartnerBookings(todayOnly ? { today: true } : undefined)
      .then(setBookings)
      .catch((err) => setError(extractErrorMessage(err)));
  }

  useEffect(load, [todayOnly]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink-900">Bookings</h1>
        <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
          <input type="checkbox" checked={todayOnly} onChange={(e) => setTodayOnly(e.target.checked)} className="h-4 w-4 rounded accent-brand-600" />
          Today only
        </label>
      </div>

      {error && <ErrorMessage message={error} onRetry={load} />}
      {!bookings && !error && <LoadingSpinner label="Loading bookings…" />}
      {bookings && bookings.length === 0 && <EmptyState icon={CalendarCheck} title="No bookings found" />}

      {bookings && bookings.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white shadow-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Window</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-medium text-ink-800">{b.bookingCode}</td>
                  <td className="px-4 py-3 text-ink-600">{b.customer?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-600">{b.items.map((i) => `${i.quantity}× ${luggageLabel(i.luggageType)}`).join(", ")}</td>
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
      )}
    </div>
  );
}
