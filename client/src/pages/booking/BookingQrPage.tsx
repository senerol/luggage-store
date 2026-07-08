import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { getBookingQr, BookingQr } from "@/api/qr";
import { extractErrorMessage } from "@/api/client";

export default function BookingQrPage() {
  const { id } = useParams<{ id: string }>();
  const [qr, setQr] = useState<BookingQr | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getBookingQr(id)
      .then(setQr)
      .catch((err) => setError(extractErrorMessage(err)));
  }, [id]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 py-10 text-center">
      <Link to={`/booking/${id}`} className="mb-6 flex items-center gap-1 self-start text-sm text-ink-500 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to booking
      </Link>

      {error && <ErrorMessage message={error} />}
      {!qr && !error && <LoadingSpinner label="Generating your QR code…" />}
      {qr && (
        <>
          <span className="mb-4 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
            {qr.stage === "check-in" ? "Show at drop-off" : "Show at pickup"}
          </span>
          <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
            <img src={qr.qrImage} alt="Booking QR code" className="h-64 w-64" />
          </div>
          <p className="mt-4 font-semibold text-ink-900">Booking {qr.bookingCode}</p>
          <p className="mt-1 max-w-xs text-sm text-ink-500">
            {qr.stage === "check-in"
              ? "Show this to staff when dropping off your bags. It does not contain any personal information."
              : "Show this to staff when collecting your bags."}
          </p>
        </>
      )}
    </div>
  );
}
