import { z } from "zod";

export const createReportSchema = z.object({
  targetType: z.enum(["STORAGE_LOCATION", "BOOKING", "USER"]),
  targetId: z.string().min(1),
  reason: z.string().trim().min(5).max(1000),
});

export const resolveReportSchema = z.object({
  status: z.enum(["RESOLVED", "DISMISSED"]),
  adminNote: z.string().trim().max(1000).optional(),
});
