import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Stepper } from "@/components/common/Stepper";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { OperatingHoursEditor } from "@/components/partner/OperatingHoursEditor";
import { PriceRulesEditor } from "@/components/partner/PriceRulesEditor";
import { PhotoUrlsEditor } from "@/components/partner/PhotoUrlsEditor";
import { listMyApplications, submitApplication, SubmitApplicationInput } from "@/api/partner";
import { BusinessType, OperatingHour, PriceRule } from "@/types";
import { extractErrorMessage } from "@/api/client";
import { logEvent } from "@/api/analytics";

const STEPS = ["Business", "Location", "Details", "Hours & pricing", "Review"];

const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: "HOTEL", label: "Hotel" },
  { value: "HOSTEL", label: "Hostel" },
  { value: "CAFE", label: "Cafe" },
  { value: "SHOP", label: "Shop" },
  { value: "LUGGAGE_STORE", label: "Luggage store" },
  { value: "OTHER", label: "Other" },
];

const DEFAULT_HOURS: OperatingHour[] = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  openTime: "09:00",
  closeTime: "21:00",
}));

type FormState = {
  businessName: string;
  businessType: BusinessType;
  description: string;
  locationName: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  landmark: string;
  locationDescription: string;
  safetyInfo: string;
  capacityTotal: number;
  photos: string[];
  operatingHours: OperatingHour[];
  priceRules: PriceRule[];
  agreedToTerms: boolean;
};

