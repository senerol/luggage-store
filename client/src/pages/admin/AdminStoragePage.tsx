import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { approveStorage, listStorageLocations, rejectStorage } from "@/api/admin";
import { PartnerStorageLocation } from "@/api/partner";
import { extractErrorMessage } from "@/api/client";

export default function AdminStoragePage() {
  const [locations, setLocations] = useState<PartnerStorageLocation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    listStorageLocations().then(setLocations).catch((err) => setError(extractErrorMessage(err)));
  }
  useEffect(load, []);

  async function handle(id: string, approve: boolean) {
    setBusyId(id);
    try {
      if (approve) await approveStorage(id);
      else await rejectStorage(id);
      toast.success(approve ? "Location approved." : "Location rejected.");
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!locations) return <LoadingSpinner label="Loading storage locations…" />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink-900">Storage locations ({locations.length})</h1>
      <div className="space-y-3">
        {locations.map((loc) => (
          <div key={loc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white p-4 shadow-card">
            <div>
              <p className="font-semibold text-ink-900">{loc.name}</p>
              <p className="text-sm text-ink-500">{loc.address}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={loc.status} />
              {loc.status === "PENDING" && (
                <>
                  <button
                    onClick={() => handle(loc.id, true)}
                    disabled={busyId === loc.id}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handle(loc.id, false)}
                    disabled={busyId === loc.id}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
