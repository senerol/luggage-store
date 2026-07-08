import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { OperatingHoursEditor } from "@/components/partner/OperatingHoursEditor";
import { PriceRulesEditor } from "@/components/partner/PriceRulesEditor";
import { PhotoUrlsEditor } from "@/components/partner/PhotoUrlsEditor";
import { createStorage, getMyStorageById, StorageInput, updateStorage } from "@/api/partner";
import { OperatingHour, PriceRule } from "@/types";
import { extractErrorMessage } from "@/api/client";

const DEFAULT_HOURS: OperatingHour[] = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  openTime: "09:00",
  closeTime: "21:00",
}));

export default function PartnerStorageFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<StorageInput>({
    name: "",
    description: "",
    address: "",
    city: "New Delhi",
    latitude: 28.6139,
    longitude: 77.209,
    capacityTotal: 20,
    photos: [""],
    operatingHours: DEFAULT_HOURS,
    priceRules: [],
  });

  useEffect(() => {
    if (!id) return;
    getMyStorageById(id)
      .then((loc) =>
        setForm({
          name: loc.name,
          description: loc.description,
          address: loc.address,
          city: loc.city,
          latitude: loc.latitude,
          longitude: loc.longitude,
          capacityTotal: loc.capacityTotal,
          photos: loc.photos.length ? loc.photos : [""],
          operatingHours: loc.operatingHours,
          priceRules: loc.priceRules,
        })
      )
      .catch((err) => toast.error(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  function update<K extends keyof StorageInput>(key: K, value: StorageInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    if (form.priceRules.length === 0) {
      toast.error("Add at least one price rule.");
      return;
    }
    const payload = { ...form, photos: form.photos.filter((p) => p.trim()) };
    if (payload.photos.length === 0) {
      toast.error("Add at least one photo URL.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateStorage(id!, payload);
        toast.success("Storage location updated.");
      } else {
        await createStorage(payload);
        toast.success("Storage location submitted for approval.");
      }
      navigate("/partner/storage");
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSpinner className="min-h-[60vh]" />;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-ink-900">{isEdit ? "Edit storage location" : "Add storage location"}</h1>

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-ink-700">Name</span>
            <input value={form.name} onChange={(e) => update("name", e.target.value)} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink-700">City</span>
            <input value={form.city} onChange={(e) => update("city", e.target.value)} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-ink-700">Address</span>
          <input value={form.address} onChange={(e) => update("address", e.target.value)} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-ink-700">Latitude</span>
            <input type="number" step="any" value={form.latitude} onChange={(e) => update("latitude", Number(e.target.value))} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink-700">Longitude</span>
            <input type="number" step="any" value={form.longitude} onChange={(e) => update("longitude", Number(e.target.value))} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink-700">Capacity (bags)</span>
            <input type="number" min={1} value={form.capacityTotal} onChange={(e) => update("capacityTotal", Number(e.target.value))} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-ink-700">Description</span>
          <textarea rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" />
        </label>

        <div>
          <p className="mb-2 text-sm font-medium text-ink-700">Photos</p>
          <PhotoUrlsEditor photos={form.photos} onChange={(v) => update("photos", v)} />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-ink-700">Operating hours</p>
          <OperatingHoursEditor hours={form.operatingHours} onChange={(v) => update("operatingHours", v)} />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-ink-700">Pricing per luggage type</p>
          <PriceRulesEditor rules={form.priceRules as PriceRule[]} onChange={(v) => update("priceRules", v)} />
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-lg bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Submit for approval"}
        </button>
      </div>
    </div>
  );
}