export default function PartnerApplyPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [form, setForm] = useState<FormState>({
    businessName: "",
    businessType: "SHOP",
    description: "",
    locationName: "",
    address: "",
    city: "New Delhi",
    latitude: 28.6139,
    longitude: 77.209,
    landmark: "",
    locationDescription: "",
    safetyInfo: "",
    capacityTotal: 15,
    photos: [""],
    operatingHours: DEFAULT_HOURS,
    priceRules: [],
    agreedToTerms: false,
  });

  useEffect(() => {
    logEvent("APPLICATION_STARTED");
    listMyApplications()
      .then((apps) => {
        const changesRequested = apps.find((a) => a.status === "CHANGES_REQUESTED");
        if (changesRequested) {
          setResubmitting(true);
          setForm({
            businessName: changesRequested.businessName,
            businessType: changesRequested.businessType,
            description: changesRequested.description,
            locationName: changesRequested.storageLocation.name,
            address: changesRequested.storageLocation.address,
            city: changesRequested.storageLocation.city,
            latitude: changesRequested.storageLocation.latitude,
            longitude: changesRequested.storageLocation.longitude,
            landmark: changesRequested.storageLocation.landmark ?? "",
            locationDescription: changesRequested.storageLocation.description,
            safetyInfo: changesRequested.storageLocation.safetyInfo ?? "",
            capacityTotal: changesRequested.storageLocation.capacityTotal,
            photos: changesRequested.storageLocation.photos.length ? changesRequested.storageLocation.photos : [""],
            operatingHours: changesRequested.storageLocation.operatingHours,
            priceRules: changesRequested.storageLocation.priceRules,
            agreedToTerms: false,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.agreedToTerms) {
      toast.error("You must agree to the partner terms to submit.");
      return;
    }
    if (form.priceRules.length === 0) {
      toast.error("Add at least one price rule.");
      return;
    }
    const photos = form.photos.filter((p) => p.trim());
    if (photos.length === 0) {
      toast.error("Add at least one photo of your storage area.");
      return;
    }

    const payload: SubmitApplicationInput = {
      businessName: form.businessName,
      businessType: form.businessType,
      description: form.description,
      storageLocation: {
        name: form.locationName,
        address: form.address,
        city: form.city,
        latitude: form.latitude,
        longitude: form.longitude,
        landmark: form.landmark || undefined,
        description: form.locationDescription,
        safetyInfo: form.safetyInfo,
        capacityTotal: form.capacityTotal,
        photos,
        operatingHours: form.operatingHours,
        priceRules: form.priceRules,
      },
      agreedToTerms: true,
    };

    setSubmitting(true);
    try {
      await submitApplication(payload);
      toast.success("Application submitted! We'll review it shortly.");
      navigate("/partner/applications");
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSpinner className="min-h-[60vh]" />;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-ink-900">{resubmitting ? "Update your application" : "Become a storage partner"}</h1>
      <p className="mb-6 text-ink-500">
        {resubmitting ? "Make the requested changes and resubmit for review." : "Tell us about your business and storage space."}
      </p>

      <Stepper steps={STEPS} current={step} />

      <div className="mt-8 space-y-5">
        {step === 0 && (
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-ink-700">Business name</span>
              <input value={form.businessName} onChange={(e) => update("businessName", e.target.value)} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink-700">Business type</span>
              <select value={form.businessType} onChange={(e) => update("businessType", e.target.value as BusinessType)} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm">
                {BUSINESS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink-700">Tell us about your business</span>
              <textarea rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" />
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-ink-700">Location name</span>
              <input value={form.locationName} onChange={(e) => update("locationName", e.target.value)} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink-700">Full address</span>
              <input value={form.address} onChange={(e) => update("address", e.target.value)} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-ink-700">City</span>
                <input value={form.city} onChange={(e) => update("city", e.target.value)} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink-700">Nearby landmark (optional)</span>
                <input value={form.landmark} onChange={(e) => update("landmark", e.target.value)} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-ink-700">Latitude</span>
                <input type="number" step="any" value={form.latitude} onChange={(e) => update("latitude", Number(e.target.value))} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink-700">Longitude</span>
                <input type="number" step="any" value={form.longitude} onChange={(e) => update("longitude", Number(e.target.value))} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" />
              </label>
            </div>
            <p className="text-xs text-ink-400">
              Tip: find your coordinates by right-clicking your location on{" "}
              <a href="https://www.openstreetmap.org" target="_blank" rel="noreferrer" className="underline">
                OpenStreetMap
              </a>
              .
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-ink-700">Storage area description</span>
              <textarea rows={3} value={form.locationDescription} onChange={(e) => update("locationDescription", e.target.value)} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink-700">Safety & security information</span>
              <textarea
                rows={2}
                value={form.safetyInfo}
                onChange={(e) => update("safetyInfo", e.target.value)}
                placeholder="e.g. CCTV monitored, staffed 24/7, lockable storage room"
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink-700">Total capacity (bags)</span>
              <input type="number" min={1} value={form.capacityTotal} onChange={(e) => update("capacityTotal", Number(e.target.value))} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" />
            </label>
            <div>
              <p className="mb-2 text-sm font-medium text-ink-700">Photos of your storage area</p>
              <PhotoUrlsEditor photos={form.photos} onChange={(v) => update("photos", v)} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-sm font-medium text-ink-700">Operating hours</p>
              <OperatingHoursEditor hours={form.operatingHours} onChange={(v) => update("operatingHours", v)} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-ink-700">Pricing per luggage type</p>
              <PriceRulesEditor rules={form.priceRules} onChange={(v) => update("priceRules", v)} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-ink-100 bg-ink-50 p-4 text-sm text-ink-600">
              <p>
                <span className="font-semibold text-ink-800">{form.businessName}</span> ({form.businessType})
              </p>
              <p className="mt-1">{form.locationName} — {form.address}, {form.city}</p>
              <p className="mt-1">Capacity: {form.capacityTotal} bags · {form.priceRules.length} price rules · {form.photos.filter(Boolean).length} photos</p>
            </div>
            <label className="flex items-start gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={form.agreedToTerms}
                onChange={(e) => update("agreedToTerms", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-brand-600"
              />
              I agree to the Luggo partner terms and confirm the information above is accurate.
            </label>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="flex-1 rounded-lg border border-ink-200 py-3 font-semibold text-ink-700 hover:bg-ink-50">
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(step + 1)} className="flex-1 rounded-lg bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700">
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 rounded-lg bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit application"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
