import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Warehouse } from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { listMyStorage, PartnerStorageLocation, setStorageDisabled } from "@/api/partner";
import { extractErrorMessage } from "@/api/client";

export default function PartnerStoragePage() {
  const [locations, setLocations] = useState<PartnerStorageLocation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    listMyStorage()
      .then(setLocations)
      .catch((err) => setError(extractErrorMessage(err)));
  }

  useEffect(load, []);

  async function toggle(loc: PartnerStorageLocation) {
    const disable = loc.status === "APPROVED";
    try {
      await setStorageDisabled(loc.id, disable);
      toast.success(disable ? "Bookings paused for this location." : "Location re-enabled.");
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink-900">My storage locations</h1>
        <Link to="/partner/storage/new" className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          <Plus className="h-4 w-4" /> Add location
        </Link>
      </div>

      {error && <ErrorMessage message={error} onRetry={load} />}
      {!locations && !error && <LoadingSpinner label="Loading your locations…" />}
      {locations && locations.length === 0 && (
        <EmptyState icon={Warehouse} title="No storage locations yet" description="Submit a partner application to add your first location." />
      )}

      {locations && locations.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {locations.map((loc) => (
            <div key={loc.id} className="rounded-xl border border-ink-100 bg-white p-5 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-ink-900">{loc.name}</h3>
                <StatusBadge status={loc.status} />
              </div>
              <p className="mt-1 text-sm text-ink-500">{loc.address}</p>
              <p className="mt-2 text-sm text-ink-500">Capacity: {loc.capacityTotal} bags</p>
              <div className="mt-4 flex gap-2">
                <Link
                  to={`/partner/storage/${loc.id}/edit`}
                  className="flex-1 rounded-lg border border-ink-200 py-2 text-center text-sm font-medium text-ink-700 hover:bg-ink-50"
                >
                  Edit
                </Link>
                {(loc.status === "APPROVED" || loc.status === "DISABLED") && (
                  <button
                    onClick={() => toggle(loc)}
                    className="flex-1 rounded-lg border border-ink-200 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
                  >
                    {loc.status === "APPROVED" ? "Pause bookings" : "Re-enable"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
