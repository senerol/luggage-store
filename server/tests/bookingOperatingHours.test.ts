import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/config/prisma";
import { hashPassword } from "../src/utils/password";
import { checkAvailability, createBooking } from "../src/services/bookingService";
import { createBookingSchema, availabilityQuerySchema } from "../src/validators/bookingValidators";

/**
 * Reproduces the exact reported bug end-to-end (Zod validation -> service ->
 * operatingHours util -> Postgres), not just the isolated utility function
 * covered in tests/operatingHours.test.ts. A location with 07:00-22:00 hours
 * every day, a customer at UTC+5:30 selecting 07:41 -> 12:41 local time -
 * this must be AVAILABLE, matching what the user saw was wrong in the app.
 */

const IST_OFFSET_MINUTES = -330; // Date.prototype.getTimezoneOffset() for UTC+5:30, as the real browser sends it

function istInstant(daysFromNow: number, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const target = new Date();
  target.setUTCDate(target.getUTCDate() + daysFromNow);
  const localAsUtcMs = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), h, m);
  return new Date(localAsUtcMs + IST_OFFSET_MINUTES * 60000);
}

let partnerUserId: string;
let customerUserId: string;
let locationId: string;

beforeAll(async () => {
  const passwordHash = await hashPassword("Password@123");

  const partnerUser = await prisma.user.create({
    data: { name: "Hours Test Partner", email: `hours-partner-${Date.now()}@test.luggo`, passwordHash, role: "PARTNER" },
  });
  partnerUserId = partnerUser.id;
  const partner = await prisma.storagePartner.create({
    data: { userId: partnerUser.id, businessName: "Hours Test Storage Co.", approved: true },
  });

  const customer = await prisma.user.create({
    data: { name: "Hours Test Customer", email: `hours-customer-${Date.now()}@test.luggo`, passwordHash, role: "CUSTOMER" },
  });
  customerUserId = customer.id;

  const location = await prisma.storageLocation.create({
    data: {
      partnerId: partner.id,
      name: "Operating Hours Test Location",
      description: "Test fixture for the operating-hours timezone bug.",
      address: "Test Address",
      city: "Test City",
      latitude: 28.6315,
      longitude: 77.2167,
      capacityTotal: 40,
      status: "APPROVED",
      operatingHours: {
        create: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, openTime: "07:00", closeTime: "22:00" })),
      },
      priceRules: {
        create: [
          { luggageType: "BACKPACK", pricePerHour: 20 },
          { luggageType: "SMALL_SUITCASE", pricePerHour: 35 },
        ],
      },
    },
  });
  locationId = location.id;
});

afterAll(async () => {
  await prisma.booking.deleteMany({ where: { storageLocationId: locationId } });
  await prisma.storagePriceRule.deleteMany({ where: { storageLocationId: locationId } });
  await prisma.storageOperatingHour.deleteMany({ where: { storageLocationId: locationId } });
  await prisma.storageLocation.delete({ where: { id: locationId } });
  await prisma.storagePartner.deleteMany({ where: { userId: partnerUserId } });
  await prisma.user.deleteMany({ where: { id: { in: [partnerUserId, customerUserId] } } });
  await prisma.$disconnect();
});

describe("operating-hours fix - availability check (real validator + service + DB)", () => {
  it("reports available for the exact reported scenario: 07:41 -> 12:41 IST within 07:00-22:00", async () => {
    const query = availabilityQuerySchema.parse({
      dropoffAt: istInstant(1, "07:41").toISOString(),
      pickupAt: istInstant(1, "12:41").toISOString(),
      bags: 2,
      clientUtcOffsetMinutes: IST_OFFSET_MINUTES,
    });

    const result = await checkAvailability(locationId, query);

    expect(result.withinOperatingHours).toBe(true);
    expect(result.sufficientCapacity).toBe(true);
    expect(result.canBook).toBe(true);
  });

  it("still correctly rejects a genuinely out-of-hours request (06:00 IST, before 07:00 opening)", async () => {
    const query = availabilityQuerySchema.parse({
      dropoffAt: istInstant(1, "06:00").toISOString(),
      pickupAt: istInstant(1, "08:00").toISOString(),
      bags: 1,
      clientUtcOffsetMinutes: IST_OFFSET_MINUTES,
    });

    const result = await checkAvailability(locationId, query);

    expect(result.withinOperatingHours).toBe(false);
    expect(result.canBook).toBe(false);
  });
});

describe("operating-hours fix - booking creation (real validator + service + DB)", () => {
  it("creates a booking for the exact reported scenario instead of throwing", async () => {
    const input = createBookingSchema.parse({
      storageLocationId: locationId,
      dropoffAt: istInstant(2, "07:41").toISOString(),
      pickupAt: istInstant(2, "12:41").toISOString(),
      items: [
        { luggageType: "BACKPACK", quantity: 1 },
        { luggageType: "SMALL_SUITCASE", quantity: 1 },
      ],
      clientUtcOffsetMinutes: IST_OFFSET_MINUTES,
    });

    const booking = await createBooking(customerUserId, input);

    expect(booking.status).toBe("PENDING_PAYMENT");
    // 5 billable hours: 1 backpack (20/hr) + 1 small suitcase (35/hr) = 275 base,
    // matching the pricing example from the report - untouched by this fix.
    expect(Number(booking.baseAmount)).toBe(275);
  });

  it("still rejects (does not silently allow) a booking genuinely outside operating hours", async () => {
    const input = createBookingSchema.parse({
      storageLocationId: locationId,
      dropoffAt: istInstant(3, "05:00").toISOString(),
      pickupAt: istInstant(3, "06:30").toISOString(),
      items: [{ luggageType: "BACKPACK", quantity: 1 }],
      clientUtcOffsetMinutes: IST_OFFSET_MINUTES,
    });

    await expect(createBooking(customerUserId, input)).rejects.toThrow(/operating hours/i);
  });
});
