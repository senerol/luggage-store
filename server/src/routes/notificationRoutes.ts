import { Router } from "express";
import { authenticate } from "../middleware/auth";
import * as notificationController from "../controllers/notificationController";

const router = Router();

router.use(authenticate);

router.get("/", notificationController.list);
router.patch("/:id/read", notificationController.markRead);
router.patch("/read-all", notificationController.markAllRead);

export default router;
