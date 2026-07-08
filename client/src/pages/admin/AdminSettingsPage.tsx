import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Percent } from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { getCommission, setCommission } from "@/api/admin";
import { extractErrorMessage } from "@/api/client";

export default function AdminSettingsPage() {
  const [percent, setPercent] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCommission()
      .then((c) => setPercent(c.commissionPercent))
      .catch((err) => toast.error(extractErrorMessage(err)));
  }, []);

  async function handleSave() {
    if (percent === null) return;
    setSaving(true);
    try {
      const updated = await setCommission(percent);
      setPercent(updated.commissionPercent);
      toast.success("Commission rate updated.");
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (percent === null) return <LoadingSpinner label="Loading settings…" />;

  return (
    <div className="max-w-md">
      <h1 className="mb-6 text-2xl font-bold text-ink-900">Platform settings</h1>

      <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-card">
        <div className="flex items-center gap-2 text-brand-700">
          <Percent className="h-5 w-5" />
          <h2 className="font-semibold">Commission rate</h2>
        </div>
        <p className="mt-1 text-sm text-ink-500">
          The percentage of every booking's total amount that Luggo keeps as commission. Applies to all new bookings
          from the moment it's changed — past bookings keep the rate they were created under.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={percent}
            onChange={(e) => setPercent(Number(e.target.value))}
            className="w-24 rounded-lg border border-ink-200 px-3 py-2 text-sm"
          />
          <span className="text-ink-500">%</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
