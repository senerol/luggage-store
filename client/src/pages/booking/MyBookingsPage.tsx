import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Luggage } from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { EmptyState } from "@/components/common/EmptyState";
import { BookingListItem } from "@/components/booking/BookingListItem";
import { listMyBookings } from "@/api/bookings";
import { Booking } from "@/types";
import { extractErrorMessage } from "@/api/client";

const ACTIVE_STATUSES = ["PENDING_PAYMENT", "PAYMENT_FAILED", "CONFIRMED", "CHECKED_IN", "IN_STORAGE", "READY_FOR_PICKUP"];

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    listMyBookings()
      .then(setBookings)
      .catch((err) => setError(extractErrorMessage(err)));
  }

  useEffect(load, []);

  if (error) return <div className="mx-auto max-w-2xl px-4 py-12"><ErrorMessage message={error} onRetry={load} /></div>;
  if (!bookings) return <LoadingSpinner className="min-h-[60vh]" label="Loading your bookings…" />;

  const active = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status));
  const history = bookings.filter((b) => !ACTIVE_STATUSES.includes(b.status));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-ink-900">My bookings</h1>

      {bookings.length === 0 ? (
        <EmptyState
          icon={Luggage}
          title="No bookings yet"
          description="Once you book luggage storage, it'll show up here."
          action={
            <Link to="/search" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              Find storage
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Active</h2>
              <div className="space-y-3">
                {active.map((b) => (
                  <BookingListItem key={b.id} booking={b} />
                ))}
              </div>
            </div>
          )}
          {history.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">History</h2>
              <div className="space-y-3">
                {history.map((b) => (
                  <BookingListItem key={b.id} booking={b} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
