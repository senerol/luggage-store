import { z } from "zod";
import { luggageTypeEnum } from "./storageValidators";

export const bookingItemInputSchema = z.object({
  luggageType: luggageTypeEnum,
  quantity: z.number().int().positive().max(50),
});

// The customer's own browser timezone offset (Date.prototype.getTimezoneOffset()
// at the moment they picked the time), used only to correctly resolve which
// wall-clock day/hour their selection falls on for operating-hours checks -
// see server/src/utils/operatingHours.ts for why this is needed. Defaults to
// 0 (treat dropoffAt/pickupAt as already representing the intended
// wall-clock time in UTC) so older clients that don't send it still work.
const clientUtcOffsetMinutesSchema = z.coerce.number().int().min(-720).max(840).default(0);

export const createBookingSchema = z
  .object({
    storageLocationId: z.string().min(1),
    dropoffAt: z.coerce.date(),
    pickupAt: z.coerce.date(),
    items: z.array(bookingItemInputSchema).min(1).max(10),
    clientUtcOffsetMinutes: clientUtcOffsetMinutesSchema,
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
    clientUtcOffsetMinutes: clientUtcOffsetMinutesSchema,
  })
  .refine((data) => data.pickupAt.getTime() > data.dropoffAt.getTime(), {
    message: "Pickup time must be after drop-off time.",
    path: ["pickupAt"],
  });

export const cancelBookingSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
