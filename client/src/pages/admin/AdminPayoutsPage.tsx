import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { listPayouts, markPayoutPaid } from "@/api/admin";
import { Payout } from "@/api/partner";
import { extractErrorMessage } from "@/api/client";
import { formatCurrency, formatDate } from "@/utils/format";
import { Wallet } from "lucide-react";

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    listPayouts().then(setPayouts).catch((err) => setError(extractErrorMessage(err)));
  }
  useEffect(load, []);

  async function handleMarkPaid(id: string) {
    setBusyId(id);
    try {
      await markPayoutPaid(id);
      toast.success("Payout marked as paid.");
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!payouts) return <LoadingSpinner label="Loading payouts…" />;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-ink-900">Payouts</h1>
      <p className="mb-6 text-sm text-ink-500">
        Trigger a new payout from a partner's page. Marking a payout "paid" here only records that the transfer
        happened through your own banking channel — no real money movement is wired up in this MVP.
      </p>

      {payouts.length === 0 ? (
        <EmptyState icon={Wallet} title="No payouts yet" />
      ) : (
        <div className="space-y-3">
          {payouts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white p-4 shadow-card">
              <div>
                <p className="font-semibold text-ink-900">{formatCurrency(p.amount)}</p>
                <p className="text-xs text-ink-400">
                  {formatDate(p.createdAt)} · {p.bookings.length} booking{p.bookings.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={p.status} />
                {p.status === "PENDING" && (
                  <button
                    onClick={() => handleMarkPaid(p.id)}
                    disabled={busyId === p.id}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    Mark as paid
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
