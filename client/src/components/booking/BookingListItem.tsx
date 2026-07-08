import { Link } from "react-router-dom";
import { MapPin, Calendar, QrCode } from "lucide-react";
import { Booking } from "@/types";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatCurrency, formatDateTime, luggageLabel } from "@/utils/format";

export function BookingListItem({ booking }: { booking: Booking }) {
  const showQr = booking.status === "CONFIRMED" || booking.status === "IN_STORAGE";

  return (
    <Link
      to={`/booking/${booking.id}`}
      className="block rounded-xl border border-ink-100 bg-white p-4 shadow-card transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-ink-400">{booking.bookingCode}</p>
          <p className="flex items-center gap-1 font-semibold text-ink-900">
            <MapPin className="h-3.5 w-3.5" /> {booking.storageLocation.name}
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </div>
      <p className="mt-2 flex items-center gap-1 text-sm text-ink-500">
        <Calendar className="h-3.5 w-3.5" />
        {formatDateTime(booking.dropoffAt)} → {formatDateTime(booking.pickupAt)}
      </p>
      <p className="mt-1 text-sm text-ink-500">
        {booking.items.map((i) => `${i.quantity} × ${luggageLabel(i.luggageType)}`).join(", ")}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-semibold text-ink-900">{formatCurrency(booking.totalAmount)}</span>
        {showQr && (
          <span className="flex items-center gap-1 text-xs font-semibold text-brand-700">
            <QrCode className="h-3.5 w-3.5" /> View QR
          </span>
        )}
      </div>
    </Link>
  );
}
