import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import * as qrService from "../services/qrService";

export const getForBooking = asyncHandler(async (req: Request, res: Response) => {
  const qr = await qrService.getQrForBooking(req.user!.id, req.user!.role, req.params.bookingId);
  res.status(200).json({ success: true, data: { qr } });
});

export const verify = asyncHandler(async (req: Request, res: Response) => {
  const booking = await qrService.verifyAndProcessQr(req.user!.id, req.body.token);
  res.status(200).json({ success: true, data: { booking } });
});
