import { z } from "zod";

export const logEventSchema = z.object({
  type: z.enum(["PARTNER_PAGE_VIEW", "APPLICATION_STARTED"]),
});
