import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import * as payoutService from "../services/payoutService";

export const listForPartner = asyncHandler(async (req: Request, res: Response) => {
  const payouts = await payoutService.listPayoutsForPartnerUser(req.user!.id);
  res.status(200).json({ success: true, data: { payouts } });
});

export const listAll = asyncHandler(async (req: Request, res: Response) => {
  const payouts = await payoutService.listAllPayouts(req.query.status as string | undefined);
  res.status(200).json({ success: true, data: { payouts } });
});

export const createForPartner = asyncHandler(async (req: Request, res: Response) => {
  const payout = await payoutService.createPayout(req.params.id, req.body?.note);
  res.status(201).json({ success: true, data: { payout } });
});

export const markPaid = asyncHandler(async (req: Request, res: Response) => {
  const payout = await payoutService.markPayoutPaid(req.params.id);
  res.status(200).json({ success: true, data: { payout } });
});
