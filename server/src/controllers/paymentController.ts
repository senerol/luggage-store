import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import * as paymentService from "../services/paymentService";

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await paymentService.createPaymentOrder(req.user!.id, req.body);
  res.status(201).json({ success: true, data: order });
});

export const verify = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.verifyPayment(req.user!.id, req.body);
  res.status(200).json({ success: true, data: { booking: result.booking } });
});
