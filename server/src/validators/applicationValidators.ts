import { z } from "zod";
import { luggageTypeEnum } from "./storageValidators";

const operatingHourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM 24h format"),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM 24h format"),
});

const priceRuleSchema = z.object({
  luggageType: luggageTypeEnum,
  pricePerHour: z.number().positive().max(10000),
});

export const businessTypeEnum = z.enum(["HOTEL", "HOSTEL", "CAFE", "SHOP", "LUGGAGE_STORE", "OTHER"]);

// One combined payload for the whole onboarding wizard (steps 2-8); the
// frontend collects all steps client-side and submits once on step 9.
export const submitApplicationSchema = z.object({
  businessName: z.string().trim().min(2).max(150),
  businessType: businessTypeEnum,
  description: z.string().trim().min(10).max(2000),

  storageLocation: z.object({
    name: z.string().trim().min(2).max(150),
    address: z.string().trim().min(5).max(300),
    city: z.string().trim().min(2).max(100),
    latitude: z.number().gte(-90).lte(90),
    longitude: z.number().gte(-180).lte(180),
    landmark: z.string().trim().max(200).optional(),
    description: z.string().trim().min(10).max(2000),
    safetyInfo: z.string().trim().min(5).max(1000),
    capacityTotal: z.number().int().positive().max(100000),
    photos: z.array(z.string().url()).min(1).max(10),
    operatingHours: z.array(operatingHourSchema).min(1),
    priceRules: z.array(priceRuleSchema).min(1),
  }),

  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the partner terms to submit an application." }),
  }),
});

export const reviewApplicationSchema = z.object({
  rejectionReason: z.string().trim().min(5).max(1000).optional(),
  adminNote: z.string().trim().min(5).max(1000).optional(),
});
