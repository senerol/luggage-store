import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { prisma } from "../src/config/prisma";
import { hashPassword } from "../src/utils/password";
import { createBooking } from "../src/services/bookingService";
import { verifyAndProcessQr } from "../src/services/qrService";
import { formatInTimeZone } from "../src/utils/operatingHours";
import { STORAGE_TIMEZONE, CHECK_IN_EARLY_WINDOW_MINUTES } from "../src/config/constants";
import { AppError } from "../src/utils/AppError";

/**
 * Integration tests for verifyAndProcessQr's check-in eligibility window
 * (server/src/services/qrService.ts). Reproduces the reported bug: a
 * partner scanning a genuinely-too-early booking saw a "Check-in opens at"
 * message rendered in the server process's own timezone (UTC, inside this
 * project's Docker containers) with no timezone label, which a partner in
 * India misread as their own local time - making a correct rejection look
 * wrong by roughly 5:30 (the IST offset). The underlying now-vs-windowStart
 * comparison was always a correct, timezone-independent instant comparison;
 * only the human-readable message needed fixing (see formatInTimeZone).
 */

let customerId: string;
let partnerUserId: string;
let storageLocationId: string;

beforeAll(async () => {
  const passwordHash = await hashPassword("Password@123");

  const partnerUser = await prisma.user.create({
    data: { name: "Test Checkin Partner", email: `checkin-partner-${Date.now()}@test.luggo`, passwordHash, role: "PARTNER" },
  });
  partnerUserId = partnerUser.id;
  const partner = await prisma.storagePartner.create({
    data: { userId: partnerUser.id, businessName: "Test Checkin Storage Co.", approved: true },
  });

  const location = await prisma.storageLocation.create({
    data: {
      partnerId: partner.id,
      name: "Test Checkin Location",
      description: "A location created only for automated tests.",
      address: "Test Address",
      city: "Test City",
      latitude: 0,
      longitude: 0,
      capacityTotal: 50,
      status: "APPROVED",
    },
  });
  storageLocationId = location.id;

  // Wide-open hours so booking creation itself never fails the operating-hours check.
  await prisma.storageOperatingHour.createMany({
    data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      storageLocationId,
      dayOfWeek,
      openTime: "00:00",
      closeTime: "23:59",
    })),
  });
  await prisma.storagePriceRule.createMany({
    data: [{ storageLocationId, luggageType: "BACKPACK", pricePerHour: 10 }],
  });

  const customer = await prisma.user.create({
    data: { name: "Test Checkin Customer", email: `checkin-cust-${Date.now()}@test.luggo`, passwordHash, role: "CUSTOMER" },
  });
  customerId = customer.id;
});

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { userId: customerId } });
  await prisma.booking.deleteMany({ where: { storageLocationId } });
  await prisma.storagePriceRule.deleteMany({ where: { storageLocationId } });
  await prisma.storageOperatingHour.deleteMany({ where: { storageLocationId } });
  await prisma.storageLocation.delete({ where: { id: storageLocationId } });
  await prisma.storagePartner.deleteMany({ where: { userId: partnerUserId } });
  await prisma.user.deleteMany({ where: { id: { in: [partnerUserId, customerId] } } });
  await prisma.$disconnect();
});

// Creates a CONFIRMED booking with a drop-off `dropoffHoursFromNow` hours from
// the real current instant, independent of whatever calendar date/time it
// actually is when the suite runs (mirrors booking.capacity.test.ts's pattern).
async function createConfirmedBooking(dropoffHoursFromNow: number) {
  const now = Date.now();
  const dropoffAt = new Date(now + dropoffHoursFromNow * 60 * 60 * 1000);
  const pickupAt = new Date(dropoffAt.getTime() + 3 * 60 * 60 * 1000);

  const booking = await createBooking(customerId, {
    storageLocationId,
    dropoffAt,
    pickupAt,
    items: [{ luggageType: "BACKPACK", quantity: 1 }],
    clientUtcOffsetMinutes: 0,
  });

  return prisma.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED" } });
}

