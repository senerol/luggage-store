import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createStorageSchema, updateStorageSchema } from "../validators/storageValidators";
import { submitApplicationSchema } from "../validators/applicationValidators";
import { z } from "zod";
import * as partnerController from "../controllers/partnerController";
import * as applicationController from "../controllers/partnerApplicationController";
import * as payoutController from "../controllers/payoutController";

const router = Router();

router.use(authenticate, requireRole("PARTNER"));

router.get("/dashboard", partnerController.dashboard);
router.get("/revenue", partnerController.revenue);
router.get("/bookings", partnerController.bookings);
router.get("/payouts", payoutController.listForPartner);

router.post("/applications", validate(submitApplicationSchema), applicationController.submit);
router.get("/applications", applicationController.listMine);
router.get("/applications/:id", applicationController.getOne);

router.get("/storage", partnerController.listStorage);
router.get("/storage/:id", partnerController.getStorage);
router.post("/storage", validate(createStorageSchema), partnerController.createStorage);
router.patch("/storage/:id", validate(updateStorageSchema), partnerController.updateStorage);
router.patch(
  "/storage/:id/disabled",
  validate(z.object({ disabled: z.boolean() })),
  partnerController.setDisabled
);
router.delete("/storage/:id", partnerController.deleteStorage);

export default router;
