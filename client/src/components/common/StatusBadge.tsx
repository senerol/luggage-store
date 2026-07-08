import clsx from "clsx";
import { statusColor, statusLabel } from "@/utils/format";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        statusColor(status),
        className
      )}
    >
      {statusLabel(status)}
    </span>
  );
}
