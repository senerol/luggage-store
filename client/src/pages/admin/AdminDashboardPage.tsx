import { useEffect, useState } from "react";
import {
  Users,
  Building2,
  Warehouse,
  CalendarCheck,
  IndianRupee,
  Percent,
  Wallet,
  ClipboardList,
  TrendingUp,
} from "lucide-react";
import { DashboardCard } from "@/components/common/DashboardCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { getDashboard, getPartnerFunnel, AdminDashboard, PartnerFunnel } from "@/api/admin";
import { extractErrorMessage } from "@/api/client";
import { formatCurrency } from "@/utils/format";

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [funnel, setFunnel] = useState<PartnerFunnel | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    Promise.all([getDashboard(), getPartnerFunnel()])
      .then(([d, f]) => {
        setData(d);
        setFunnel(f);
      })
      .catch((err) => setError(extractErrorMessage(err)));
  }

  useEffect(load, []);

  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!data || !funnel) return <LoadingSpinner label="Loading dashboard…" />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink-900">Admin dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard label="Total users" value={String(data.totalUsers)} icon={Users} accent="blue" />
        <DashboardCard label="Total partners" value={String(data.totalPartners)} icon={Building2} accent="blue" />
        <DashboardCard label="Active storage locations" value={String(data.activeStorageLocations)} icon={Warehouse} accent="brand" />
        <DashboardCard label="Total bookings" value={String(data.totalBookings)} icon={CalendarCheck} accent="brand" />
        <DashboardCard label="Gross booking value" value={formatCurrency(data.grossBookingValue)} icon={IndianRupee} accent="brand" />
        <DashboardCard label="Platform revenue" value={formatCurrency(data.platformRevenue)} icon={Percent} accent="amber" />
        <DashboardCard label="Partner payouts settled" value={formatCurrency(data.partnerPayoutsSettled)} icon={Wallet} accent="ink" />
        <DashboardCard label="Total transactions" value={String(data.totalTransactions)} icon={TrendingUp} accent="ink" />
        <DashboardCard label="Pending approvals" value={String(data.pendingApprovals)} icon={ClipboardList} accent="amber" />
        <DashboardCard label="Open reports" value={String(data.openReports)} icon={ClipboardList} accent="amber" />
      </div>

      <h2 className="mb-3 mt-10 font-semibold text-ink-900">Partner-acquisition funnel</h2>
      <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white p-6 shadow-card">
        <div className="flex min-w-[640px] items-center justify-between text-center text-sm">
          {[
            { label: "Page visits", value: funnel.pageViews },
            { label: "Started", value: funnel.applicationsStarted },
            { label: "Submitted", value: funnel.applicationsSubmitted },
            { label: "Approved", value: funnel.applicationsApproved },
            { label: "Receiving bookings", value: funnel.partnersReceivingBookings },
          ].map((step, i, arr) => (
            <div key={step.label} className="flex flex-1 items-center">
              <div>
                <p className="text-2xl font-bold text-ink-900">{step.value}</p>
                <p className="text-ink-500">{step.label}</p>
              </div>
              {i < arr.length - 1 && <div className="mx-3 h-px flex-1 bg-ink-200" />}
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-ink-400">
          Conversion rate (approved / submitted): {(funnel.conversionRate * 100).toFixed(1)}%
        </p>
      </div>
    </div>
  );
}
