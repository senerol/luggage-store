import { describe, it, expect } from "vitest";
import { isCurrentlyOpen } from "../src/utils/operatingHours";

const IST = "Asia/Kolkata";

// Builds the real UTC instant corresponding to `hhmm` IST on a given
// 2026-08-3x date, without any fixed-offset arithmetic in the test itself -
// this exercises the exact same Intl-based conversion the implementation
// uses, rather than assuming +5:30 by subtraction.
function istInstant(day: number, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  // 2026-08-31 is a Monday; construct via a UTC instant known to render as
  // the intended IST wall clock, verified against Node's own Intl output.
  return new Date(Date.UTC(2026, 7, day, h, m) - (5 * 60 + 30) * 60000);
}

// Sun=0 ... Sat=6. 2026-08-30 = Sunday, 08-31 = Monday, 09-01 = Tuesday.
const wideHoursAllWeek = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  openTime: "07:00",
  closeTime: "22:00",
}));

describe("isCurrentlyOpen - the reported bug", () => {
  it("03:10 IST is CLOSED for a 07:00-22:00 location (the exact report)", () => {
    expect(isCurrentlyOpen(wideHoursAllWeek, istInstant(31, "03:10"), IST)).toBe(false);
  });

  it("08:00 IST is OPEN", () => {
    expect(isCurrentlyOpen(wideHoursAllWeek, istInstant(31, "08:00"), IST)).toBe(true);
  });

  it("21:59 IST is OPEN", () => {
    expect(isCurrentlyOpen(wideHoursAllWeek, istInstant(31, "21:59"), IST)).toBe(true);
  });

  it("22:00 IST is CLOSED (closing time is exclusive for the open-now check)", () => {
    expect(isCurrentlyOpen(wideHoursAllWeek, istInstant(31, "22:00"), IST)).toBe(false);
  });

  it("a day with no operating-hours row at all is CLOSED", () => {
    const mondayOnly = [{ dayOfWeek: 1, openTime: "07:00", closeTime: "22:00" }];
    // 2026-09-01 is a Tuesday - no rule for it.
    expect(isCurrentlyOpen(mondayOnly, istInstant(32, "10:00"), IST)).toBe(false);
  });
});

describe("isCurrentlyOpen - overnight hours (22:00-02:00)", () => {
  // A single Monday rule spanning midnight into Tuesday.
  const overnightMonday = [{ dayOfWeek: 1, openTime: "22:00", closeTime: "02:00" }];

  it("23:00 Monday is OPEN (within the pre-midnight portion)", () => {
    expect(isCurrentlyOpen(overnightMonday, istInstant(31, "23:00"), IST)).toBe(true);
  });

  it("01:00 Tuesday is OPEN (within the post-midnight spillover from Monday's rule)", () => {
    expect(isCurrentlyOpen(overnightMonday, istInstant(32, "01:00"), IST)).toBe(true);
  });

  it("03:00 Tuesday is CLOSED (past the 02:00 overnight closing time)", () => {
    expect(isCurrentlyOpen(overnightMonday, istInstant(32, "03:00"), IST)).toBe(false);
  });

  it("21:00 Monday is CLOSED (before the 22:00 overnight opening time)", () => {
    expect(isCurrentlyOpen(overnightMonday, istInstant(31, "21:00"), IST)).toBe(false);
  });

  it("an overnight rule on one day does not leak into an unrelated day two days later", () => {
    // Wednesday (dayOfWeek 3) has no rule at all; only Monday's overnight
    // rule spills into Tuesday, never Wednesday.
    expect(isCurrentlyOpen(overnightMonday, istInstant(33, "01:00"), IST)).toBe(false);
  });
});

describe("isCurrentlyOpen - timezone correctness", () => {
  it("the same real instant is judged differently depending on which timezone is used", () => {
    // 03:10 IST is 21:40 UTC the previous day - well inside a naive
    // 07:00-22:00 UTC reading, which is exactly the bug: using UTC instead
    // of the storage's own timezone silently reports "open".
    const instant = istInstant(31, "03:10");
    expect(isCurrentlyOpen(wideHoursAllWeek, instant, IST)).toBe(false);
    expect(isCurrentlyOpen(wideHoursAllWeek, instant, "UTC")).toBe(true);
  });
});
