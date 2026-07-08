import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import * as reviewService from "../services/reviewService";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const review = await reviewService.createReview(req.user!.id, req.params.id, req.body);
  res.status(201).json({ success: true, data: { review } });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const reviews = await reviewService.listReviews(req.params.id);
  res.status(200).json({ success: true, data: { reviews } });
});
