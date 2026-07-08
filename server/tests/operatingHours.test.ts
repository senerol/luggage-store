import { describe, it, expect } from "vitest";
import { isOpenAt, isWithinOperatingWindow } from "../src/utils/operatingHours";

// Sunday=0 ... Saturday=6, matches Date#getDay()
const hours = [
  { dayOfWeek: 1, openTime: "09:00", closeTime: "21:00" }, // Monday only, for this test
];

function mondayAt(hhmm: string): Date {
  // 2026-01-05 is a Monday
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(2026, 0, 5, h, m);
}

describe("isOpenAt", () => {
  it("is closed on a day with no operating-hours row", () => {
    const tuesday = new Date(2026, 0, 6, 12, 0);
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
