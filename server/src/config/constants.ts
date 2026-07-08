// A PENDING_PAYMENT booking still holds capacity (see capacityService) but if
// the customer never completes payment (closed the tab, payment failed
// silently, etc.) that hold must not last forever. After this many minutes
// with no successful payment, the booking is treated as EXPIRED the next
// time anything touches that storage location's availability.
export const PENDING_PAYMENT_TTL_MINUTES = 15;

// How early a customer may check in relative to their scheduled drop-off
// time. Prevents "QR is valid" from meaning "valid at any time ever".
export const CHECK_IN_EARLY_WINDOW_MINUTES = 60;

// Reviews can only be left after luggage has actually been collected.
export const REVIEWABLE_STATUSES = ["COLLECTED"] as const;
