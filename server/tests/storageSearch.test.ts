import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";

// Mocked before importing storageService so the module under test picks up
// the mock instead of the real Nominatim-backed singleton - these tests must
// never depend on network access or a live geocoding provider.
vi.mock("../src/services/geocodingService", () => ({
  geocodingService: { geocode: vi.fn() },
}));

import { prisma } from "../src/config/prisma";
import { hashPassword } from "../src/utils/password";
import { searchStorageLocations } from "../src/services/storageService";
import { geocodingService } from "../src/services/geocodingService";

const geocodeMock = vi.mocked(geocodingService.geocode);

// Real-world coordinates (same ones the app's own seed data uses), so
// haversine distances behave exactly as they would against the live app.
const CONNAUGHT_PLACE = { latitude: 28.6315, longitude: 77.2167 };
const INDIA_GATE = { latitude: 28.6129, longitude: 77.2295 }; // ~2.6km from CP
const TOKYO = { latitude: 35.6762, longitude: 139.6503 }; // thousands of km away

// Uniquely suffixed so this fixture's name can never collide with a
// real seeded/demo location of the same name (the app's own seed data
// includes an actual "CP Central Cloakroom") - the exact-name-match test
// below asserts an exact result count, which a same-named row anywhere
// else in the shared test database would silently inflate.
const CP_NAME = `CP Central Cloakroom Test Fixture ${Date.now()}`;

let partnerUserId: string;
let cpLocationId: string;
let indiaGateLocationId: string;

beforeAll(async () => {
  const passwordHash = await hashPassword("Password@123");
  const partnerUser = await prisma.user.create({
    data: { name: "Search Test Partner", email: `search-partner-${Date.now()}@test.luggo`, passwordHash, role: "PARTNER" },
  });
  partnerUserId = partnerUser.id;
  const partner = await prisma.storagePartner.create({
    data: { userId: partnerUser.id, businessName: "Search Test Storage Co.", approved: true },
  });

  const cp = await prisma.storageLocation.create({
    data: {
      partnerId: partner.id,
      name: CP_NAME,
      description: "Test fixture.",
      address: "Inner Circle, Connaught Place, New Delhi",
      city: "New Delhi",
      latitude: CONNAUGHT_PLACE.latitude,
      longitude: CONNAUGHT_PLACE.longitude,
      capacityTotal: 20,
      status: "APPROVED",
      priceRules: { create: [{ luggageType: "BACKPACK", pricePerHour: 20 }] },
    },
  });
  cpLocationId = cp.id;

  const indiaGate = await prisma.storageLocation.create({
    data: {
      partnerId: partner.id,
      name: "India Gate Lawns Storage",
      description: "Test fixture.",
      address: "Rajpath Road, near India Gate, New Delhi",
      city: "New Delhi",
      latitude: INDIA_GATE.latitude,
      longitude: INDIA_GATE.longitude,
      capacityTotal: 20,
      status: "APPROVED",
      priceRules: { create: [{ luggageType: "BACKPACK", pricePerHour: 20 }] },
    },
  });
  indiaGateLocationId = indiaGate.id;
});

afterAll(async () => {
  await prisma.storagePriceRule.deleteMany({ where: { storageLocationId: { in: [cpLocationId, indiaGateLocationId] } } });
  await prisma.storageLocation.deleteMany({ where: { id: { in: [cpLocationId, indiaGateLocationId] } } });
  await prisma.storagePartner.deleteMany({ where: { userId: partnerUserId } });
  await prisma.user.deleteMany({ where: { id: partnerUserId } });
  await prisma.$disconnect();
});

beforeEach(() => {
  geocodeMock.mockReset();
});

function baseQuery(overrides: Partial<Parameters<typeof searchStorageLocations>[0]> = {}) {
  return {
    maxDistanceKm: 15,
    sort: "distance" as const,
    ...overrides,
  };
}

