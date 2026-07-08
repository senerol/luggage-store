import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
  phone: z.string().trim().min(6).max(20).optional(),
  role: z.enum(["CUSTOMER", "PARTNER"]).default("CUSTOMER"),
  // Required only when role === PARTNER, checked in the controller since it
  // depends on another field's value.
  businessName: z.string().trim().min(2).max(150).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
