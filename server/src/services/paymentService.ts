import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { razorpay } from "../config/razorpay";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { assertTransition } from "./bookingStateMachine";
import { createOrderSchema, verifyPaymentSchema } from "../validators/paymentValidators";

type CreateOrderInput = z.infer<typeof createOrderSchema>;
type VerifyInput = z.infer<typeof verifyPaymentSchema>;

/**
 * Creates a Razorpay order for a booking. The amount is ALWAYS recomputed
 * from the booking row stored server-side (booking.totalAmount, itself
 * derived from priceRules at booking-creation time) - the frontend cannot
 * influence what gets charged (edge case: "payment amount manipulated on
 * frontend").
 */
export async function createPaymentOrder(userId: string, input: CreateOrderInput) {
  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking) throw AppError.notFound("Booking not found.");
  if (booking.customerId !== userId) throw AppError.forbidden("This booking does not belong to you.");

  if (booking.status === "PAYMENT_FAILED") {
    // Allow retry: move back into PENDING_PAYMENT before issuing a new order.
    assertTransition("PAYMENT_FAILED", "PENDING_PAYMENT");
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "PENDING_PAYMENT" } });
  } else if (booking.status !== "PENDING_PAYMENT") {
    throw AppError.conflict(`This booking is already ${booking.status} and cannot be paid for again.`);
  }

  const existingPaid = await prisma.payment.findFirst({
    where: { bookingId: booking.id, status: "PAID" },
  });
  if (existingPaid) {
    throw AppError.conflict("This booking has already been paid for.");
  }

  const amountInPaise = Math.round(Number(booking.totalAmount) * 100);

  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: booking.currency,
    receipt: booking.bookingCode,
    notes: { bookingId: booking.id },
  });

  const payment = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      razorpayOrderId: order.id,
      amount: booking.totalAmount,
      currency: booking.currency,
      status: "CREATED",
    },
  });

  return {
    paymentId: payment.id,
    razorpayOrderId: order.id,
    amount: amountInPaise,
    currency: booking.currency,
    keyId: env.RAZORPAY_KEY_ID,
    bookingId: booking.id,
    bookingCode: booking.bookingCode,
  };
}

/**
 * Verifies the signature Razorpay's checkout returns to the frontend, then
 * atomically marks the payment PAID and the booking CONFIRMED. Idempotent:
 * calling this again for an already-PAID payment is a safe no-op that
 * returns the same result, which is what makes it safe for the frontend to
 * retry this call after a network failure without risking a double charge
 * or a duplicate confirmation.
 */
export async function verifyPayment(userId: string, input: VerifyInput) {
  // Note: on an invalid signature we still COMMIT the FAILED/PAYMENT_FAILED
  // state (so the retry-payment path in createPaymentOrder works next time)
  // and only throw *after* the transaction has committed - throwing from
  // inside prisma.$transaction would roll back those very updates.
  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: input.bookingId },
      include: { payments: true },
    });
    if (!booking) throw AppError.notFound("Booking not found.");
    if (booking.customerId !== userId) throw AppError.forbidden("This booking does not belong to you.");

    const payment = booking.payments.find((p) => p.razorpayOrderId === input.razorpay_order_id);
    if (!payment) throw AppError.notFound("No matching payment order found for this booking.");

    if (payment.status === "PAID") {
      // Already processed - return success without re-verifying or
      // re-transitioning the booking (transition CONFIRMED->CONFIRMED would
      // otherwise be rejected by the state machine). Makes this endpoint
      // safe to call twice after a network hiccup on the first attempt.
      return { signatureValid: true, booking, alreadyProcessed: true };
    }

    const expectedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
      .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
      .digest("hex");

    const signatureValid = expectedSignature === input.razorpay_signature;

    if (!signatureValid) {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", failureReason: "Signature verification failed." },
      });
      assertTransition(booking.status, "PAYMENT_FAILED");
      const failedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: { status: "PAYMENT_FAILED" },
      });
      return { signatureValid: false, booking: failedBooking, alreadyProcessed: false };
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        razorpayPaymentId: input.razorpay_payment_id,
        razorpaySignature: input.razorpay_signature,
      },
    });

    assertTransition(booking.status, "CONFIRMED");
    const confirmedBooking = await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CONFIRMED" },
      include: { items: { include: { luggageItems: true } }, storageLocation: true },
    });

    await tx.notification.create({
      data: {
        userId,
        type: "BOOKING_CONFIRMED",
        message: `Your booking ${confirmedBooking.bookingCode} is confirmed. Show your QR code at drop-off.`,
      },
    });

    return { signatureValid: true, booking: confirmedBooking, alreadyProcessed: false };
  });

  if (!result.signatureValid) {
    throw AppError.badRequest("Payment verification failed. Please contact support if you were charged.");
  }

  return result;
}
