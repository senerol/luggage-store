import { BookingStatus, Prisma, PrismaClient } from "@prisma/client";

// Bookings in these statuses occupy physical capacity: PENDING_PAYMENT is
// included deliberately (see bookingService.createBooking) so that a slot is
// reserved the instant a booking is created, before payment completes -
// otherwise two customers could both pass the "capacity available" check
// while racing to pay for the same slot.
export const CAPACITY_HOLDING_STATUSES: BookingStatus[] = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_STORAGE",
  "READY_FOR_PICKUP",
];

type Client = PrismaClient | Prisma.TransactionClient;

/**
 * Sums the number of bags already committed (via CAPACITY_HOLDING_STATUSES
 * bookings) at `storageLocationId` for any interval that overlaps
 * [from, to). Two intervals overlap iff existing.start < requested.end AND
 * existing.end > requested.start - the standard interval-overlap test.
 *
 * This is the single source of truth for "how full is this location right
 * now / during this window" and is used both for read-only search-result
 * display (window = [now, now]) and for the authoritative booking-creation
 * check (window = [dropoffAt, pickupAt), run inside a locked transaction).
 */
export async function getUsedCapacity(
  client: Client,
  storageLocationId: string,
  from: Date,
  to: Date,
  excludeBookingId?: string
): Promise<number> {
  const result = await client.bookingItem.aggregate({
    _sum: { quantity: true },
    where: {
      quantity: { gt: 0 },
      booking: {
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
        storageLocationId,
        status: { in: CAPACITY_HOLDING_STATUSES },
        dropoffAt: { lt: to },
        pickupAt: { gt: from },
      },
    },
  });
  return result._sum?.quantity ?? 0;
}

export async function getAvailableCapacity(
  client: Client,
  storageLocationId: string,
  capacityTotal: number,
  from: Date,
  to: Date,
  excludeBookingId?: string
): Promise<number> {
  const used = await getUsedCapacity(client, storageLocationId, from, to, excludeBookingId);
  return Math.max(0, capacityTotal - used);
}
