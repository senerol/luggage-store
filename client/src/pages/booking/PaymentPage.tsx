import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ShieldCheck } from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { PriceBreakdownCard } from "@/components/booking/PriceBreakdownCard";
import { getBookingById } from "@/api/bookings";
import { createPaymentOrder, verifyPayment } from "@/api/payments";
import { Booking } from "@/types";
import { extractErrorMessage } from "@/api/client";
import { loadRazorpayScript } from "@/utils/loadRazorpay";
import { billableHoursPreview } from "@/utils/pricingPreview";
import { useAuth } from "@/context/AuthContext";

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!id) return;
    getBookingById(id)
      .then(setBooking)
      .catch((err) => setError(extractErrorMessage(err)));
  }, [id]);

  if (error) return <div className="mx-auto max-w-lg px-4 py-12"><ErrorMessage message={error} /></div>;
  if (!booking) return <LoadingSpinner className="min-h-[60vh]" label="Loading booking…" />;

  if (booking.status === "CONFIRMED" || booking.status === "CHECKED_IN" || booking.status === "IN_STORAGE") {
    navigate(`/booking/${booking.id}`, { replace: true });
    return null;
  }

  async function handlePay() {
    setPaying(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        toast.error("Couldn't load the payment widget. Check your connection and try again.");
        setPaying(false);
        return;
      }

      const order = await createPaymentOrder(booking!.id);

      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Luggo",
        description: `Booking ${order.bookingCode}`,
        order_id: order.razorpayOrderId,
        prefill: { name: user?.name, email: user?.email },
        theme: { color: "#0d9488" },
        modal: {
          ondismiss: () => {
            setPaying(false);
            toast("Payment cancelled — you can try again anytime.", { icon: "ℹ️" });
          },
        },
        handler: async (response) => {
          try {
            const confirmed = await verifyPayment({
              bookingId: booking!.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success("Payment confirmed! Your booking is ready.");
            navigate(`/booking/${confirmed.id}`);
          } catch (err) {
            toast.error(extractErrorMessage(err));
            setPaying(false);
          }
        },
      });
      razorpay.open();
    } catch (err) {
      toast.error(extractErrorMessage(err));
      setPaying(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold text-ink-900">Complete payment</h1>
      <p className="mb-6 text-ink-500">Booking {booking.bookingCode} at {booking.storageLocation.name}</p>

      <PriceBreakdownCard
        hours={billableHoursPreview(new Date(booking.dropoffAt), new Date(booking.pickupAt))}
        items={booking.items.map((i) => ({ luggageType: i.luggageType, quantity: i.quantity, subtotal: i.subtotal }))}
        baseAmount={booking.baseAmount}
        serviceFee={booking.serviceFee}
        totalAmount={booking.totalAmount}
      />

      {booking.status === "PAYMENT_FAILED" && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Your last payment attempt failed. You can try again below.
        </p>
      )}

      <button
        onClick={handlePay}
        disabled={paying}
        className="mt-6 w-full rounded-lg bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {paying ? "Opening payment…" : `Pay ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(booking.totalAmount)}`}
      </button>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink-400">
        <ShieldCheck className="h-3.5 w-3.5" /> Payments are processed securely by Razorpay. Luggo never sees your card details.
      </p>
    </div>
  );
}
