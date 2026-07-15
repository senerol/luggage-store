import QRCode from "qrcode";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { assertTransition } from "./bookingStateMachine";
import { CHECK_IN_EARLY_WINDOW_MINUTES, STORAGE_TIMEZONE } from "../config/constants";
import { getBookingById } from "./bookingService";
import { formatInTimeZone } from "../utils/operatingHours";
import { Role } from "@prisma/client";

/**
 * QR content is the opaque token ONLY (never JSON with names/emails/etc.).
 * The token is a 32-char unguessable random string (see utils/ids.ts) that
 * means nothing on its own - the backend is the only place that can turn it
 * into "which booking, at which stage" by looking it up.
 */
async function tokenToDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(token, { errorCorrectionLevel: "M", margin: 1, width: 320 });
}

export async function getQrForBooking(userId: string, role: Role, bookingId: string) {
  const booking = await getBookingById(userId, role, bookingId);

  if (booking.status === "CONFIRMED") {
    return {
      stage: "check-in" as const,
      bookingCode: booking.bookingCode,
      qrImage: await tokenToDataUrl(booking.qrCheckinToken),
      validFrom: new Date(booking.dropoffAt.getTime() - CHECK_IN_EARLY_WINDOW_MINUTES * 60 * 1000),
      validUntil: booking.pickupAt,
    };
  }

  if (booking.status === "IN_STORAGE") {
    return {
      stage: "check-out" as const,
      bookingCode: booking.bookingCode,
      qrImage: await tokenToDataUrl(booking.qrCheckoutToken),
      validFrom: null,
      validUntil: null,
    };
  }

  throw AppError.conflict(`No QR code to show for a booking in status ${booking.status}.`);
}

/**
 * Partner-facing scan endpoint. One booking has two tokens (check-in /
 * check-out); which one was scanned determines which flow runs. Both flows
 * use an optimistic-locking updateMany (status = expected value AND
 * used-at IS NULL) so that if the same QR is scanned twice in quick
 * succession, only the first request's UPDATE actually matches a row -
 * the second gets `count === 0` and is told the code was already used,
 * instead of both requests racing through independent read-then-write
 * steps and double-processing the same booking.
 */
export async function verifyAndProcessQr(partnerUserId: string, token: string) {
  const booking = await prisma.booking.findFirst({
    where: { OR: [{ qrCheckinToken: token }, { qrCheckoutToken: token }] },
    include: { storageLocation: { include: { partner: true } }, items: { include: { luggageItems: true } } },
  });
  if (!booking) throw AppError.notFound("Invalid QR code.");

  if (booking.storageLocation.partner.userId !== partnerUserId) {
    throw AppError.forbidden("This QR code belongs to a different storage location.");
  }

  const isCheckIn = token === booking.qrCheckinToken;
  const now = new Date();

  if (isCheckIn) {
    if (booking.checkinUsedAt) {
      throw AppError.conflict("This QR code has already been used to check in.");
    }
    if (booking.status !== "CONFIRMED") {
      throw AppError.conflict(`Booking is ${booking.status}; it cannot be checked in.`);
    }

    // now/windowStart are both real instants (absolute points on the UTC
    // timeline), so this comparison is correct regardless of what timezone
    // this process happens to run in - only the message below needs a
    // timezone conversion, to be readable by a human.
    const windowStart = new Date(booking.dropoffAt.getTime() - CHECK_IN_EARLY_WINDOW_MINUTES * 60 * 1000);
    if (now < windowStart) {
      throw AppError.badRequest(
        `Too early to check in. Check-in opens at ${formatInTimeZone(windowStart, STORAGE_TIMEZONE)} IST.`
      );
    }
    if (now > booking.pickupAt) {
      await prisma.booking.update({ where: { id: booking.id }, data: { status: "EXPIRED" } });
      throw AppError.conflict("This booking's window has expired and can no longer be checked in.");
    }

    assertTransition("CONFIRMED", "CHECKED_IN");
    assertTransition("CHECKED_IN", "IN_STORAGE");

    return prisma.$transaction(async (tx) => {
      const updateResult = await tx.booking.updateMany({
        where: { id: booking.id, status: "CONFIRMED", checkinUsedAt: null },
        data: { status: "IN_STORAGE", checkedInAt: now, checkinUsedAt: now },
      });
      if (updateResult.count === 0) {
        throw AppError.conflict("This QR code was just used by another request.");
      }
      await tx.luggageItem.updateMany({
        where: { bookingItem: { bookingId: booking.id } },
        data: { status: "IN_STORAGE" },
      });
      await tx.notification.create({
        data: {
          userId: booking.customerId,
          type: "CHECKED_IN",
          message: `Your luggage for booking ${booking.bookingCode} has been checked in and is safely stored.`,
        },
      });
      return tx.booking.findUniqueOrThrow({
        where: { id: booking.id },
        include: { items: { include: { luggageItems: true } }, storageLocation: true },
      });
    });
  }

  // Check-out flow
  if (booking.checkoutUsedAt) {
    throw AppError.conflict("This QR code has already been used to check out.");
  }
  if (booking.status !== "IN_STORAGE") {
    throw AppError.conflict(`Booking is ${booking.status}; it cannot be checked out.`);
  }

  assertTransition("IN_STORAGE", "READY_FOR_PICKUP");
  assertTransition("READY_FOR_PICKUP", "COLLECTED");

  return prisma.$transaction(async (tx) => {
    const updateResult = await tx.booking.updateMany({
      where: { id: booking.id, status: "IN_STORAGE", checkoutUsedAt: null },
      data: { status: "COLLECTED", checkedOutAt: now, checkoutUsedAt: now },
    });
    if (updateResult.count === 0) {
      throw AppError.conflict("This QR code was just used by another request.");
    }
    await tx.luggageItem.updateMany({
      where: { bookingItem: { bookingId: booking.id } },
      data: { status: "COLLECTED" },
    });
    await tx.notification.create({
      data: {
        userId: booking.customerId,
        type: "COLLECTED",
        message: `Your luggage for booking ${booking.bookingCode} has been collected. Thanks for using Luggo!`,
      },
    });
    return tx.booking.findUniqueOrThrow({
      where: { id: booking.id },
      include: { items: { include: { luggageItems: true } }, storageLocation: true },
    });
  });
}
