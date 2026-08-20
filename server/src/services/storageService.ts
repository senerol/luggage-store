import { z } from "zod";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { haversineDistanceKm } from "../utils/geo";
import { isCurrentlyOpen } from "../utils/operatingHours";
import { STORAGE_TIMEZONE } from "../config/constants";
import { getAvailableCapacity } from "./capacityService";
import { geocodingService } from "./geocodingService";
import { createStorageSchema, updateStorageSchema, nearbyQuerySchema } from "../validators/storageValidators";

type CreateInput = z.infer<typeof createStorageSchema>;
type UpdateInput = z.infer<typeof updateStorageSchema>;
type NearbyQuery = z.infer<typeof nearbyQuerySchema>;

const locationWithRelations = {
  operatingHours: true,
  priceRules: true,
  reviews: { select: { rating: true } },
  partner: { select: { id: true, businessName: true, approved: true } },
} as const;

function summarize(location: any, distanceKm: number | null, availableCapacity: number) {
  const ratingCount = location.reviews.length;
  const avgRating = ratingCount
    ? location.reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / ratingCount
    : null;
  const priceFrom = location.priceRules.length
    ? Math.min(...location.priceRules.map((p: any) => Number(p.pricePerHour)))
    : null;

  return {
    id: location.id,
    name: location.name,
    description: location.description,
    address: location.address,
    city: location.city,
    latitude: location.latitude,
    longitude: location.longitude,
    photos: location.photos,
    capacityTotal: location.capacityTotal,
    availableCapacity,
    status: location.status,
    distanceKm: distanceKm !== null ? Math.round(distanceKm * 10) / 10 : null,
    rating: avgRating !== null ? Math.round(avgRating * 10) / 10 : null,
    reviewCount: ratingCount,
    priceFrom,
    isOpenNow: isCurrentlyOpen(location.operatingHours, new Date(), STORAGE_TIMEZONE),
    operatingHours: location.operatingHours.map((h: any) => ({
      dayOfWeek: h.dayOfWeek,
      openTime: h.openTime,
      closeTime: h.closeTime,
    })),
    priceRules: location.priceRules.map((p: any) => ({
      luggageType: p.luggageType,
      pricePerHour: Number(p.pricePerHour),
    })),
    partner: location.partner,
    createdAt: location.createdAt,
  };
}

export interface SearchLocationMeta {
  label: string;
  latitude: number;
  longitude: number;
}

export type SearchMode = "BROWSE" | "USER_LOCATION" | "SEARCHED_LOCATION" | "NAME_MATCH" | "UNRESOLVED";

export interface SearchMeta {
  mode: SearchMode;
  /** The point distances were measured from, if any - lets the frontend drop
   *  a distinct pin for "the place you searched" vs. storage markers. */
  resolvedLocation: SearchLocationMeta | null;
}

/**
 * Text-relevance tier for ranking, independent of geography:
 *   3 = search text exactly matches the location's name
 *   2 = name contains the search text
 *   1 = address or city contains the search text
 *   0 = no textual match at all
 * A location can be "relevant" (tier > 0) without ever being geocoded -
 * e.g. searching a storage location's own business name, which a real-world
 * geocoder has never heard of and never will.
 */
export function textRelevanceTier(search: string | undefined, loc: { name: string; address: string; city: string }): number {
  if (!search) return 0;
  const q = search.trim().toLowerCase();
  if (!q) return 0;
  const name = loc.name.toLowerCase();
  if (name === q) return 3;
  if (name.includes(q)) return 2;
  if (loc.address.toLowerCase().includes(q) || loc.city.toLowerCase().includes(q)) return 1;
  return 0;
}