describe("check-in QR eligibility window", () => {
  it("rejects check-in strictly before the window opens", async () => {
    // Drop-off 2h from now -> window opens 1h from now -> still too early.
    const booking = await createConfirmedBooking(2);

    await expect(verifyAndProcessQr(partnerUserId, booking.qrCheckinToken)).rejects.toThrow(/Too early to check in/);

    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(reloaded.status).toBe("CONFIRMED");
    expect(reloaded.checkinUsedAt).toBeNull();
  });

  it("accepts check-in once the window has opened", async () => {
    // Drop-off 30 min from now -> window opened 30 min ago (60min buffer) -> eligible now.
    const booking = await createConfirmedBooking(0.5);

    const result = await verifyAndProcessQr(partnerUserId, booking.qrCheckinToken);

    expect(result.status).toBe("IN_STORAGE");
    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(reloaded.status).toBe("IN_STORAGE");
    expect(reloaded.checkinUsedAt).not.toBeNull();
  });

  it("accepts check-in exactly at the window boundary (drop-off minus the buffer)", async () => {
    // dropoffAt - CHECK_IN_EARLY_WINDOW_MINUTES should be <= now, i.e. eligible.
    // Push drop-off 1 minute past the buffer so this doesn't flake on slow CI ticks.
    const dropoffHours = (CHECK_IN_EARLY_WINDOW_MINUTES - 1) / 60;
    const booking = await createConfirmedBooking(dropoffHours);

    const result = await verifyAndProcessQr(partnerUserId, booking.qrCheckinToken);
    expect(result.status).toBe("IN_STORAGE");
  });

  it("correctly compares across a calendar day boundary (drop-off >24h out)", async () => {
    // Drop-off 25h from now -> window opens 24h from now -> still too early,
    // and must stay rejected purely from getTime() arithmetic, regardless of
    // what calendar date the window's instant happens to fall on.
    const booking = await createConfirmedBooking(25);

    await expect(verifyAndProcessQr(partnerUserId, booking.qrCheckinToken)).rejects.toThrow(/Too early to check in/);
  });

  it("renders the 'too early' message in the storage location's timezone, not the server process's", async () => {
    const booking = await createConfirmedBooking(2);
    const windowStart = new Date(booking.dropoffAt.getTime() - CHECK_IN_EARLY_WINDOW_MINUTES * 60 * 1000);
    const expectedLocalTime = formatInTimeZone(windowStart, STORAGE_TIMEZONE);

    try {
      await verifyAndProcessQr(partnerUserId, booking.qrCheckinToken);
      expect.unreachable("expected a too-early AppError");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const message = (err as AppError).message;
      expect(message).toContain(expectedLocalTime);
      expect(message).toContain("IST");
    }
  });

  it("leaves check-out behaviour unaffected by the check-in window fix", async () => {
    // Drop-off already open, so we can check in first, then check out.
    const booking = await createConfirmedBooking(0);
    const checkedIn = await verifyAndProcessQr(partnerUserId, booking.qrCheckinToken);
    expect(checkedIn.status).toBe("IN_STORAGE");

    const checkedOut = await verifyAndProcessQr(partnerUserId, booking.qrCheckoutToken);
    expect(checkedOut.status).toBe("COLLECTED");

    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(reloaded.status).toBe("COLLECTED");
    expect(reloaded.checkoutUsedAt).not.toBeNull();
  });
});

// vitest's fake timers (via @sinonjs/fake-timers) let us pin `new Date()` to
// an exact instant of our choosing without touching the real system/Docker
// clock, so "current time is before/after the check-in window" can be
// tested deterministically and instantly instead of waiting for the real
// clock to reach a booking's actual window-open time. Only `Date` is faked
// (`toFake: ["Date"]`) - setTimeout/setInterval stay real so Prisma's
// underlying connection/query machinery is unaffected. verifyAndProcessQr
// itself is untouched: it still calls plain `new Date()` exactly as in
// production, so this exercises the real production comparison, just with
// a controlled clock reading it.
describe("check-in QR eligibility window - deterministic fake-clock tests", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects as 'Too early' when the mocked current time is before the check-in window opens", async () => {
    // Booking created under the real clock, same as every other test here;
    // only the clock read *inside verifyAndProcessQr* gets mocked below.
    const booking = await createConfirmedBooking(3);
    const windowStart = new Date(booking.dropoffAt.getTime() - CHECK_IN_EARLY_WINDOW_MINUTES * 60 * 1000);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(windowStart.getTime() - 60 * 1000)); // 1 minute before window opens

    await expect(verifyAndProcessQr(partnerUserId, booking.qrCheckinToken)).rejects.toThrow(/Too early to check in/);

    vi.useRealTimers();
    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(reloaded.status).toBe("CONFIRMED");
    expect(reloaded.checkinUsedAt).toBeNull();
  });

  it("accepts check-in when the mocked current time is after the check-in window opens", async () => {
    const booking = await createConfirmedBooking(3);
    const windowStart = new Date(booking.dropoffAt.getTime() - CHECK_IN_EARLY_WINDOW_MINUTES * 60 * 1000);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(windowStart.getTime() + 60 * 1000)); // 1 minute after window opens

    const result = await verifyAndProcessQr(partnerUserId, booking.qrCheckinToken);
    expect(result.status).toBe("IN_STORAGE");

    vi.useRealTimers();
    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(reloaded.status).toBe("IN_STORAGE");
    expect(reloaded.checkinUsedAt).not.toBeNull();
  });

  it("mocked-clock 'too early' message still converts to the storage location's IST timezone correctly", async () => {
    // Directly mirrors the real reported booking's numbers: dropoffAt
    // 2026-08-31T04:56:00Z -> windowStart 2026-08-31T03:56:00Z (UTC) ->
    // must render as 9:26:00 AM IST, not the raw "3:56:00 AM" UTC figure.
    const booking = await createConfirmedBooking(3);
    const windowStart = new Date(booking.dropoffAt.getTime() - CHECK_IN_EARLY_WINDOW_MINUTES * 60 * 1000);
    const expectedLocalTime = formatInTimeZone(windowStart, STORAGE_TIMEZONE);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(windowStart.getTime() - 5 * 60 * 1000)); // 5 minutes before window opens

    try {
      await verifyAndProcessQr(partnerUserId, booking.qrCheckinToken);
      expect.unreachable("expected a too-early AppError");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const message = (err as AppError).message;
      // Regression guard: if this ever reverted to windowStart.toLocaleString()
      // (server-process-local, i.e. UTC in Docker, with no timezone label),
      // there would be no "IST" in the message and the hour would be off by
      // 5:30 from expectedLocalTime - either assertion below would fail.
      expect(message).toContain(expectedLocalTime);
      expect(message).toContain("IST");
    }

    vi.useRealTimers();
  });
});

describe("formatInTimeZone", () => {
  it("converts a UTC instant to the correct Asia/Kolkata (IST, UTC+5:30) wall-clock time", () => {
    // 2026-08-31T03:56:00.000Z + 5:30 = 2026-08-31 09:26:00 local.
    const instant = new Date("2026-08-31T03:56:00.000Z");
    const formatted = formatInTimeZone(instant, "Asia/Kolkata");
    expect(formatted).toBe("8/31/2026, 9:26:00 AM");
  });
});
