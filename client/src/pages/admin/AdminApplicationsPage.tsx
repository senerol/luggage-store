import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { listApplications, PartnerApplication } from "@/api/admin";
import { extractErrorMessage } from "@/api/client";
import { formatDate } from "@/utils/format";
import { FileText } from "lucide-react";

const FILTERS = ["", "PENDING_REVIEW", "CHANGES_REQUESTED", "APPROVED", "REJECTED", "SUSPENDED"];

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<PartnerApplication[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  function load() {
    setApplications(null);
    listApplications(filter || undefined)
      .then(setApplications)
      .catch((err) => setError(extractErrorMessage(err)));
  }
  useEffect(load, [filter]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-ink-900">Partner applications</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              filter === f ? "border-brand-600 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-600"
            }`}
          >
            {f || "All"}
          </button>
        ))}
      </div>

      {error && <ErrorMessage message={error} onRetry={load} />}
      {!applications && !error && <LoadingSpinner label="Loading applications…" />}
      {applications && applications.length === 0 && <EmptyState icon={FileText} title="No applications" />}

      {applications && applications.length > 0 && (
        <div className="space-y-3">
          {applications.map((app) => (
            <Link
              key={app.id}
              to={`/admin/applications/${app.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white p-4 shadow-card hover:shadow-md"
            >
              <div>
                <p className="font-semibold text-ink-900">{app.businessName}</p>
                <p className="text-sm text-ink-500">{app.storageLocation.name} · Submitted {formatDate(app.submittedAt)}</p>
              </div>
              <StatusBadge status={app.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
