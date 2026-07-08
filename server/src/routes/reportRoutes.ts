import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createReportSchema } from "../validators/reportValidators";
import * as adminController from "../controllers/adminController";

const router = Router();

// Any authenticated user (customer or partner) can file a report; admins
// triage them under /api/admin/reports.
router.post("/", authenticate, validate(createReportSchema), adminController.createReport);

export default router;
