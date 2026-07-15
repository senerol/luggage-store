interface OperatingHour {
  dayOfWeek: number;
  openTime: string; // "HH:MM"
  closeTime: string; // "HH:MM"
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Recovers the wall-clock instant a customer actually selected, independent
 * of whatever timezone the Node process happens to be running in.
 *
 * `dropoffAt`/`pickupAt` arrive at the API as real, correct UTC instants
 * (e.g. "2026-08-31T02:11:00.000Z" for a customer in India who picked
 * "07:41" in their own browser) - that part is fine and must stay fine for
 * every other consumer of these fields (pricing duration, capacity/overlap
 * comparisons, check-in windows all keep using the true instant, unchanged).
 *
 * The bug this fixes: reading day-of-week/hour-of-day off that Date with
 * `.getDay()`/`.getHours()` returns them in the *server's own* timezone
 * (UTC inside this project's Docker containers), not the customer's. A
 * customer's 07:41 IST (UTC+5:30) becomes the instant 02:11 UTC, and a
 * server reading that instant with local getters sees "02:11" - correctly
 * outside a 07:00-22:00 window, even though the customer's actual wall
 * clock never left it. Since operating hours are meant to be compared
 * against the customer's own wall-clock time, we need to read them back
 * that way regardless of where the code happens to execute.
 *
 * `clientUtcOffsetMinutes` is exactly what the browser's own
 * `Date.prototype.getTimezoneOffset()` returns at the moment the customer
 * picked the time (JS convention: UTC = local + offsetMinutes). Shifting
 * the instant by that same offset and then reading it with the UTC-based
 * getters recovers the original local field values, deterministically,
 * with no dependency on the server's own timezone and no IANA timezone
 * database or library involved - it's the same offset the browser already
 * resolved (DST included), just carried through as plain arithmetic.
 *
 * This assumes the customer is booking storage in the same local timezone
 * they're physically browsing from - true for every location and partner
 * this app supports today, since there's no separate per-location timezone
 * stored. If Luggo ever needs to support a customer booking storage in a
 * different timezone than their own (e.g. booking ahead from abroad), each
 * StorageLocation would need its own stored timezone and this function
 * would use that instead of the request's offset - a real (if still
 * library-free) design change, not needed for the bug reported here.
 */
function toWallClock(at: Date, clientUtcOffsetMinutes: number): Date {
  return new Date(at.getTime() - clientUtcOffsetMinutes * 60000);
}

// A day is "closed" if there is no operatingHours row for it.
export function isOpenAt(hours: OperatingHour[], at: Date, clientUtcOffsetMinutes = 0): boolean {
  const wallClock = toWallClock(at, clientUtcOffsetMinutes);
  const day = wallClock.getUTCDay();
  const rule = hours.find((h) => h.dayOfWeek === day);
  if (!rule) return false;
  const minutesNow = wallClock.getUTCHours() * 60 + wallClock.getUTCMinutes();
  return minutesNow >= toMinutes(rule.openTime) && minutesNow <= toMinutes(rule.closeTime);
}

export function isWithinOperatingWindow(
  hours: OperatingHour[],
  from: Date,
  to: Date,
  clientUtcOffsetMinutes = 0
): boolean {
  // Both the drop-off and pickup instants must fall inside that day's hours.
  // (Bookings that span multiple calendar days simply need both endpoints
  // to land within that respective day's open window - the luggage sits
  // safely in storage in between. Each endpoint resolves its own
  // wall-clock day/time independently, so a drop-off on Monday and a
  // pickup on Wednesday are correctly checked against Monday's and
  // Wednesday's hours respectively.)
  return isOpenAt(hours, from, clientUtcOffsetMinutes) && isOpenAt(hours, to, clientUtcOffsetMinutes);
}

export function todayHours(hours: OperatingHour[], now = new Date()): OperatingHour | undefined {
  return hours.find((h) => h.dayOfWeek === now.getDay());
}

const WEEKDAY_TO_NUMBER: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Resolves a real instant into "what day and minute-of-day is it right now
 * at this IANA timezone" - using Node's built-in Intl/ICU support (no
 * library needed; Node has shipped full ICU by default since v13, verified
 * working inside this project's actual node:20-bookworm container).
 */
function wallClockInTimeZone(instant: Date, timeZone: string): { dayOfWeek: number; minutesSinceMidnight: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(instant);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  let hour = Number(get("hour"));
  if (hour === 24) hour = 0; // some ICU data renders midnight as "24" with hour12:false
  const minute = Number(get("minute"));

  return { dayOfWeek: WEEKDAY_TO_NUMBER[get("weekday")], minutesSinceMidnight: hour * 60 + minute };
}

/**
 * "Is this location open right now" - a genuinely different question from
 * `isOpenAt`/`isWithinOperatingWindow` above, which check a *customer's
 * chosen booking time* against their own browser's offset. This function
 * answers "is it currently open", a server-side fact with no browser or
 * customer involved at all, so it must use the storage location's own
 * timezone (see STORAGE_TIMEZONE in config/constants.ts) rather than any
 * request-supplied offset - there isn't one to use here, and defaulting to
 * the server process's own timezone (UTC in this project's containers) is
 * exactly the bug this fixes: at 03:10 IST (21:40 UTC the previous day), a
 * naive UTC read of a 07:00-22:00 window incorrectly says "open".
 *
 * Two behavioral differences from isOpenAt, both intentional and scoped
 * to *only* this open-now concept (isOpenAt/isWithinOperatingWindow for
 * booking validation are untouched):
 *   - the closing time is treated as exclusive (22:00-22:00 reads as
 *     "closed at 22:00", matching how a real storefront's listed closing
 *     time works), whereas booking-time validation still treats it as
 *     inclusive (a booking scheduled to end exactly at closing time is
 *     fine to reserve).
 *   - overnight ranges (closeTime <= openTime, e.g. "22:00" - "02:00")
 *     are supported: such a rule keeps a location open from its openTime
 *     until midnight, and again from midnight until its closeTime on the
 *     *next* calendar day - so both "today's" rule and "yesterday's" rule
 *     have to be considered to answer "is it open right now".
 */
/**
 * Renders an instant as a human-readable wall-clock string in `timeZone`,
 * for messages a person will read (e.g. "check-in opens at ..."). Without
 * this, `Date.prototype.toLocaleString()` renders in the *server process's*
 * timezone (UTC inside this project's Docker containers) with no timezone
 * label - a partner physically at an Asia/Kolkata storage location reading
 * that string has no way to know it isn't already their own local time,
 * and a UTC instant can read as much as 5:30 "earlier" than the true local
 * time it actually represents. This only affects what's displayed; it must
 * never be used for the underlying eligibility comparison, which stays a
 * correct, timezone-independent instant-vs-instant Date comparison.
 */
export function formatInTimeZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(instant);
}

export function isCurrentlyOpen(hours: OperatingHour[], now: Date, timeZone: string): boolean {
  const { dayOfWeek, minutesSinceMidnight } = wallClockInTimeZone(now, timeZone);
  const yesterday = (dayOfWeek + 6) % 7;

  const today = hours.find((h) => h.dayOfWeek === dayOfWeek);
  if (today) {
    const open = toMinutes(today.openTime);
    const close = toMinutes(today.closeTime);
    if (close > open) {
      // Ordinary same-day window.
      if (minutesSinceMidnight >= open && minutesSinceMidnight < close) return true;
    } else {
      // Overnight window starting today: open from `open` through midnight.
      if (minutesSinceMidnight >= open) return true;
    }
  }

  const yesterdayRule = hours.find((h) => h.dayOfWeek === yesterday);
  if (yesterdayRule) {
    const open = toMinutes(yesterdayRule.openTime);
    const close = toMinutes(yesterdayRule.closeTime);
    // Only an overnight rule can spill over into today; a same-day rule
    // from yesterday has no bearing on today's minutes-since-midnight.
    if (close <= open && minutesSinceMidnight < close) return true;
  }

  return false;
}
