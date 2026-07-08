interface OperatingHour {
  dayOfWeek: number;
  openTime: string; // "HH:MM"
  closeTime: string; // "HH:MM"
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// A day is "closed" if there is no operatingHours row for it. Times are
// treated as plain local wall-clock minutes (no cross-midnight overnight
// storage in this model - closeTime is assumed to be after openTime).
export function isOpenAt(hours: OperatingHour[], at: Date): boolean {
  const day = at.getDay();
  const rule = hours.find((h) => h.dayOfWeek === day);
  if (!rule) return false;
  const minutesNow = at.getHours() * 60 + at.getMinutes();
  return minutesNow >= toMinutes(rule.openTime) && minutesNow <= toMinutes(rule.closeTime);
}

export function isWithinOperatingWindow(hours: OperatingHour[], from: Date, to: Date): boolean {
  // Both the drop-off and pickup instants must fall inside that day's hours.
  // (Bookings that span multiple calendar days simply need both endpoints
  // to land within that respective day's open window - the luggage sits
  // safely in storage in between.)
  return isOpenAt(hours, from) && isOpenAt(hours, to);
}

export function todayHours(hours: OperatingHour[], now = new Date()): OperatingHour | undefined {
  return hours.find((h) => h.dayOfWeek === now.getDay());
}
