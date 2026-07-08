import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import * as storageService from "../services/storageService";
import * as bookingService from "../services/bookingService";

export const search = asyncHandler(async (req: Request, res: Response) => {
  const results = await storageService.searchStorageLocations(req.query as any);
  res.status(200).json({ success: true, data: { results, count: results.length } });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const location = await storageService.getStorageLocationById(req.params.id);
  res.status(200).json({ success: true, data: { location } });
});

// Pre-booking availability check (booking flow step 3): "is there room for
// N bags between dropoffAt and pickupAt", before the customer commits.
export const checkAvailability = asyncHandler(async (req: Request, res: Response) => {
  const availability = await bookingService.checkAvailability(req.params.id, req.query as any);
  res.status(200).json({ success: true, data: { availability } });
});
