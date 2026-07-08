import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createBookingSchema, cancelBookingSchema } from "../validators/bookingValidators";
import * as bookingController from "../controllers/bookingController";

const router = Router();

router.use(authenticate);

router.post("/", requireRole("CUSTOMER"), validate(createBookingSchema), bookingController.create);
router.get("/", requireRole("CUSTOMER"), bookingController.list);
router.get("/:id", bookingController.getById);
router.get("/:id/availability", bookingController.getAvailabilityForBooking);
router.patch("/:id/cancel", validate(cancelBookingSchema), bookingController.cancel);

export default router;
