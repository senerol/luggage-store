import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, Package, Clock3, Wallet, TrendingUp, PiggyBank, Percent } from "lucide-react";
import { DashboardCard } from "@/components/common/DashboardCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { getDashboard, PartnerDashboard } from "@/api/partner";
import { extractErrorMessage } from "@/api/client";
import { formatCurrency } from "@/utils/format";
import { useAuth } from "@/context/AuthContext";

export default function PartnerDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<PartnerDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    getDashboard()
      .then(setData)
      .catch((err) => setError(extractErrorMessage(err)));
  }

  useEffect(load, []);

  const approved = user?.partnerProfile?.approved;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-ink-900">Partner dashboard</h1>
      <p className="mb-6 text-ink-500">{user?.partnerProfile?.businessName}</p>

      {!approved && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Your account isn't approved yet.{" "}
          <Link to="/partner/applications" className="font-semibold underline">
            Check your application status
          </Link>{" "}
          or{" "}
          <Link to="/partner/apply" className="font-semibold underline">
            submit an application
          </Link>{" "}
          if you haven't yet.
        </div>
      )}

      {error && <ErrorMessage message={error} onRetry={load} />}
      {!data && !error && <LoadingSpinner label="Loading dashboard…" />}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DashboardCard label="Today's bookings" value={String(data.todayBookings)} icon={CalendarCheck} accent="blue" />
            <DashboardCard label="Currently stored" value={String(data.currentlyStored)} icon={Package} accent="brand" />
            <DashboardCard label="Upcoming pickups (24h)" value={String(data.upcomingPickups)} icon={Clock3} accent="amber" />
            <DashboardCard label="Today's revenue" value={formatCurrency(data.todayRevenue)} icon={Wallet} accent="brand" />
            <DashboardCard label="Monthly revenue" value={formatCurrency(data.monthlyRevenue)} icon={TrendingUp} accent="blue" />
            <DashboardCard label="Total earnings" value={formatCurrency(data.totalEarnings)} icon={PiggyBank} accent="brand" />
            <DashboardCard label="Pending payout" value={formatCurrency(data.pendingPayout)} icon={Wallet} accent="amber" />
            <DashboardCard label="Platform commission taken" value={formatCurrency(data.platformCommissionTaken)} icon={Percent} accent="ink" />
            <DashboardCard label="Locations / total capacity" value={`${data.locationsCount} / ${data.totalCapacity}`} icon={Package} accent="ink" />
          </div>
        </>
      )}
    </div>
  );
}
