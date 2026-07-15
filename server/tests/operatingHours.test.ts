import { describe, it, expect } from "vitest";
import { isOpenAt, isWithinOperatingWindow } from "../src/utils/operatingHours";

// Sunday=0 ... Saturday=6, matching the dayOfWeek convention stored in the
// database (see prisma/schema.prisma's StorageOperatingHour model).
const hours = [
  { dayOfWeek: 1, openTime: "09:00", closeTime: "21:00" }, // Monday only, for this test
];

// Built with Date.UTC (not `new Date(y, m, d, h, m)`, which is local-time and
// therefore depends on whatever timezone happens to run the test) so these
// fixtures are deterministic everywhere. 2026-01-05 is a Monday.
function mondayAt(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(2026, 0, 5, h, m));
}

describe("isOpenAt", () => {
  it("is closed on a day with no operating-hours row", () => {
    const tuesday = new Date(Date.UTC(2026, 0, 6, 12, 0));
    expect(isOpenAt(hours, tuesday)).toBe(false);
  });

  it("is open within the configured window", () => {
    expect(isOpenAt(hours, mondayAt("10:00"))).toBe(true);
  });

  it("is closed before opening time", () => {
    expect(isOpenAt(hours, mondayAt("08:59"))).toBe(false);
  });

  it("is closed after closing time", () => {
    expect(isOpenAt(hours, mondayAt("21:01"))).toBe(false);
  });
});

describe("isWithinOperatingWindow", () => {
  it("requires both drop-off and pickup instants to be within open hours", () => {
    expect(isWithinOperatingWindow(hours, mondayAt("10:00"), mondayAt("18:00"))).toBe(true);
  });

  it("rejects a pickup scheduled after closing time", () => {
    expect(isWithinOperatingWindow(hours, mondayAt("10:00"), mondayAt("21:30"))).toBe(false);
  });

  it("rejects a drop-off scheduled before opening time", () => {
    expect(isWithinOperatingWindow(hours, mondayAt("06:00"), mondayAt("18:00"))).toBe(false);
  });
});

/**
 * Regression coverage for the reported bug: a customer in IST (UTC+5:30)
 * selects "07:41" in their browser, which the frontend correctly converts
 * to the true UTC instant "02:11Z" (`toISOString()`), but a server whose
 * own process timezone is UTC previously read that instant with local
 * getters and saw "02:11" - wrongly outside a 07:00-22:00 window, even
 * though the customer's actual wall clock was 07:41. Every test below
 * builds the same kind of "true UTC instant a browser in some timezone
 * would have produced" and passes that browser's own offset, exactly as
 * BookingFlowPage.tsx now does.
 */