/**
 * The search flow, in order:
 *
 *   1. Work out the reference point for "distance", if any:
 *        - lat/lng given (the "Use my location" button) -> use them directly,
 *          no geocoding involved.
 *        - free-text `search` given, no lat/lng -> geocode it (see
 *          geocodingService) to turn "Connaught Place, Delhi" into real
 *          coordinates.
 *        - neither -> no reference point; this is the plain browse-all mode
 *          the app already had before this feature, and its behavior is
 *          untouched below.
 *   2. Load every APPROVED location (existing city/luggageType filters still
 *      apply at the DB level, unchanged), compute each one's distance from
 *      the reference point (if any) and its text-relevance tier.
 *   3. Decide the final candidate set:
 *        - a reference point exists -> keep locations within maxDistanceKm
 *          of it (the authoritative, server-side distance filter - the
 *          client only ever supplies the *radius*, never a distance value).
 *        - PLUS: any location with a real text-relevance match is kept even
 *          if it fell outside that radius (handles searching a storage's own
 *          name, which may not be a real geocodable place at all).
 *        - if that combined set is empty but text-relevance matches exist
 *          on their own (typically because geocoding the query failed, or
 *          it geocoded to somewhere with nothing nearby), fall back to just
 *          the text matches - still a "found something" outcome.
 *        - otherwise, nothing at all: the caller gets an empty result plus
 *          a `meta.mode` that distinguishes "we resolved a place but there's
 *          nothing near it" from "we couldn't resolve this location" from
 *          the frontend's error-copy switch.
 *   4. Apply the existing price/rating/open-now filters (unchanged).
 *   5. Sort: when the user typed a search, relevance tier wins first, then a
 *      coarse 2km distance "band" (so proximity matters before it), then the
 *      user's chosen sort as the final tiebreaker. Without a typed search,
 *      sorting is exactly what it was before this feature existed.
 */
