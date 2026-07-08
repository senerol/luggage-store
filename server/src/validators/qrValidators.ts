import { z } from "zod";

export const verifyQrSchema = z.object({
  token: z.string().min(10).max(64),
});
