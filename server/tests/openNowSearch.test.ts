import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/config/prisma";
import { hashPassword } from "../src/utils/password";
import { searchStorageLocations } from "../src/services/storageService";

/**
 * Integration coverage for the "Open now" badge + filter, end-to-end through
 * the real search service and a real database - deterministic without
 * needing to fake the system clock, by using operating hours that are
 * unambiguously always-open or always-closed regardless of when this test
 * actually runs.
 */

let partnerUserId: string;
let alwaysOpenId: string;
let alwaysClosedId: string;

beforeAll(async () => {
  const passwordHash = await hashPassword("Password@123");
  const partnerUser = await prisma.user.create({
    data: { name: "Open-Now Test Partner", email: `opennow-partner-${Date.now()}@test.luggo`, passwordHash, role: "PARTNER" },
  });
  partnerUserId = partnerUser.id;
  const partner = await prisma.storagePartner.create({
    data: { userId: partnerUser.id, businessName: "Open-Now Test Storage Co.", approved: true },
  });

  const alwaysOpen = await prisma.storageLocation.create({
    data: {
      partnerId: partner.id,
      name: "Always Open Test Storage",
      description: "Test fixture - open every hour of every day.",
      address: "Test Address",
      city: "Test City",
      latitude: 28.6315,
      longitude: 77.2167,
      capacityTotal: 10,
      status: "APPROVED",
      operatingHours: {
        create: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, openTime: "00:00", closeTime: "23:59" })),
      },
      priceRules: { create: [{ luggageType: "BACKPACK", pricePerHour: 20 }] },
    },
  });
  alwaysOpenId = alwaysOpen.id;

  const alwaysClosed = await prisma.storageLocation.create({
    data: {
      partnerId: partner.id,
      name: "Always Closed Test Storage",
      description: "Test fixture - no operating-hours rows at all, so closed every day.",
      address: "Test Address",
      city: "Test City",
      latitude: 28.6315,
      longitude: 77.2167,
      capacityTotal: 10,
      status: "APPROVED",
      // deliberately no operatingHours rows
      priceRules: { create: [{ luggageType: "BACKPACK", pricePerHour: 20 }] },
    },
  });
  alwaysClosedId = alwaysClosed.id;
});

afterAll(async () => {
  const ids = [alwaysOpenId, alwaysClosedId];
  await prisma.storagePriceRule.deleteMany({ where: { storageLocationId: { in: ids } } });
  await prisma.storageOperatingHour.deleteMany({ where: { storageLocationId: { in: ids } } });
  await prisma.storageLocation.deleteMany({ where: { id: { in: ids } } });
  await prisma.storagePartner.deleteMany({ where: { userId: partnerUserId } });
  await prisma.user.deleteMany({ where: { id: partnerUserId } });
  await prisma.$disconnect();
});

describe("isOpenNow field returned by search", () => {
  it("reports true for a location open every hour, false for one with no hours at all", async () => {
    const { results } = await searchStorageLocations({ maxDistanceKm: 15, sort: "distance" } as any);
    const open = results.find((r) => r.id === alwaysOpenId);
    const closed = results.find((r) => r.id === alwaysClosedId);

    expect(open?.isOpenNow).toBe(true);
    expect(closed?.isOpenNow).toBe(false);
  });
});

describe('"Open now" filter', () => {
  it("excludes the closed location and keeps the always-open one", async () => {
    const { results } = await searchStorageLocations({ maxDistanceKm: 15, sort: "distance", openNow: true } as any);
    const ids = results.map((r) => r.id);

    expect(ids).toContain(alwaysOpenId);
    expect(ids).not.toContain(alwaysClosedId);
  });

  it("without the filter, both appear regardless of open/closed status", async () => {
    const { results } = await searchStorageLocations({ maxDistanceKm: 15, sort: "distance" } as any);
    const ids = results.map((r) => r.id);

    expect(ids).toContain(alwaysOpenId);
    expect(ids).toContain(alwaysClosedId);
  });
});
