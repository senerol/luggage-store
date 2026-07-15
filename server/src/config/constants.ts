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

// The IANA timezone "open now" status is evaluated in (see
// utils/operatingHours.ts's isCurrentlyOpen). There is no per-location
// timezone stored in the schema today, and every seeded/current storage
// location is in Delhi, India - so this single, explicit constant is the
// app's current timezone assumption, applied consistently everywhere
// "is this location open right now" is computed, rather than left to
// silently default to whatever timezone the server process happens to run
// in (UTC, inside this project's Docker containers). If Luggo ever expands
// outside India, each StorageLocation would need its own stored IANA
// timezone and isCurrentlyOpen would take that instead of this constant -
// the function is already written to accept any IANA zone name.
export const STORAGE_TIMEZONE = "Asia/Kolkata";
