export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

const LUGGAGE_LABELS: Record<string, string> = {
  BACKPACK: "Backpack",
  SMALL_SUITCASE: "Small suitcase",
  LARGE_SUITCASE: "Large suitcase",
  OTHER: "Other",
};

export function luggageLabel(type: string): string {
  return LUGGAGE_LABELS[type] ?? type;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  IN_STORAGE: "In storage",
  READY_FOR_PICKUP: "Ready for pickup",
  COLLECTED: "Collected",
  CANCELLED: "Cancelled",
  PAYMENT_FAILED: "Payment failed",
  EXPIRED: "Expired",
  PENDING_REVIEW: "Pending review",
  CHANGES_REQUESTED: "Changes requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
  PENDING: "Pending",
  DISABLED: "Disabled",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  CHECKED_IN: "bg-blue-100 text-blue-800",
  IN_STORAGE: "bg-brand-100 text-brand-800",
  READY_FOR_PICKUP: "bg-purple-100 text-purple-800",
  COLLECTED: "bg-ink-100 text-ink-700",
  CANCELLED: "bg-red-100 text-red-700",
  PAYMENT_FAILED: "bg-red-100 text-red-700",
  EXPIRED: "bg-red-100 text-red-700",
  PENDING_REVIEW: "bg-amber-100 text-amber-800",
  CHANGES_REQUESTED: "bg-orange-100 text-orange-800",
  APPROVED: "bg-brand-100 text-brand-800",
  REJECTED: "bg-red-100 text-red-700",
  SUSPENDED: "bg-red-100 text-red-700",
  PENDING: "bg-amber-100 text-amber-800",
  DISABLED: "bg-ink-100 text-ink-600",
};

export function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? "bg-ink-100 text-ink-700";
}
