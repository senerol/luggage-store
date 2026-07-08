import { useEffect, useState } from "react";
import { Wallet, Percent, PiggyBank } from "lucide-react";
import { DashboardCard } from "@/components/common/DashboardCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { EmptyState } from "@/components/common/EmptyState";
import { getRevenue, listMyPayouts, Payout, PartnerRevenue } from "@/api/partner";
import { extractErrorMessage } from "@/api/client";
import { formatCurrency, formatDate } from "@/utils/format";
import { StatusBadge } from "@/components/common/StatusBadge";

export default function PartnerRevenuePage() {
  const [revenue, setRevenue] = useState<PartnerRevenue | null>(null);
  const [payouts, setPayouts] = useState<Payout[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    Promise.all([getRevenue(), listMyPayouts()])
      .then(([r, p]) => {
        setRevenue(r);
        setPayouts(p);
      })
      .catch((err) => setError(extractErrorMessage(err)));
  }

  useEffect(load, []);

  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!revenue || !payouts) return <LoadingSpinner label="Loading revenue…" />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink-900">Revenue & payouts</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <DashboardCard label="Total earnings" value={formatCurrency(revenue.totalEarnings)} icon={PiggyBank} accent="brand" />
        <DashboardCard label="Pending payout" value={formatCurrency(revenue.pendingPayout)} icon={Wallet} accent="amber" />
        <DashboardCard label="Commission taken" value={formatCurrency(revenue.platformCommissionTaken)} icon={Percent} accent="ink" />
      </div>

      <h2 className="mb-3 font-semibold text-ink-900">By location</h2>
      <div className="mb-8 overflow-x-auto rounded-xl border border-ink-100 bg-white shadow-card">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3 text-right">Paid bookings</th>
              <th className="px-4 py-3 text-right">Earnings</th>
              <th className="px-4 py-3 text-right">Commission</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {revenue.byLocation.map((loc) => (
              <tr key={loc.storageLocationId}>
                <td className="px-4 py-3 font-medium text-ink-800">{loc.name}</td>
                <td className="px-4 py-3 text-right">{loc.paidBookings}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(loc.totalEarnings)}</td>
                <td className="px-4 py-3 text-right text-ink-500">{formatCurrency(loc.platformCommission)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 font-semibold text-ink-900">Payout history</h2>
      {payouts.length === 0 ? (
        <EmptyState icon={Wallet} title="No payouts yet" description="Payouts appear here once Luggo settles your earnings." />
      ) : (
        <div className="space-y-3">
          {payouts.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-ink-100 bg-white p-4 shadow-card">
              <div>
                <p className="font-semibold text-ink-900">{formatCurrency(p.amount)}</p>
                <p className="text-xs text-ink-400">
                  {formatDate(p.createdAt)} · {p.bookings.length} booking{p.bookings.length === 1 ? "" : "s"}
                </p>
              </div>
              <StatusBadge status={p.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