describe("isWithinOperatingWindow - client timezone offset (the reported bug)", () => {
  const IST_OFFSET_MINUTES = -330; // matches Date.prototype.getTimezoneOffset() for UTC+5:30

  // Builds the UTC instant produced by a browser in the given offset
  // selecting `hhmm` local time on 2026-08-31 (a Monday).
  function istInstant(hhmm: string): Date {
    const [h, m] = hhmm.split(":").map(Number);
    const localAsUtcMs = Date.UTC(2026, 7, 31, h, m); // treat the wall-clock numbers as UTC first...
    return new Date(localAsUtcMs + IST_OFFSET_MINUTES * 60000); // ...then shift to the real UTC instant
  }

  const wideHours = [{ dayOfWeek: 1, openTime: "07:00", closeTime: "22:00" }]; // Monday, matches the report

  it("TEST 1: 07:41 -> 12:41 IST is available (this is the exact bug report)", () => {
    expect(isWithinOperatingWindow(wideHours, istInstant("07:41"), istInstant("12:41"), IST_OFFSET_MINUTES)).toBe(
      true
    );
  });

  it("TEST 2: 07:00 -> 12:00 is valid (opening boundary, inclusive)", () => {
    expect(isWithinOperatingWindow(wideHours, istInstant("07:00"), istInstant("12:00"), IST_OFFSET_MINUTES)).toBe(
      true
    );
  });

  it("TEST 3: 06:59 -> 12:00 is invalid (one minute before opening)", () => {
    expect(isWithinOperatingWindow(wideHours, istInstant("06:59"), istInstant("12:00"), IST_OFFSET_MINUTES)).toBe(
      false
    );
  });

  it("TEST 4: 08:00 -> 22:00 is valid (closing boundary, inclusive)", () => {
    expect(isWithinOperatingWindow(wideHours, istInstant("08:00"), istInstant("22:00"), IST_OFFSET_MINUTES)).toBe(
      true
    );
  });

  it("TEST 5: 08:00 -> 22:01 is invalid (one minute after closing)", () => {
    expect(isWithinOperatingWindow(wideHours, istInstant("08:00"), istInstant("22:01"), IST_OFFSET_MINUTES)).toBe(
      false
    );
  });

  it("without the offset (old behavior), the same real booking is wrongly rejected", () => {
    // Documents the bug itself: omitting clientUtcOffsetMinutes falls back
    // to reading the raw UTC instant, which for a customer at UTC+5:30 is
    // 5.5 hours earlier than their real wall clock - 07:41 local looks like
    // 02:11, outside 07:00-22:00.
    expect(isWithinOperatingWindow(wideHours, istInstant("07:41"), istInstant("12:41"))).toBe(false);
  });

  it("TEST 6: a different storage location's own (different) hours are used", () => {
    const storageA = [{ dayOfWeek: 1, openTime: "07:00", closeTime: "22:00" }];
    const storageB = [{ dayOfWeek: 1, openTime: "08:00", closeTime: "20:00" }];
    const storageC = [{ dayOfWeek: 1, openTime: "10:00", closeTime: "23:00" }];

    // 07:30 is within Storage A's hours but before Storage B's and Storage C's.
    expect(isWithinOperatingWindow(storageA, istInstant("07:30"), istInstant("09:00"), IST_OFFSET_MINUTES)).toBe(
      true
    );
    expect(isWithinOperatingWindow(storageB, istInstant("07:30"), istInstant("09:00"), IST_OFFSET_MINUTES)).toBe(
      false
    );
    expect(isWithinOperatingWindow(storageC, istInstant("07:30"), istInstant("09:00"), IST_OFFSET_MINUTES)).toBe(
      false
    );

    // 21:30 is within Storage A's and Storage C's hours but after Storage B's closing time.
    expect(isWithinOperatingWindow(storageA, istInstant("20:00"), istInstant("21:30"), IST_OFFSET_MINUTES)).toBe(
      true
    );
    expect(isWithinOperatingWindow(storageB, istInstant("20:00"), istInstant("21:30"), IST_OFFSET_MINUTES)).toBe(
      false
    );
    expect(isWithinOperatingWindow(storageC, istInstant("20:00"), istInstant("21:30"), IST_OFFSET_MINUTES)).toBe(
      true
    );
  });

  it("TEST 7: different days use their own hours, not another day's", () => {
    const weekdayVarying = [
      { dayOfWeek: 1, openTime: "07:00", closeTime: "22:00" }, // Monday
      { dayOfWeek: 2, openTime: "08:00", closeTime: "21:00" }, // Tuesday
      { dayOfWeek: 3, openTime: "09:00", closeTime: "20:00" }, // Wednesday
    ];

    function istInstantOn(month: number, day: number, hhmm: string): Date {
      const [h, m] = hhmm.split(":").map(Number);
      const localAsUtcMs = Date.UTC(2026, month, day, h, m);
      return new Date(localAsUtcMs + IST_OFFSET_MINUTES * 60000);
    }

    // 2026-08-31 = Monday, 2026-09-01 = Tuesday, 2026-09-02 = Wednesday.
    // 07:30 is open on Monday, but Tuesday and Wednesday don't open until
    // 08:00/09:00 - the same clock time must be judged against the
    // correct day's rule, not Monday's, just because Monday is listed first.
    expect(isOpenAt(weekdayVarying, istInstantOn(7, 31, "07:30"), IST_OFFSET_MINUTES)).toBe(true); // Monday
    expect(isOpenAt(weekdayVarying, istInstantOn(8, 1, "07:30"), IST_OFFSET_MINUTES)).toBe(false); // Tuesday
    expect(isOpenAt(weekdayVarying, istInstantOn(8, 2, "07:30"), IST_OFFSET_MINUTES)).toBe(false); // Wednesday

    expect(isOpenAt(weekdayVarying, istInstantOn(8, 1, "08:30"), IST_OFFSET_MINUTES)).toBe(true); // Tuesday, open
    expect(isOpenAt(weekdayVarying, istInstantOn(8, 2, "08:30"), IST_OFFSET_MINUTES)).toBe(false); // Wednesday, not yet open
  });

  it("TEST 8: a booking near midnight does not silently shift to the wrong calendar day", () => {
    // A customer at UTC+5:30 selecting 00:30 local on Tuesday: the raw UTC
    // instant actually falls on Monday evening (19:00 UTC Monday). The fix
    // must still report Tuesday, since that's the day the customer saw.
    const tuesdayEarlyMorning = new Date(Date.UTC(2026, 8, 1, 0, 30) + IST_OFFSET_MINUTES * 60000);
    const mondayOnly = [{ dayOfWeek: 1, openTime: "00:00", closeTime: "23:59" }];
    const tuesdayOnly = [{ dayOfWeek: 2, openTime: "00:00", closeTime: "23:59" }];

    expect(isOpenAt(tuesdayOnly, tuesdayEarlyMorning, IST_OFFSET_MINUTES)).toBe(true);
    expect(isOpenAt(mondayOnly, tuesdayEarlyMorning, IST_OFFSET_MINUTES)).toBe(false);
  });

  it("also works for a westward (behind-UTC) offset, e.g. US Eastern (UTC-4, positive offset minutes)", () => {
    const US_EASTERN_OFFSET_MINUTES = 240; // UTC = local + 240, i.e. local = UTC - 4h
    function usEasternInstant(hhmm: string): Date {
      const [h, m] = hhmm.split(":").map(Number);
      const localAsUtcMs = Date.UTC(2026, 7, 31, h, m);
      return new Date(localAsUtcMs + US_EASTERN_OFFSET_MINUTES * 60000);
    }

    expect(
      isWithinOperatingWindow(wideHours, usEasternInstant("07:41"), usEasternInstant("12:41"), US_EASTERN_OFFSET_MINUTES)
    ).toBe(true);
    expect(
      isWithinOperatingWindow(wideHours, usEasternInstant("06:59"), usEasternInstant("12:00"), US_EASTERN_OFFSET_MINUTES)
    ).toBe(false);
  });
});
