import { z } from "zod";
import { luggageTypeEnum } from "./storageValidators";

export const bookingItemInputSchema = z.object({
  luggageType: luggageTypeEnum,
  quantity: z.number().int().positive().max(50),
});

export const createBookingSchema = z
  .object({
    storageLocationId: z.string().min(1),
    dropoffAt: z.coerce.date(),
    pickupAt: z.coerce.date(),
    items: z.array(bookingItemInputSchema).min(1).max(10),
  })
  .refine((data) => data.pickupAt.getTime() > data.dropoffAt.getTime(), {
    message: "Pickup time must be after drop-off time.",
    path: ["pickupAt"],
  })
  .refine((data) => data.dropoffAt.getTime() > Date.now() - 5 * 60 * 1000, {
    message: "Drop-off time must be in the future.",
    path: ["dropoffAt"],
  });

export const availabilityQuerySchema = z
  .object({
    dropoffAt: z.coerce.date(),
    pickupAt: z.coerce.date(),
    bags: z.coerce.number().int().positive().max(500).default(1),
  })
  .refine((data) => data.pickupAt.getTime() > data.dropoffAt.getTime(), {
    message: "Pickup time must be after drop-off time.",
    path: ["pickupAt"],
  });

export const cancelBookingSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
