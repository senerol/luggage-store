import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Check, MessageSquareWarning, X } from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Modal } from "@/components/common/Modal";
import {
  approveApplication,
  getApplicationById,
  rejectApplication,
  requestApplicationChanges,
  PartnerApplication,
} from "@/api/admin";
import { extractErrorMessage } from "@/api/client";
import { formatCurrency, formatDate, luggageLabel } from "@/utils/format";

export default function AdminApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<PartnerApplication | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<"reject" | "changes" | null>(null);
  const [note, setNote] = useState("");

  function load() {
    if (!id) return;
    getApplicationById(id).then(setApp).catch((err) => setError(extractErrorMessage(err)));
  }
  useEffect(load, [id]);

  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!app) return <LoadingSpinner label="Loading application…" />;

  async function handleApprove() {
    setBusy(true);
    try {
      await approveApplication(app!.id);
      toast.success("Application approved — the location is now live.");
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleModalSubmit() {
    if (!note.trim()) {
      toast.error("Please provide a reason/note.");
      return;
    }
    setBusy(true);
    try {
      if (modal === "reject") await rejectApplication(app!.id, note);
      else await requestApplicationChanges(app!.id, note);
      toast.success(modal === "reject" ? "Application rejected." : "Changes requested.");
      setModal(null);
      setNote("");
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <Link to="/admin/applications" className="mb-4 flex items-center gap-1 text-sm text-ink-500 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to applications
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{app.businessName}</h1>
          <p className="text-ink-500">{app.businessType} · Submitted {formatDate(app.submittedAt)}</p>
        </div>
        <StatusBadge status={app.status} />
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-card">
          <h2 className="mb-2 font-semibold text-ink-900">Applicant</h2>
          <p className="text-sm text-ink-600">{app.user.name} · {app.user.email} {app.user.phone && `· ${app.user.phone}`}</p>
          <p className="mt-3 text-sm text-ink-600">{app.description}</p>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-card">
          <h2 className="mb-2 font-semibold text-ink-900">{app.storageLocation.name}</h2>
          <p className="text-sm text-ink-600">{app.storageLocation.address}, {app.storageLocation.city}</p>
          {app.storageLocation.landmark && <p className="text-sm text-ink-500">Near {app.storageLocation.landmark}</p>}
          <p className="mt-2 text-sm text-ink-600">{app.storageLocation.description}</p>
          {app.storageLocation.safetyInfo && (
            <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">{app.storageLocation.safetyInfo}</p>
          )}
          <p className="mt-3 text-sm text-ink-600">Capacity: {app.storageLocation.capacityTotal} bags</p>

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {app.storageLocation.priceRules.map((r) => (
              <p key={r.luggageType} className="text-ink-600">
                {luggageLabel(r.luggageType)}: <span className="font-medium">{formatCurrency(r.pricePerHour)}/hr</span>
              </p>
            ))}
          </div>

          {app.storageLocation.photos.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {app.storageLocation.photos.map((url, i) => (
                <img key={i} src={url} alt="" className="h-20 w-full rounded-lg object-cover" />
              ))}
            </div>
          )}
        </div>

        {app.status === "REJECTED" && app.rejectionReason && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">Rejection reason: {app.rejectionReason}</p>
        )}
        {app.status === "CHANGES_REQUESTED" && app.adminNote && (
          <p className="rounded-lg bg-orange-50 px-4 py-3 text-sm text-orange-800">Note to partner: {app.adminNote}</p>
        )}

        {app.status === "PENDING_REVIEW" && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleApprove}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              <Check className="h-4 w-4" /> Approve
            </button>
            <button
              onClick={() => setModal("changes")}
              className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
            >
              <MessageSquareWarning className="h-4 w-4" /> Request changes
            </button>
            <button
              onClick={() => setModal("reject")}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <X className="h-4 w-4" /> Reject
            </button>
          </div>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "reject" ? "Reject application" : "Request changes"}>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder={modal === "reject" ? "Reason for rejection…" : "What should the partner change?"}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
        />
        <button
          onClick={handleModalSubmit}
          disabled={busy}
          className="mt-3 w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Submit
        </button>
      </Modal>
    </div>
  );
}
