import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { CheckCircle2, XCircle } from "lucide-react";
import { Stepper } from "@/components/common/Stepper";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { LuggageCounts, LuggageSelector } from "@/components/booking/LuggageSelector";
import { PriceBreakdownCard } from "@/components/booking/PriceBreakdownCard";
import { checkStorageAvailability, getStorageById } from "@/api/storage";
import { createBooking } from "@/api/bookings";
import { AvailabilityResult, StorageLocationSummary } from "@/types";
import { previewPrice } from "@/utils/pricingPreview";
import { extractErrorMessage } from "@/api/client";

const STEPS = ["Luggage", "Time", "Availability", "Confirm"];

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function BookingFlowPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [location, setLocation] = useState<StorageLocationSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  const [counts, setCounts] = useState<LuggageCounts>({});
  const [dropoffAt, setDropoffAt] = useState(() => toDatetimeLocal(new Date(Date.now() + 60 * 60 * 1000)));
  const [pickupAt, setPickupAt] = useState(() => toDatetimeLocal(new Date(Date.now() + 5 * 60 * 60 * 1000)));

  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getStorageById(id)
      .then(setLocation)
      .catch((err) => setLoadError(extractErrorMessage(err)));
  }, [id]);

  const totalBags = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);

  const preview = useMemo(() => {
    if (!location) return null;
    try {
      return previewPrice(location.priceRules, counts, new Date(dropoffAt), new Date(pickupAt));
    } catch {
      return null;
    }
  }, [location, counts, dropoffAt, pickupAt]);

  if (loadError) return <div className="mx-auto max-w-lg px-4 py-12"><ErrorMessage message={loadError} /></div>;
  if (!location) return <LoadingSpinner className="min-h-[60vh]" label="Loading storage location…" />;

  async function handleCheckAvailability() {
    setFormError(null);
    if (new Date(pickupAt) <= new Date(dropoffAt)) {
      setFormError("Pickup time must be after drop-off time.");
      return;
    }
    setCheckingAvailability(true);
    try {
      // Sent alongside the UTC instant so the backend can recover the
      // wall-clock time actually shown in this browser (see
      // server/src/utils/operatingHours.ts) - without it, a server running
      // in a different timezone than the customer would check operating
      // hours against the wrong hour/day.
      const result = await checkStorageAvailability(
        location!.id,
        new Date(dropoffAt).toISOString(),
        new Date(pickupAt).toISOString(),
        totalBags,
        new Date(dropoffAt).getTimezoneOffset()
      );
      setAvailability(result);
      setStep(2);
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setCheckingAvailability(false);
    }
  }

  async function handleConfirm() {
    setSubmitting(true);
    setFormError(null);
    try {
      const items = (Object.entries(counts) as [string, number][])
        .filter(([, qty]) => qty > 0)
        .map(([luggageType, quantity]) => ({ luggageType: luggageType as any, quantity }));

      const booking = await createBooking({
        storageLocationId: location!.id,
        dropoffAt: new Date(dropoffAt).toISOString(),
        pickupAt: new Date(pickupAt).toISOString(),
        items,
        clientUtcOffsetMinutes: new Date(dropoffAt).getTimezoneOffset(),
      });
      toast.success("Booking created — complete payment to confirm.");
      navigate(`/payment/${booking.id}`);
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-ink-900">Book storage</h1>
      <p className="mb-6 text-ink-500">{location.name}</p>

      <Stepper steps={STEPS} current={step} />

      <div className="mt-8 space-y-6">
        {step === 0 && (
          <div>
            <h2 className="mb-3 font-semibold text-ink-900">Select your luggage</h2>
            <LuggageSelector priceRules={location.priceRules} counts={counts} onChange={setCounts} />
            {totalBags === 0 && <p className="mt-2 text-sm text-ink-400">Add at least one bag to continue.</p>}
            <button
              onClick={() => setStep(1)}
              disabled={totalBags === 0}
              className="mt-5 w-full rounded-lg bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="mb-3 font-semibold text-ink-900">Choose drop-off and pickup</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-ink-700">Drop-off</span>
                <input
                  type="datetime-local"
                  value={dropoffAt}
                  onChange={(e) => setDropoffAt(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink-700">Pickup</span>
                <input
                  type="datetime-local"
                  value={pickupAt}
                  onChange={(e) => setPickupAt(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
            {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
            <div className="mt-5 flex gap-3">
              <button onClick={() => setStep(0)} className="flex-1 rounded-lg border border-ink-200 py-3 font-semibold text-ink-700 hover:bg-ink-50">
                Back
              </button>
              <button
                onClick={handleCheckAvailability}
                disabled={checkingAvailability}
                className="flex-1 rounded-lg bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {checkingAvailability ? "Checking…" : "Check availability"}
              </button>
            </div>
          </div>
        )}

        {step === 2 && availability && (
          <div>
            <h2 className="mb-3 font-semibold text-ink-900">Availability</h2>
            <div
              className={`flex items-start gap-3 rounded-xl border p-4 ${
                availability.canBook ? "border-brand-200 bg-brand-50" : "border-red-200 bg-red-50"
              }`}
            >
              {availability.canBook ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              )}
              <div className="text-sm">
                <p className={availability.canBook ? "font-medium text-brand-800" : "font-medium text-red-700"}>
                  {availability.canBook
                    ? "This location can hold your bags for the selected time."
                    : !availability.withinOperatingHours
                    ? "Your selected time is outside this location's operating hours."
                    : "Not enough capacity for this time window."}
                </p>
                <p className="mt-1 text-ink-500">
                  {availability.availableCapacity} of {availability.capacityTotal} bags free · you need {availability.requestedBags}
                </p>
              </div>
            </div>

            {preview && (
              <div className="mt-5">
                <PriceBreakdownCard
                  hours={preview.hours}
                  items={preview.items}
                  baseAmount={preview.baseAmount}
                  serviceFee={preview.serviceFee}
                  totalAmount={preview.totalAmount}
                  estimate
                />
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 rounded-lg border border-ink-200 py-3 font-semibold text-ink-700 hover:bg-ink-50">
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!availability.canBook}
                className="flex-1 rounded-lg bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && preview && (
          <div>
            <h2 className="mb-3 font-semibold text-ink-900">Confirm your booking</h2>
            <PriceBreakdownCard
              hours={preview.hours}
              items={preview.items}
              baseAmount={preview.baseAmount}
              serviceFee={preview.serviceFee}
              totalAmount={preview.totalAmount}
              estimate
            />
            <p className="mt-3 text-xs text-ink-400">
              The final amount is calculated and confirmed by our servers when your booking is created — this is a
              preview.
            </p>
            {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
            <div className="mt-5 flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 rounded-lg border border-ink-200 py-3 font-semibold text-ink-700 hover:bg-ink-50">
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 rounded-lg bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {submitting ? "Creating booking…" : "Confirm & pay"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