describe("searchStorageLocations - geocoded place search", () => {
  it("resolves the searched place and returns nearby storage with distances, closer/more-relevant first", async () => {
    geocodeMock.mockResolvedValue({ ...CONNAUGHT_PLACE, displayName: "Connaught Place, New Delhi, India" });

    const { results, meta } = await searchStorageLocations(baseQuery({ search: "Connaught Place" }));

    expect(meta.mode).toBe("SEARCHED_LOCATION");
    expect(meta.resolvedLocation?.label).toContain("Connaught Place");

    const ids = results.map((r) => r.id);
    expect(ids).toContain(cpLocationId);
    expect(ids).toContain(indiaGateLocationId);

    const cp = results.find((r) => r.id === cpLocationId)!;
    const indiaGate = results.find((r) => r.id === indiaGateLocationId)!;
    expect(cp.distanceKm).toBeLessThan(1);
    expect(indiaGate.distanceKm).toBeGreaterThan(1);

    // The CP fixture's own address literally contains "Connaught Place"
    // (relevance tier 1) while India Gate Lawns Storage's does not (tier 0),
    // so CP must rank first despite both being within radius.
    expect(ids.indexOf(cpLocationId)).toBeLessThan(ids.indexOf(indiaGateLocationId));
  });

  it("respects maxDistanceKm as the authoritative radius filter", async () => {
    geocodeMock.mockResolvedValue({ ...CONNAUGHT_PLACE, displayName: "Connaught Place, New Delhi, India" });

    const tight = await searchStorageLocations(baseQuery({ search: "Connaught Place", maxDistanceKm: 1 }));
    const tightIds = tight.results.map((r) => r.id);
    expect(tightIds).toContain(cpLocationId);
    expect(tightIds).not.toContain(indiaGateLocationId);

    const wide = await searchStorageLocations(baseQuery({ search: "Connaught Place", maxDistanceKm: 15 }));
    const wideIds = wide.results.map((r) => r.id);
    expect(wideIds).toContain(cpLocationId);
    expect(wideIds).toContain(indiaGateLocationId);
  });

  it("does not leak unrelated storage when the searched place is far from everything", async () => {
    geocodeMock.mockResolvedValue({ ...TOKYO, displayName: "Tokyo, Japan" });

    const { results, meta } = await searchStorageLocations(baseQuery({ search: "Tokyo" }));

    expect(results).toHaveLength(0);
    expect(meta.mode).toBe("SEARCHED_LOCATION");
    expect(meta.resolvedLocation?.label).toContain("Tokyo");
  });

  it("falls back to a name match when geocoding fails but the query is an exact location name", async () => {
    geocodeMock.mockResolvedValue(null);

    const { results, meta } = await searchStorageLocations(baseQuery({ search: CP_NAME }));

    expect(meta.mode).toBe("NAME_MATCH");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(cpLocationId);
    expect(results[0].distanceKm).toBeNull();
  });

  it("reports UNRESOLVED when the query can't be geocoded and matches nothing by name either", async () => {
    geocodeMock.mockResolvedValue(null);

    const { results, meta } = await searchStorageLocations(baseQuery({ search: "xyzrandomplace123" }));

    expect(results).toHaveLength(0);
    expect(meta.mode).toBe("UNRESOLVED");
    expect(meta.resolvedLocation).toBeNull();
  });
});

describe("searchStorageLocations - use my location", () => {
  it("uses the given coordinates directly without calling the geocoder", async () => {
    const { results, meta } = await searchStorageLocations(
      baseQuery({ lat: CONNAUGHT_PLACE.latitude, lng: CONNAUGHT_PLACE.longitude, maxDistanceKm: 1 })
    );

    expect(geocodeMock).not.toHaveBeenCalled();
    expect(meta.mode).toBe("USER_LOCATION");
    const ids = results.map((r) => r.id);
    expect(ids).toContain(cpLocationId);
    expect(ids).not.toContain(indiaGateLocationId);
  });
});

describe("searchStorageLocations - browse mode", () => {
  it("returns all approved locations unfiltered by distance when there's no search or coordinates", async () => {
    const { results, meta } = await searchStorageLocations(baseQuery());

    expect(geocodeMock).not.toHaveBeenCalled();
    expect(meta.mode).toBe("BROWSE");
    const ids = results.map((r) => r.id);
    expect(ids).toContain(cpLocationId);
    expect(ids).toContain(indiaGateLocationId);
    results.forEach((r) => expect(r.distanceKm).toBeNull());
  });
});
