import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import * as notificationService from "../services/notificationService";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const notifications = await notificationService.listForUser(req.user!.id);
  res.status(200).json({ success: true, data: { notifications } });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.markRead(req.user!.id, req.params.id);
  res.status(200).json({ success: true, data: null });
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.markAllRead(req.user!.id);
  res.status(200).json({ success: true, data: null });
});
