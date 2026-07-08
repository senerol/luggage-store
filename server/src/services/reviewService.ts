import { z } from "zod";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { createReviewSchema } from "../validators/reviewValidators";

type CreateReviewInput = z.infer<typeof createReviewSchema>;

export async function createReview(userId: string, storageLocationId: string, input: CreateReviewInput) {
  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking) throw AppError.notFound("Booking not found.");
  if (booking.customerId !== userId) throw AppError.forbidden("This booking does not belong to you.");
  if (booking.storageLocationId !== storageLocationId) {
    throw AppError.badRequest("This booking is not for this storage location.");
  }
  if (booking.status !== "COLLECTED") {
    throw AppError.badRequest("You can only leave a review after your luggage has been collected.");
  }

  const existing = await prisma.review.findUnique({ where: { bookingId: input.bookingId } });
  if (existing) throw AppError.conflict("You have already reviewed this booking.");

  return prisma.review.create({
    data: {
      bookingId: input.bookingId,
      storageLocationId,
      customerId: userId,
      rating: input.rating,
      comment: input.comment,
    },
  });
}

export async function listReviews(storageLocationId: string) {
  return prisma.review.findMany({
    where: { storageLocationId },
    include: { customer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}