export async function searchStorageLocations(query: NearbyQuery): Promise<{ results: ReturnType<typeof summarize>[]; meta: SearchMeta }> {
  const hasSearch = !!query.search;
  const hasCoords = query.lat !== undefined && query.lng !== undefined;

  let referencePoint: { latitude: number; longitude: number } | null = null;
  let referenceLabel: string | null = null;
  let mode: SearchMode = "BROWSE";

  if (hasCoords) {
    referencePoint = { latitude: query.lat!, longitude: query.lng! };
    referenceLabel = "Your current location";
    mode = "USER_LOCATION";
  } else if (hasSearch) {
    const geocoded = await geocodingService.geocode(query.search!);
    if (geocoded) {
      referencePoint = { latitude: geocoded.latitude, longitude: geocoded.longitude };
      referenceLabel = query.search!;
      mode = "SEARCHED_LOCATION";
    } else {
      mode = "UNRESOLVED";
    }
  }

  const locations = await prisma.storageLocation.findMany({
    where: {
      status: "APPROVED",
      ...(query.city ? { city: { equals: query.city, mode: "insensitive" } } : {}),
      ...(query.luggageType ? { priceRules: { some: { luggageType: query.luggageType } } } : {}),
    },
    include: locationWithRelations,
  });

  const now = new Date();
  const withDistanceAndRelevance = await Promise.all(
    locations.map(async (loc) => {
      const distanceKm = referencePoint
        ? haversineDistanceKm(referencePoint.latitude, referencePoint.longitude, loc.latitude, loc.longitude)
        : null;
      const availableCapacity = await getAvailableCapacity(prisma, loc.id, loc.capacityTotal, now, now);
      return {
        ...summarize(loc, distanceKm, availableCapacity),
        relevanceTier: textRelevanceTier(query.search, loc),
      };
    })
  );

  let candidates = withDistanceAndRelevance;

  if (mode === "USER_LOCATION") {
    candidates = candidates.filter((r) => r.distanceKm === null || r.distanceKm <= query.maxDistanceKm);
  } else if (mode === "SEARCHED_LOCATION" || mode === "UNRESOLVED") {
    const withinRadius =
      mode === "SEARCHED_LOCATION"
        ? candidates.filter((r) => r.distanceKm !== null && r.distanceKm <= query.maxDistanceKm)
        : [];
    const nameMatches = candidates.filter((r) => r.relevanceTier > 0);

    if (withinRadius.length > 0) {
      const idsInRadius = new Set(withinRadius.map((r) => r.id));
      candidates = [...withinRadius, ...nameMatches.filter((r) => !idsInRadius.has(r.id))];
      // mode stays SEARCHED_LOCATION
    } else if (nameMatches.length > 0) {
      candidates = nameMatches;
      mode = "NAME_MATCH";
      referencePoint = null; // these matched by name, not by geography - don't imply a distance origin
      referenceLabel = null;
    } else {
      candidates = [];
      // mode stays SEARCHED_LOCATION (resolved but empty) or UNRESOLVED (never resolved)
    }
  }

  if (query.minPrice !== undefined) {
    candidates = candidates.filter((r) => r.priceFrom !== null && r.priceFrom >= query.minPrice!);
  }
  if (query.maxPrice !== undefined) {
    candidates = candidates.filter((r) => r.priceFrom !== null && r.priceFrom <= query.maxPrice!);
  }
  if (query.minRating !== undefined) {
    candidates = candidates.filter((r) => (r.rating ?? 0) >= query.minRating!);
  }
  if (query.openNow) {
    candidates = candidates.filter((r) => r.isOpenNow);
  }

  const rankBySearch = hasSearch;
  candidates.sort((a, b) => {
    if (rankBySearch) {
      if (b.relevanceTier !== a.relevanceTier) return b.relevanceTier - a.relevanceTier;
      if (referencePoint) {
        const bandWidthKm = 2;
        const bandA = a.distanceKm === null ? Infinity : Math.floor(a.distanceKm / bandWidthKm);
        const bandB = b.distanceKm === null ? Infinity : Math.floor(b.distanceKm / bandWidthKm);
        if (bandA !== bandB) return bandA - bandB;
      }
    }
    if (query.sort === "price") return (a.priceFrom ?? Infinity) - (b.priceFrom ?? Infinity);
    if (query.sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
    return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
  });

  const results = candidates.map(({ relevanceTier: _relevanceTier, ...rest }) => rest);

  return {
    results,
    meta: {
      mode,
      resolvedLocation: referencePoint && referenceLabel ? { label: referenceLabel, ...referencePoint } : null,
    },
  };
}

export async function getStorageLocationById(id: string) {
  const location = await prisma.storageLocation.findUnique({
    where: { id },
    include: locationWithRelations,
  });
  if (!location || location.status !== "APPROVED") {
    throw AppError.notFound("Storage location not found.");
  }
  const now = new Date();
  const availableCapacity = await getAvailableCapacity(prisma, location.id, location.capacityTotal, now, now);
  return summarize(location, null, availableCapacity);
}

export async function createStorageLocation(userId: string, input: CreateInput) {
  const partner = await prisma.storagePartner.findUnique({ where: { userId } });
  if (!partner) throw AppError.forbidden("Only registered storage partners can create locations.");

  const location = await prisma.storageLocation.create({
    data: {
      partnerId: partner.id,
      name: input.name,
      description: input.description,
      address: input.address,
      city: input.city,
      latitude: input.latitude,
      longitude: input.longitude,
      photos: input.photos,
      capacityTotal: input.capacityTotal,
      operatingHours: { create: input.operatingHours },
      priceRules: { create: input.priceRules },
    },
    include: locationWithRelations,
  });
  return summarize(location, null, location.capacityTotal);
}

async function assertOwnership(userId: string, storageLocationId: string) {
  const location = await prisma.storageLocation.findUnique({
    where: { id: storageLocationId },
    include: { partner: true },
  });
  if (!location) throw AppError.notFound("Storage location not found.");
  if (location.partner.userId !== userId) {
    throw AppError.forbidden("You do not own this storage location.");
  }
  return location;
}

export async function updateStorageLocation(userId: string, storageLocationId: string, input: UpdateInput) {
  await assertOwnership(userId, storageLocationId);

  const { operatingHours, priceRules, ...rest } = input;

  const location = await prisma.$transaction(async (tx) => {
    if (operatingHours) {
      await tx.storageOperatingHour.deleteMany({ where: { storageLocationId } });
      await tx.storageOperatingHour.createMany({
        data: operatingHours.map((h) => ({ ...h, storageLocationId })),
      });
    }
    if (priceRules) {
      await tx.storagePriceRule.deleteMany({ where: { storageLocationId } });
      await tx.storagePriceRule.createMany({
        data: priceRules.map((p) => ({ ...p, storageLocationId })),
      });
    }
    return tx.storageLocation.update({
      where: { id: storageLocationId },
      data: rest,
      include: locationWithRelations,
    });
  });

  const now = new Date();
  const availableCapacity = await getAvailableCapacity(prisma, location.id, location.capacityTotal, now, now);
  return summarize(location, null, availableCapacity);
}

export async function setStorageDisabled(userId: string, storageLocationId: string, disabled: boolean) {
  await assertOwnership(userId, storageLocationId);
  const location = await prisma.storageLocation.update({
    where: { id: storageLocationId },
    data: { status: disabled ? "DISABLED" : "APPROVED" },
  });
  return location;
}

export async function deleteStorageLocation(userId: string, storageLocationId: string) {
  await assertOwnership(userId, storageLocationId);
  const activeBookings = await prisma.booking.count({
    where: {
      storageLocationId,
      status: { in: ["PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN", "IN_STORAGE", "READY_FOR_PICKUP"] },
    },
  });
  if (activeBookings > 0) {
    throw AppError.conflict("Cannot delete a storage location with active bookings. Disable it instead.");
  }
  await prisma.storageLocation.delete({ where: { id: storageLocationId } });
}
