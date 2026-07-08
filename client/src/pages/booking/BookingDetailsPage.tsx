import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { MapPin, QrCode, Calendar, Package } from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PriceBreakdownCard } from "@/components/booking/PriceBreakdownCard";
import { ReviewForm } from "@/components/booking/ReviewForm";
import { cancelBooking, getBookingById } from "@/api/bookings";
import { Booking } from "@/types";
import { extractErrorMessage } from "@/api/client";
import { billableHoursPreview } from "@/utils/pricingPreview";
import { formatDateTime, luggageLabel } from "@/utils/format";

const CANCELLABLE = ["PENDING_PAYMENT", "CONFIRMED"];
const QR_STAGES = ["CONFIRMED", "IN_STORAGE"];

export default function BookingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  function load() {
    if (!id) return;
    getBookingById(id)
      .then(setBooking)
      .catch((err) => setError(extractErrorMessage(err)));
  }

  useEffect(load, [id]);

  if (error) return <div className="mx-auto max-w-lg px-4 py-12"><ErrorMessage message={error} onRetry={load} /></div>;
  if (!booking) return <LoadingSpinner className="min-h-[60vh]" label="Loading booking…" />;

  if (booking.status === "PENDING_PAYMENT" || booking.status === "PAYMENT_FAILED") {
    navigate(`/payment/${booking.id}`, { replace: true });
    return null;
  }

  async function handleCancel() {
    if (!confirm("Cancel this booking? This cannot be undone.")) return;
    setCancelling(true);
    try {
      await cancelBooking(booking!.id);
      toast.success("Booking cancelled.");
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-400">Booking {booking.bookingCode}</p>
          <h1 className="text-2xl font-bold text-ink-900">{booking.storageLocation.name}</h1>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="space-y-5">
        <div className="rounded-xl border border-ink-100 p-4">
          <div className="flex items-start gap-2 text-sm text-ink-600">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            {booking.storageLocation.address ?? booking.storageLocation.city}
          </div>
          <div className="mt-2 flex items-start gap-2 text-sm text-ink-600">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0" />
            {formatDateTime(booking.dropoffAt)} → {formatDateTime(booking.pickupAt)}
          </div>
          <div className="mt-2 flex items-start gap-2 text-sm text-ink-600">
            <Package className="mt-0.5 h-4 w-4 shrink-0" />
            {booking.items.map((i) => `${i.quantity} × ${luggageLabel(i.luggageType)}`).join(", ")}
          </div>
        </div>

        {QR_STAGES.includes(booking.status) && (
          <Link
            to={`/booking/${booking.id}/qr`}
            className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700"
          >
            <QrCode className="h-4 w-4" /> View QR code
          </Link>
        )}

        <PriceBreakdownCard
          hours={billableHoursPreview(new Date(booking.dropoffAt), new Date(booking.pickupAt))}
          items={booking.items.map((i) => ({ luggageType: i.luggageType, quantity: i.quantity, subtotal: i.subtotal }))}
          baseAmount={booking.baseAmount}
          serviceFee={booking.serviceFee}
          totalAmount={booking.totalAmount}
        />

        {booking.status === "COLLECTED" && (
          <ReviewForm storageLocationId={booking.storageLocationId} bookingId={booking.id} />
        )}

        {CANCELLABLE.includes(booking.status) && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full rounded-lg border border-red-200 py-3 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {cancelling ? "Cancelling…" : "Cancel booking"}
          </button>
        )}

        {booking.cancelReason && (
          <p className="rounded-lg bg-ink-100 px-4 py-3 text-sm text-ink-600">Cancellation reason: {booking.cancelReason}</p>
        )}
      </div>
    </div>
  );
}
