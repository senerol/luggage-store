import { Router } from "express";
import { validate } from "../middleware/validate";
import { nearbyQuerySchema } from "../validators/storageValidators";
import { availabilityQuerySchema } from "../validators/bookingValidators";
import * as storageController from "../controllers/storageController";

const router = Router();

// GET /api/storage        - search/list with optional filters (city, price, rating, etc.)
// GET /api/storage/nearby - same handler; lat/lng is what makes it "nearby"
router.get("/", validate(nearbyQuerySchema, "query"), storageController.search);
router.get("/nearby", validate(nearbyQuerySchema, "query"), storageController.search);
router.get(
  "/:id/availability",
  validate(availabilityQuerySchema, "query"),
  storageController.checkAvailability
);
router.get("/:id", storageController.getById);

export default router;
