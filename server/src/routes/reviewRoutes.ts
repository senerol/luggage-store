import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createReviewSchema } from "../validators/reviewValidators";
import * as reviewController from "../controllers/reviewController";

const router = Router();

router.get("/:id/reviews", reviewController.list);
router.post(
  "/:id/reviews",
  authenticate,
  requireRole("CUSTOMER"),
  validate(createReviewSchema),
  reviewController.create
);

export default router;
