import { z } from "zod";

/**
 * Mirrors server/src/validators/applicationValidators.ts's
 * `submitApplicationSchema` field-for-field (same min/max bounds, same
 * required-ness), split into one schema per onboarding step so
 * PartnerApplyPage can validate just the fields on screen when the user
 * clicks Continue.
 *
 * This is deliberate, minimal duplication: the client and server are
 * separate runtimes, so the same rules necessarily have to exist in both
 * places. The backend schema remains the sole source of truth for what's
 * actually accepted - these schemas exist only to give the user an
 * immediate "this field is wrong" message instead of discovering problems
 * one at a time after reaching the final Review step and hitting the
 * network. Every field name below matches a PartnerApplyPage FormState key
 * exactly, so a single error map can be shared across all steps.
 */

const businessTypeEnum = z.enum(["HOTEL", "HOSTEL", "CAFE", "SHOP", "LUGGAGE_STORE", "OTHER"]);
const luggageTypeEnum = z.enum(["BACKPACK", "SMALL_SUITCASE", "LARGE_SUITCASE", "OTHER"]);

const operatingHourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM 24h format"),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM 24h format"),
});

const priceRuleSchema = z.object({
  luggageType: luggageTypeEnum,
  pricePerHour: z.number().positive().max(10000),
});

export const businessStepSchema = z.object({
  businessName: z.string().trim().min(2, "Enter a business name (at least 2 characters).").max(150),
  businessType: businessTypeEnum,
  description: z.string().trim().min(10, "Tell us a bit more about your business (at least 10 characters).").max(2000),
});

export const locationStepSchema = z.object({
  locationName: z.string().trim().min(2, "Enter a location name (at least 2 characters).").max(150),
  address: z.string().trim().min(5, "Enter a fuller address (at least 5 characters).").max(300),
  city: z.string().trim().min(2, "Enter a city.").max(100),
  landmark: z.string().trim().max(200).optional(),
  latitude: z.number().gte(-90, "Latitude must be between -90 and 90.").lte(90, "Latitude must be between -90 and 90."),
  longitude: z.number().gte(-180, "Longitude must be between -180 and 180.").lte(180, "Longitude must be between -180 and 180."),
});

export const detailsStepSchema = z.object({
  locationDescription: z.string().trim().min(10, "Describe the storage area (at least 10 characters).").max(2000),
  safetyInfo: z.string().trim().min(5, "Add at least a short safety note (at least 5 characters).").max(1000),
  capacityTotal: z.number().int("Capacity must be a whole number.").positive("Capacity must be greater than 0.").max(100000),
  photos: z
    .array(z.string().trim().url("Each photo must be a valid URL."))
    .min(1, "Add at least one photo of your storage area.")
    .max(10),
});

export const hoursPricingStepSchema = z.object({
  operatingHours: z.array(operatingHourSchema).min(1, "Set operating hours for at least one day."),
  priceRules: z.array(priceRuleSchema).min(1, "Add pricing for at least one luggage type."),
});

export const reviewStepSchema = z.object({
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the partner terms to submit." }),
  }),
});

// The Review step's final Submit action re-validates everything, not just
// its own step - a last safety net before the network call, independent of
// however the user navigated back and forth between steps to get there.
export const fullApplicationFormSchema = businessStepSchema
  .merge(locationStepSchema)
  .merge(detailsStepSchema)
  .merge(hoursPricingStepSchema)
  .merge(reviewStepSchema);

export const STEP_SCHEMAS = [
  businessStepSchema,
  locationStepSchema,
  detailsStepSchema,
  hoursPricingStepSchema,
  reviewStepSchema,
] as const;

/** Zod's flattened field errors, keyed by field name -> first message for that field. */
export function firstErrorPerField(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
