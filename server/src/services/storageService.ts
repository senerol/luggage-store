import { z } from "zod";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { haversineDistanceKm } from "../utils/geo";
import { isOpenAt } from "../utils/operatingHours";
import { getAvailableCapacity } from "./capacityService";
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
    isOpenNow: isOpenAt(location.operatingHours, new Date()),
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

export async function searchStorageLocations(query: NearbyQuery) {
  const locations = await prisma.storageLocation.findMany({
    where: {
      status: "APPROVED",
      ...(query.city ? { city: { equals: query.city, mode: "insensitive" } } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { address: { contains: query.search, mode: "insensitive" } },
              { city: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.luggageType ? { priceRules: { some: { luggageType: query.luggageType } } } : {}),
    },
    include: locationWithRelations,
  });

  const now = new Date();
  let results = await Promise.all(
    locations.map(async (loc) => {
      const distanceKm =
        query.lat !== undefined && query.lng !== undefined
          ? haversineDistanceKm(query.lat, query.lng, loc.latitude, loc.longitude)
          : null;
      const availableCapacity = await getAvailableCapacity(prisma, loc.id, loc.capacityTotal, now, now);
      return summarize(loc, distanceKm, availableCapacity);
    })
  );

  if (query.lat !== undefined && query.lng !== undefined) {
    results = results.filter((r) => r.distanceKm === null || r.distanceKm <= query.maxDistanceKm);
  }
  if (query.minPrice !== undefined) {
    results = results.filter((r) => r.priceFrom !== null && r.priceFrom >= query.minPrice!);
  }
  if (query.maxPrice !== undefined) {
    results = results.filter((r) => r.priceFrom !== null && r.priceFrom <= query.maxPrice!);
  }
  if (query.minRating !== undefined) {
    results = results.filter((r) => (r.rating ?? 0) >= query.minRating!);
  }
  if (query.openNow) {
    results = results.filter((r) => r.isOpenNow);
  }

  results.sort((a, b) => {
    if (query.sort === "price") return (a.priceFrom ?? Infinity) - (b.priceFrom ?? Infinity);
    if (query.sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
    return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
  });

  return results;
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
