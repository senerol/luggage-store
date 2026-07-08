import "dotenv/config";
import { z } from "zod";

/**
 * All process.env access is centralized here and validated at boot.
 * If a required variable is missing, the server fails fast instead of
 * crashing later mid-request with a confusing error.
 */
const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  FRONTEND_URL: z.string().url(),

  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  QR_SECRET: z.string().min(16),

  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),

  SERVICE_FEE_PERCENT: z.coerce.number().min(0).max(100).default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration. Check your .env against .env.example");
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
