import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/config/prisma";
import { hashPassword } from "../src/utils/password";
import { createBooking } from "../src/services/bookingService";
import { getAvailableCapacity } from "../src/services/capacityService";
import { AppError } from "../src/utils/AppError";

/**
 * Integration tests for the capacity/overbooking logic described in
 * bookingService.createBooking. These hit a real Postgres database (the one
 * configured in .env) because the behaviour under test - the
 * pg_advisory_xact_lock-based serialization of concurrent booking attempts -
 * only exists at the database level; it cannot be exercised by mocking
 * Prisma. Run `npm run prisma:migrate` against a real (ideally disposable/
 * test) Postgres instance before running `npm test`.
 */

let customerA: string;
let customerB: string;
let storageLocationId: string;
let partnerUserId: string;

const CAPACITY = 5;

beforeAll(async () => {
  const passwordHash = await hashPassword("Password@123");

  const partnerUser = await prisma.user.create({
    data: { name: "Test Partner", email: `partner-${Date.now()}@test.luggo`, passwordHash, role: "PARTNER" },
  });
  partnerUserId = partnerUser.id;
  const partner = await prisma.storagePartner.create({
    data: { userId: partnerUser.id, businessName: "Test Storage Co.", approved: true },
  });

  const location = await prisma.storageLocation.create({
    data: {
      partnerId: partner.id,
      name: "Test Capacity Location",
      description: "A location created only for automated tests.",
      address: "Test Address",
      city: "Test City",
      latitude: 0,
      longitude: 0,
      capacityTotal: CAPACITY,
      status: "APPROVED",
    },
  });
  storageLocationId = location.id;

  await prisma.storageOperatingHour.createMany({
    data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      storageLocationId,
      dayOfWeek,
      openTime: "00:00",
      closeTime: "23:59",
    })),
  });
  await prisma.storagePriceRule.createMany({
    data: [
      { storageLocationId, luggageType: "BACKPACK", pricePerHour: 10 },
      { storageLocationId, luggageType: "LARGE_SUITCASE", pricePerHour: 20 },
    ],
  });

  const custA = await prisma.user.create({
    data: { name: "Customer A", email: `custA-${Date.now()}@test.luggo`, passwordHash, role: "CUSTOMER" },
  });
  const custB = await prisma.user.create({
    data: { name: "Customer B", email: `custB-${Date.now()}@test.luggo`, passwordHash, role: "CUSTOMER" },
  });
  customerA = custA.id;
  customerB = custB.id;
});

afterAll(async () => {
  await prisma.booking.deleteMany({ where: { storageLocationId } });
  await prisma.storagePriceRule.deleteMany({ where: { storageLocationId } });
  await prisma.storageOperatingHour.deleteMany({ where: { storageLocationId } });
  await prisma.storageLocation.delete({ where: { id: storageLocationId } });
  await prisma.storagePartner.deleteMany({ where: { userId: partnerUserId } });
  await prisma.user.deleteMany({ where: { id: { in: [partnerUserId, customerA, customerB] } } });
  await prisma.$disconnect();
});

function window(startHoursFromNow: number, endHoursFromNow: number) {
  const now = Date.now();
  return {
    dropoffAt: new Date(now + startHoursFromNow * 60 * 60 * 1000),
    pickupAt: new Date(now + endHoursFromNow * 60 * 60 * 1000),
  };
}

describe("capacity overlap accounting", () => {
  it("does not count a booking whose interval does not overlap the query window", async () => {
    const { dropoffAt, pickupAt } = window(10, 12);
    await createBooking(customerA, {
      storageLocationId,
      dropoffAt,
      pickupAt,
      items: [{ luggageType: "BACKPACK", quantity: 3 }],
    });

    const nonOverlapping = window(20, 22);
    const available = await getAvailableCapacity(
      prisma,
      storageLocationId,
      CAPACITY,
      nonOverlapping.dropoffAt,
      nonOverlapping.pickupAt
    );
    expect(available).toBe(CAPACITY);
  });

  it("counts a booking that partially overlaps the query window", async () => {
    // Existing: 10-12h from now, 3 bags. Query for 11-13h (overlaps 10-12h) should see 3 used.
    const overlapping = window(11, 13);
    const available = await getAvailableCapacity(
      prisma,
      storageLocationId,
      CAPACITY,
      overlapping.dropoffAt,
      overlapping.pickupAt
    );
    expect(available).toBe(CAPACITY - 3);
  });
});

describe("overbooking prevention", () => {
  it("rejects a booking that would exceed remaining capacity for an overlapping window", async () => {
    const { dropoffAt, pickupAt } = window(30, 32);
    await createBooking(customerA, {
      storageLocationId,
      dropoffAt,
      pickupAt,
      items: [{ luggageType: "BACKPACK", quantity: 4 }],
    });

    await expect(
      createBooking(customerB, {
        storageLocationId,
        dropoffAt: window(31, 33).dropoffAt,
        pickupAt: window(31, 33).pickupAt,
        items: [{ luggageType: "BACKPACK", quantity: 2 }], // 4 + 2 > 5
      })
    ).rejects.toThrow(AppError);
  });

  it("accepts a booking that exactly fills remaining capacity", async () => {
    const booking = await createBooking(customerB, {
      storageLocationId,
      dropoffAt: window(31, 33).dropoffAt,
      pickupAt: window(31, 33).pickupAt,
      items: [{ luggageType: "BACKPACK", quantity: 1 }], // 4 + 1 == 5, exactly full
    });
    expect(booking.status).toBe("PENDING_PAYMENT");
  });

  it("prevents overbooking when two customers race for the last 2 units of capacity", async () => {
    const { dropoffAt, pickupAt } = window(50, 52);
    // Fresh window: full 5-capacity available. Two concurrent requests each
    // for 3 bags (3 + 3 = 6 > 5) - only ONE may succeed.
    const results = await Promise.allSettled([
      createBooking(customerA, {
        storageLocationId,
        dropoffAt,
        pickupAt,
        items: [{ luggageType: "BACKPACK", quantity: 3 }],
      }),
      createBooking(customerB, {
        storageLocationId,
        dropoffAt,
        pickupAt,
        items: [{ luggageType: "BACKPACK", quantity: 3 }],
      }),
    ]);

    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);

    const available = await getAvailableCapacity(prisma, storageLocationId, CAPACITY, dropoffAt, pickupAt);
    expect(available).toBe(CAPACITY - 3); // only the winning booking's 3 bags are held
  });
});
