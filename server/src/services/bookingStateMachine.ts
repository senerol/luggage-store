import { BookingStatus } from "@prisma/client";
import { AppError } from "../utils/AppError";

// The only edges allowed in the booking lifecycle graph. Anything not listed
// here (e.g. COLLECTED -> CHECKED_IN) is rejected by assertTransition below,
// regardless of which code path tries to trigger it.
const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "PAYMENT_FAILED", "CANCELLED", "EXPIRED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "EXPIRED"],
  CHECKED_IN: ["IN_STORAGE"],
  IN_STORAGE: ["READY_FOR_PICKUP"],
  READY_FOR_PICKUP: ["COLLECTED"],
  COLLECTED: [],
  CANCELLED: [],
  PAYMENT_FAILED: ["PENDING_PAYMENT"], // customer may retry payment
  EXPIRED: [],
};

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw AppError.conflict(`Booking cannot move from ${from} to ${to}.`);
  }
}

export function canCancel(status: BookingStatus): boolean {
  return status === "PENDING_PAYMENT" || status === "CONFIRMED";
}
