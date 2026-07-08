import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import * as partnerService from "../services/partnerService";
import * as storageService from "../services/storageService";

export const dashboard = asyncHandler(async (req: Request, res: Response) => {
  const data = await partnerService.getDashboard(req.user!.id);
  res.status(200).json({ success: true, data });
});

export const revenue = asyncHandler(async (req: Request, res: Response) => {
  const data = await partnerService.getRevenue(req.user!.id);
  res.status(200).json({ success: true, data });
});

export const bookings = asyncHandler(async (req: Request, res: Response) => {
  const data = await partnerService.getBookingsForPartner(req.user!.id, {
    status: req.query.status as string | undefined,
    todayOnly: req.query.today === "true",
  });
  res.status(200).json({ success: true, data: { bookings: data } });
});

export const listStorage = asyncHandler(async (req: Request, res: Response) => {
  const data = await partnerService.getOwnStorageLocations(req.user!.id);
  res.status(200).json({ success: true, data: { locations: data } });
});

export const getStorage = asyncHandler(async (req: Request, res: Response) => {
  const data = await partnerService.getOwnStorageLocationById(req.user!.id, req.params.id);
  res.status(200).json({ success: true, data: { location: data } });
});

export const createStorage = asyncHandler(async (req: Request, res: Response) => {
  const location = await storageService.createStorageLocation(req.user!.id, req.body);
  res.status(201).json({ success: true, data: { location } });
});

export const updateStorage = asyncHandler(async (req: Request, res: Response) => {
  const location = await storageService.updateStorageLocation(req.user!.id, req.params.id, req.body);
  res.status(200).json({ success: true, data: { location } });
});

export const setDisabled = asyncHandler(async (req: Request, res: Response) => {
  const location = await storageService.setStorageDisabled(req.user!.id, req.params.id, req.body.disabled);
  res.status(200).json({ success: true, data: { location } });
});

export const deleteStorage = asyncHandler(async (req: Request, res: Response) => {
  await storageService.deleteStorageLocation(req.user!.id, req.params.id);
  res.status(204).send();
});
