import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import * as analyticsService from "../services/analyticsService";

export const logEvent = asyncHandler(async (req: Request, res: Response) => {
  await analyticsService.logEvent(req.body.type, req.user?.id);
  res.status(201).json({ success: true, data: null });
});

export const partnerFunnel = asyncHandler(async (_req: Request, res: Response) => {
  const funnel = await analyticsService.getPartnerFunnel();
  res.status(200).json({ success: true, data: { funnel } });
});
