import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import {
  listPartners,
  suspendPartner,
  reinstatePartner,
  createPayoutForPartner,
  AdminPartner,
} from "@/api/admin";
import { extractErrorMessage } from "@/api/client";

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<AdminPartner[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    listPartners().then(setPartners).catch((err) => setError(extractErrorMessage(err)));
  }
  useEffect(load, []);

  async function handleSuspend(p: AdminPartner) {
    setBusyId(p.id);
    try {
      if (p.approved) {
        await suspendPartner(p.id);
        toast.success("Partner suspended.");
      } else {
        await reinstatePartner(p.id);
        toast.success("Partner reinstated.");
      }
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handlePayout(p: AdminPartner) {
    setBusyId(p.id);
    try {
      const payout = await createPayoutForPartner(p.id);
      toast.success(`Payout created for ₹${payout.amount}.`);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!partners) return <LoadingSpinner label="Loading partners…" />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink-900">Partners ({partners.length})</h1>
      <div className="space-y-4">
        {partners.map((p) => (
          <div key={p.id} className="rounded-xl border border-ink-100 bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink-900">{p.businessName}</p>
                <p className="text-sm text-ink-500">{p.user.name} · {p.user.email}</p>
                <p className="mt-1 text-xs text-ink-400">
                  {p.storageLocations.length} location{p.storageLocations.length === 1 ? "" : "s"} ·{" "}
                  {p.businessType ?? "Unspecified type"}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  p.approved ? "bg-brand-100 text-brand-800" : "bg-ink-100 text-ink-600"
                }`}
              >
                {p.approved ? "Approved" : "Not approved"}
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => handleSuspend(p)}
                disabled={busyId === p.id}
                className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-60"
              >
                {p.approved ? "Suspend" : "Reinstate"}
              </button>
              {p.approved && (
                <button
                  onClick={() => handlePayout(p)}
                  disabled={busyId === p.id}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  Settle payout
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
