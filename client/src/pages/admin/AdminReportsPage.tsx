import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { listReports, resolveReport, AdminReport } from "@/api/admin";
import { extractErrorMessage } from "@/api/client";
import { formatDate } from "@/utils/format";
import { Flag } from "lucide-react";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    listReports().then(setReports).catch((err) => setError(extractErrorMessage(err)));
  }
  useEffect(load, []);

  async function handle(id: string, status: "RESOLVED" | "DISMISSED") {
    setBusyId(id);
    try {
      await resolveReport(id, status);
      toast.success(`Report ${status.toLowerCase()}.`);
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!reports) return <LoadingSpinner label="Loading reports…" />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink-900">Reports & complaints</h1>
      {reports.length === 0 ? (
        <EmptyState icon={Flag} title="No reports" description="User-filed reports and complaints will show up here." />
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="rounded-xl border border-ink-100 bg-white p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink-400">{r.targetType}</p>
                  <p className="mt-1 text-sm text-ink-700">{r.reason}</p>
                  <p className="mt-1 text-xs text-ink-400">
                    {r.reporter.name} · {formatDate(r.createdAt)}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              {r.status === "OPEN" && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handle(r.id, "RESOLVED")}
                    disabled={busyId === r.id}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    Mark resolved
                  </button>
                  <button
                    onClick={() => handle(r.id, "DISMISSED")}
                    disabled={busyId === r.id}
                    className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-50 disabled:opacity-60"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
