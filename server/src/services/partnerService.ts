import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { getPendingPayoutAmount } from "./payoutService";

const ACTIVE_BOOKING_STATUSES = ["CONFIRMED", "CHECKED_IN", "IN_STORAGE", "READY_FOR_PICKUP"];

// A booking counts toward partner revenue once it has been paid for -
// PENDING_PAYMENT bookings hold capacity (see capacityService) but are not
// yet money the partner has actually earned.
const PAID_BOOKING_WHERE = { payments: { some: { status: "PAID" as const } } };

async function getPartnerOrThrow(userId: string) {
  const partner = await prisma.storagePartner.findUnique({ where: { userId } });
  if (!partner) throw AppError.forbidden("No partner profile found for this account.");
  return partner;
}

export async function getOwnStorageLocations(userId: string) {
  const partner = await getPartnerOrThrow(userId);
  return prisma.storageLocation.findMany({
    where: { partnerId: partner.id },
    include: { operatingHours: true, priceRules: true, reviews: { select: { rating: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOwnStorageLocationById(userId: string, storageLocationId: string) {
  const partner = await getPartnerOrThrow(userId);
  const location = await prisma.storageLocation.findFirst({
    where: { id: storageLocationId, partnerId: partner.id },
    include: { operatingHours: true, priceRules: true, reviews: true },
  });
  if (!location) throw AppError.notFound("Storage location not found.");
  return location;
}

export async function getBookingsForPartner(userId: string, opts: { status?: string; todayOnly?: boolean } = {}) {
  const partner = await getPartnerOrThrow(userId);
  const locationIds = (
    await prisma.storageLocation.findMany({ where: { partnerId: partner.id }, select: { id: true } })
  ).map((l) => l.id);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return prisma.booking.findMany({
    where: {
      storageLocationId: { in: locationIds },
      ...(opts.status ? { status: opts.status as any } : {}),
      ...(opts.todayOnly ? { dropoffAt: { gte: startOfDay, lte: endOfDay } } : {}),
    },
    include: {
      customer: { select: { name: true, phone: true } },
      storageLocation: { select: { id: true, name: true } },
      items: { include: { luggageItems: true } },
    },
    orderBy: { dropoffAt: "asc" },
  });
}

export async function getDashboard(userId: string) {
  const partner = await getPartnerOrThrow(userId);
  const locations = await prisma.storageLocation.findMany({ where: { partnerId: partner.id } });
  const locationIds = locations.map((l) => l.id);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    todayBookings,
    currentlyStored,
    upcomingPickups,
    todayRevenue,
    monthlyRevenue,
    totalEarnings,
    pendingPayout,
    platformCommissionTaken,
  ] = await Promise.all([
    prisma.booking.count({
      where: { storageLocationId: { in: locationIds }, dropoffAt: { gte: startOfDay, lte: endOfDay } },
    }),
    prisma.booking.count({
      where: { storageLocationId: { in: locationIds }, status: "IN_STORAGE" },
    }),
    prisma.booking.count({
      where: {
        storageLocationId: { in: locationIds },
        status: { in: ["IN_STORAGE", "READY_FOR_PICKUP"] },
        pickupAt: { gte: new Date(), lte: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.booking.aggregate({
      _sum: { partnerEarningsAmount: true },
      where: { storageLocationId: { in: locationIds }, ...PAID_BOOKING_WHERE, createdAt: { gte: startOfDay, lte: endOfDay } },
    }),
    prisma.booking.aggregate({
      _sum: { partnerEarningsAmount: true },
      where: { storageLocationId: { in: locationIds }, ...PAID_BOOKING_WHERE, createdAt: { gte: startOfMonth } },
    }),
    prisma.booking.aggregate({
      _sum: { partnerEarningsAmount: true },
      where: { storageLocationId: { in: locationIds }, ...PAID_BOOKING_WHERE },
    }),
    getPendingPayoutAmount(partner.id),
    prisma.booking.aggregate({
      _sum: { platformCommissionAmount: true },
      where: { storageLocationId: { in: locationIds }, ...PAID_BOOKING_WHERE },
    }),
  ]);

  const totalCapacity = locations.reduce((sum, l) => sum + l.capacityTotal, 0);

  return {
    locationsCount: locations.length,
    totalCapacity,
    todayBookings,
    currentlyStored,
    upcomingPickups,
    todayRevenue: Number(todayRevenue._sum.partnerEarningsAmount ?? 0),
    monthlyRevenue: Number(monthlyRevenue._sum.partnerEarningsAmount ?? 0),
    totalEarnings: Number(totalEarnings._sum.partnerEarningsAmount ?? 0),
    pendingPayout,
    platformCommissionTaken: Number(platformCommissionTaken._sum.platformCommissionAmount ?? 0),
  };
}

export async function getRevenue(userId: string) {
  const partner = await getPartnerOrThrow(userId);
  const locations = await prisma.storageLocation.findMany({
    where: { partnerId: partner.id },
    select: { id: true, name: true },
  });

  const byLocation = await Promise.all(
    locations.map(async (loc) => {
      const sum = await prisma.booking.aggregate({
        _sum: { partnerEarningsAmount: true, platformCommissionAmount: true },
        _count: true,
        where: { storageLocationId: loc.id, ...PAID_BOOKING_WHERE },
      });
      return {
        storageLocationId: loc.id,
        name: loc.name,
        totalEarnings: Number(sum._sum.partnerEarningsAmount ?? 0),
        platformCommission: Number(sum._sum.platformCommissionAmount ?? 0),
        paidBookings: sum._count,
      };
    })
  );

  const pendingPayout = await getPendingPayoutAmount(partner.id);

  return {
    totalEarnings: byLocation.reduce((sum, l) => sum + l.totalEarnings, 0),
    platformCommissionTaken: byLocation.reduce((sum, l) => sum + l.platformCommission, 0),
    pendingPayout,
    byLocation,
  };
}
