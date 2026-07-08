import { LucideIcon } from "lucide-react";
import clsx from "clsx";

export function DashboardCard({
  label,
  value,
  icon: Icon,
  hint,
  accent = "brand",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  accent?: "brand" | "amber" | "blue" | "ink";
}) {
  const accents: Record<string, string> = {
    brand: "bg-brand-50 text-brand-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    ink: "bg-ink-100 text-ink-700",
  };

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-ink-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
        </div>
        <div className={clsx("rounded-lg p-2", accents[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
