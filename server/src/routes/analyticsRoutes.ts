import { Router } from "express";
import rateLimit from "express-rate-limit";
import { attachUserIfPresent } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { logEventSchema } from "../validators/analyticsValidators";
import * as analyticsController from "../controllers/analyticsController";

const router = Router();

const eventLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false });

// Public (works for anonymous visitors) - fires from the /become-partner
// landing page and the onboarding wizard's first interaction. Not
// authenticated by requirement, but attributes to a user when one is logged
// in via attachUserIfPresent.
router.post("/events", eventLimiter, attachUserIfPresent, validate(logEventSchema), analyticsController.logEvent);

export default router;
