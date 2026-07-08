import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createOrderSchema, verifyPaymentSchema } from "../validators/paymentValidators";
import * as paymentController from "../controllers/paymentController";

const router = Router();

const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authenticate, requireRole("CUSTOMER"), paymentLimiter);

router.post("/create-order", validate(createOrderSchema), paymentController.createOrder);
router.post("/verify", validate(verifyPaymentSchema), paymentController.verify);

export default router;
