import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";

// A booking's earnings become eligible for payout once the stay is fully
// complete (COLLECTED) and the customer's payment actually cleared (a PAID
// Payment row exists) - matching money only ever leaves the "owed to
// partner" bucket once Luggo has definitely been paid for it.
const ELIGIBLE_BOOKING_WHERE = {
  status: "COLLECTED" as const,
  payoutId: null,
  payments: { some: { status: "PAID" as const } },
};

async function getPartnerOrThrow(userId: string) {
  const partner = await prisma.storagePartner.findUnique({ where: { userId } });
  if (!partner) throw AppError.forbidden("No partner profile found for this account.");
  return partner;
}

async function getLocationIds(partnerId: string) {
  const locations = await prisma.storageLocation.findMany({ where: { partnerId }, select: { id: true } });
  return locations.map((l) => l.id);
}

export async function getPendingPayoutAmount(partnerId: string) {
  const locationIds = await getLocationIds(partnerId);
  const result = await prisma.booking.aggregate({
    _sum: { partnerEarningsAmount: true },
    where: { storageLocationId: { in: locationIds }, ...ELIGIBLE_BOOKING_WHERE },
  });
  return Number(result._sum.partnerEarningsAmount ?? 0);
}

/**
 * Bundles every currently-eligible booking for a partner into one Payout
 * ledger entry. This does NOT move any money - it records that Luggo owes
 * (and, once marked paid, has paid) this amount to the partner through
 * whatever manual/external channel is used today. Wiring a real payout
 * provider is a documented future improvement (see README).
 */
export async function createPayout(partnerId: string, note?: string) {
  const locationIds = await getLocationIds(partnerId);

  return prisma.$transaction(async (tx) => {
    const eligibleBookings = await tx.booking.findMany({
      where: { storageLocationId: { in: locationIds }, ...ELIGIBLE_BOOKING_WHERE },
      select: { id: true, partnerEarningsAmount: true },
    });

    if (eligibleBookings.length === 0) {
      throw AppError.badRequest("No eligible earnings to pay out right now.");
    }

    const amount = eligibleBookings.reduce((sum, b) => sum + Number(b.partnerEarningsAmount), 0);

    const payout = await tx.payout.create({
      data: { partnerId, amount, status: "PENDING", note },
    });

    await tx.booking.updateMany({
      where: { id: { in: eligibleBookings.map((b) => b.id) } },
      data: { payoutId: payout.id },
    });

    return payout;
  });
}

export async function markPayoutPaid(payoutId: string) {
  const payout = await prisma.payout.findUnique({ where: { id: payoutId }, include: { partner: true } });
  if (!payout) throw AppError.notFound("Payout not found.");
  if (payout.status === "PAID") throw AppError.conflict("This payout has already been marked as paid.");

  const updated = await prisma.payout.update({
    where: { id: payoutId },
    data: { status: "PAID", paidAt: new Date() },
  });

  await prisma.notification.create({
    data: {
      userId: payout.partner.userId,
      type: "PAYOUT_PAID",
      message: `A payout of ₹${Number(updated.amount).toFixed(2)} has been marked as paid to you.`,
    },
  });

  return updated;
}

export async function listPayoutsForPartnerUser(userId: string) {
  const partner = await getPartnerOrThrow(userId);
  return prisma.payout.findMany({
    where: { partnerId: partner.id },
    include: { bookings: { select: { id: true, bookingCode: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listAllPayouts(status?: string) {
  return prisma.payout.findMany({
    where: status ? { status: status as any } : {},
    include: {
      partner: { select: { businessName: true, user: { select: { name: true, email: true } } } },
      bookings: { select: { id: true, bookingCode: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
