import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { listMyApplications, PartnerApplication } from "@/api/partner";
import { extractErrorMessage } from "@/api/client";
import { formatDate } from "@/utils/format";

export default function PartnerApplicationsPage() {
  const [applications, setApplications] = useState<PartnerApplication[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    listMyApplications()
      .then(setApplications)
      .catch((err) => setError(extractErrorMessage(err)));
  }

  useEffect(load, []);

  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!applications) return <LoadingSpinner label="Loading applications…" />;

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink-900">My applications</h1>
        <Link to="/partner/apply" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          New application
        </Link>
      </div>

      {applications.length === 0 ? (
        <EmptyState icon={FileText} title="No applications yet" description="Submit an application to start listing a storage location." />
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app.id} className="rounded-xl border border-ink-100 bg-white p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-900">{app.storageLocation.name}</p>
                  <p className="text-sm text-ink-500">Submitted {formatDate(app.submittedAt)}</p>
                </div>
                <StatusBadge status={app.status} />
              </div>

              {app.status === "REJECTED" && app.rejectionReason && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{app.rejectionReason}</p>
              )}
              {app.status === "CHANGES_REQUESTED" && app.adminNote && (
                <div className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-800">
                  <p>{app.adminNote}</p>
                  <Link to="/partner/apply" className="mt-2 inline-block font-semibold underline">
                    Edit and resubmit
                  </Link>
                </div>
              )}
              {app.status === "APPROVED" && (
                <p className="mt-3 text-sm text-brand-700">Your location is live and accepting bookings.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
