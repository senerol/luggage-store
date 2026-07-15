import { z } from "zod";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { generateBookingCode, generateQrToken, generateTagCode } from "../utils/ids";
import { isWithinOperatingWindow } from "../utils/operatingHours";
import { getAvailableCapacity, getUsedCapacity } from "./capacityService";
import { calculatePrice, splitCommission } from "./pricingService";
import { getCommissionPercent } from "./platformConfigService";
import { assertTransition, canCancel } from "./bookingStateMachine";
import { PENDING_PAYMENT_TTL_MINUTES } from "../config/constants";
import { createBookingSchema, availabilityQuerySchema } from "../validators/bookingValidators";

type CreateBookingInput = z.infer<typeof createBookingSchema>;
type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

const bookingInclude = {
  storageLocation: { include: { partner: true } },
  items: { include: { luggageItems: true } },
  payments: true,
} satisfies Prisma.BookingInclude;

/**
 * Frees capacity held by PENDING_PAYMENT bookings that have sat unpaid for
 * too long. Run inside the same transaction as, and immediately before, any
 * capacity check for the given location so the freed-up bags are visible to
 * that check. This is what handles edge case "customer pays but browser
 * closes" / "payment silently never completes".
 */
async function expireStaleBookings(tx: Prisma.TransactionClient, storageLocationId: string) {
  const cutoff = new Date(Date.now() - PENDING_PAYMENT_TTL_MINUTES * 60 * 1000);
  await tx.booking.updateMany({
    where: { storageLocationId, status: "PENDING_PAYMENT", createdAt: { lt: cutoff } },
    data: { status: "EXPIRED" },
  });
}

export async function checkAvailability(storageLocationId: string, query: AvailabilityQuery) {
  const location = await prisma.storageLocation.findUnique({
    where: { id: storageLocationId },
    include: { operatingHours: true },
  });
  if (!location || location.status !== "APPROVED") {
    throw AppError.notFound("Storage location not found.");
  }

  await prisma.$transaction((tx) => expireStaleBookings(tx, storageLocationId));

  const withinHours = isWithinOperatingWindow(
    location.operatingHours,
    query.dropoffAt,
    query.pickupAt,
    query.clientUtcOffsetMinutes
  );
  const available = await getAvailableCapacity(
    prisma,
    storageLocationId,
    location.capacityTotal,
    query.dropoffAt,
    query.pickupAt
  );

  return {
    storageLocationId,
    capacityTotal: location.capacityTotal,
    availableCapacity: available,
    requestedBags: query.bags,
    sufficientCapacity: available >= query.bags,
    withinOperatingHours: withinHours,
    canBook: available >= query.bags && withinHours,
  };
}

/**
 * Creates a booking in PENDING_PAYMENT status.
 *
 * Concurrency: capacity is checked and the booking is inserted inside one
 * Postgres transaction that begins by taking a per-storage-location
 * advisory lock (pg_advisory_xact_lock). Advisory locks are session-scoped
 * and automatically released when the transaction ends, so this simply
 * serializes "check capacity, then reserve it" for one location at a time -
 * a second request for the SAME location blocks until the first commits (or
 * rolls back), at which point it re-reads an up-to-date capacity figure.
 * Requests for DIFFERENT locations never block each other. This is what
 * prevents two customers from both grabbing the last 2 bags of capacity
 * simultaneously (edge case #2 in the spec).
 */
export async function createBooking(userId: string, input: CreateBookingInput) {
  const totalBags = input.items.reduce((sum, i) => sum + i.quantity, 0);

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.storageLocationId}))`;

    const location = await tx.storageLocation.findUnique({
      where: { id: input.storageLocationId },
      include: { operatingHours: true, priceRules: true },
    });
    if (!location || location.status !== "APPROVED") {
      throw AppError.notFound("Storage location not found or not accepting bookings.");
    }

    if (
      !isWithinOperatingWindow(location.operatingHours, input.dropoffAt, input.pickupAt, input.clientUtcOffsetMinutes)
    ) {
      throw AppError.badRequest("Selected drop-off/pickup time is outside this location's operating hours.");
    }

    await expireStaleBookings(tx, input.storageLocationId);

    const used = await getUsedCapacity(tx, input.storageLocationId, input.dropoffAt, input.pickupAt);
    if (used + totalBags > location.capacityTotal) {
      throw AppError.conflict("Storage location is fully booked for the selected time. Try a different time or location.");
    }

    let priced;
    try {
      priced = calculatePrice(
        location.priceRules.map((r) => ({ luggageType: r.luggageType, pricePerHour: Number(r.pricePerHour) })),
        input.items,
        input.dropoffAt,
        input.pickupAt
      );
    } catch (e) {
      throw AppError.badRequest((e as Error).message);
    }

    // Snapshotted now so a later admin change to the commission rate never
    // retroactively rewrites the split on an existing booking.
    const commissionPercent = await getCommissionPercent(tx);
    const commission = splitCommission(priced.totalAmount, commissionPercent);

    const booking = await tx.booking.create({
      data: {
        bookingCode: generateBookingCode(),
        customerId: userId,
        storageLocationId: input.storageLocationId,
        dropoffAt: input.dropoffAt,
        pickupAt: input.pickupAt,
        status: "PENDING_PAYMENT",
        baseAmount: priced.baseAmount,
        serviceFee: priced.serviceFee,
        totalAmount: priced.totalAmount,
        platformCommissionPercent: commission.platformCommissionPercent,
        platformCommissionAmount: commission.platformCommissionAmount,
        partnerEarningsAmount: commission.partnerEarningsAmount,
        qrCheckinToken: generateQrToken(),
        qrCheckoutToken: generateQrToken(),
        items: {
          create: priced.items.map((item) => ({
            luggageType: item.luggageType as any,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit,
            subtotal: item.subtotal,
            luggageItems: {
              create: Array.from({ length: item.quantity }, () => ({ tagCode: generateTagCode() })),
            },
          })),
        },
      },
      include: bookingInclude,
    });

    return booking;
  });
}

async function loadBookingOrThrow(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: bookingInclude });
  if (!booking) throw AppError.notFound("Booking not found.");
  return booking;
}

function assertViewAccess(booking: { customerId: string; storageLocation: { partner: { userId: string } } }, userId: string, role: Role) {
  if (role === "ADMIN") return;
  if (role === "CUSTOMER" && booking.customerId === userId) return;
  if (role === "PARTNER" && booking.storageLocation.partner.userId === userId) return;
  throw AppError.forbidden("You do not have access to this booking.");
}

export async function getBookingById(userId: string, role: Role, bookingId: string) {
  const booking = await loadBookingOrThrow(bookingId);
  assertViewAccess(booking, userId, role);
  return booking;
}

export async function listBookingsForCustomer(userId: string) {
  return prisma.booking.findMany({
    where: { customerId: userId },
    include: bookingInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function cancelBooking(userId: string, role: Role, bookingId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { storageLocation: { include: { partner: true } } },
    });
    if (!booking) throw AppError.notFound("Booking not found.");
    assertViewAccess(booking as any, userId, role);

    if (!canCancel(booking.status)) {
      throw AppError.conflict(`A booking in status ${booking.status} can no longer be cancelled.`);
    }
    assertTransition(booking.status, "CANCELLED");

    return tx.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
      include: bookingInclude,
    });
  });
}

export { bookingInclude, assertViewAccess };
