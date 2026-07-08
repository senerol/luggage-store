import { z } from "zod";

export const luggageTypeEnum = z.enum(["BACKPACK", "SMALL_SUITCASE", "LARGE_SUITCASE", "OTHER"]);

const operatingHourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM 24h format"),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM 24h format"),
});

const priceRuleSchema = z.object({
  luggageType: luggageTypeEnum,
  pricePerHour: z.number().positive().max(10000),
});

export const createStorageSchema = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().min(10).max(2000),
  address: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(100),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  photos: z.array(z.string().url()).max(10).default([]),
  capacityTotal: z.number().int().positive().max(100000),
  operatingHours: z.array(operatingHourSchema).min(1),
  priceRules: z.array(priceRuleSchema).min(1),
});

export const updateStorageSchema = createStorageSchema.partial();

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().gte(-90).lte(90).optional(),
  lng: z.coerce.number().gte(-180).lte(180).optional(),
  city: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  maxDistanceKm: z.coerce.number().positive().max(500).default(15),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  openNow: z.coerce.boolean().optional(),
  luggageType: luggageTypeEnum.optional(),
  sort: z.enum(["distance", "price", "rating"]).default("distance"),
});
