import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { resolveReportSchema } from "../validators/reportValidators";
import { reviewApplicationSchema } from "../validators/applicationValidators";
import * as adminController from "../controllers/adminController";
import * as applicationController from "../controllers/partnerApplicationController";
import * as payoutController from "../controllers/payoutController";
import * as analyticsController from "../controllers/analyticsController";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));

router.get("/dashboard", adminController.dashboard);

router.get("/users", adminController.users);

router.get("/partners", adminController.partners);
router.patch("/partners/:id/approve", adminController.approvePartner);
router.patch("/partners/:id/reject", adminController.rejectPartner);
router.patch("/partners/:id/suspend", applicationController.suspendPartner);
router.patch("/partners/:id/reinstate", applicationController.reinstatePartner);
router.post(
  "/partners/:id/payouts",
  validate(z.object({ note: z.string().trim().max(500).optional() })),
  payoutController.createForPartner
);

router.get("/storage", adminController.storage);
router.patch("/storage/:id/approve", adminController.approveStorage);
router.patch("/storage/:id/reject", adminController.rejectStorage);

// Partner-acquisition onboarding review queue - see PartnerApplication in
// schema.prisma for the full status lifecycle this drives.
router.get("/applications", applicationController.listAll);
router.get("/applications/:id", applicationController.getOne);
router.patch("/applications/:id/approve", applicationController.approve);
router.patch(
  "/applications/:id/reject",
  validate(reviewApplicationSchema),
  applicationController.reject
);
router.patch(
  "/applications/:id/request-changes",
  validate(reviewApplicationSchema),
  applicationController.requestChanges
);

router.get("/payouts", payoutController.listAll);
router.patch("/payouts/:id/mark-paid", payoutController.markPaid);

router.get("/analytics/partner-funnel", analyticsController.partnerFunnel);

router.get("/settings/commission", adminController.getCommission);
router.patch(
  "/settings/commission",
  validate(z.object({ commissionPercent: z.number().min(0).max(100) })),
  adminController.setCommission
);

router.get("/bookings", adminController.bookings);
router.get("/payments", adminController.payments);
router.get("/reviews", adminController.reviews);

router.get("/reports", adminController.reports);
router.patch("/reports/:id", validate(resolveReportSchema), adminController.resolveReport);

export default router;
