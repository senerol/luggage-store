import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { verifyQrSchema } from "../validators/qrValidators";
import * as qrController from "../controllers/qrController";

const router = Router();

router.use(authenticate);

// Customer/admin: fetch the current QR image for a booking.
router.get("/booking/:bookingId", qrController.getForBooking);

// Partner: scan and process a QR (check-in or check-out, inferred server-side).
router.post("/verify", requireRole("PARTNER"), validate(verifyQrSchema), qrController.verify);

export default router;
