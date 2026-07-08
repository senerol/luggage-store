import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import * as adminService from "../services/adminService";
import * as platformConfigService from "../services/platformConfigService";
import { prisma } from "../config/prisma";

export const dashboard = asyncHandler(async (_req: Request, res: Response) => {
  const data = await adminService.getDashboard();
  res.status(200).json({ success: true, data });
});

export const users = asyncHandler(async (_req: Request, res: Response) => {
  const data = await adminService.listUsers();
  res.status(200).json({ success: true, data: { users: data } });
});

export const partners = asyncHandler(async (_req: Request, res: Response) => {
  const data = await adminService.listPartners();
  res.status(200).json({ success: true, data: { partners: data } });
});

export const approvePartner = asyncHandler(async (req: Request, res: Response) => {
  const partner = await adminService.setPartnerApproval(req.params.id, true);
  res.status(200).json({ success: true, data: { partner } });
});

export const rejectPartner = asyncHandler(async (req: Request, res: Response) => {
  const partner = await adminService.setPartnerApproval(req.params.id, false);
  res.status(200).json({ success: true, data: { partner } });
});

export const storage = asyncHandler(async (req: Request, res: Response) => {
  const data = await adminService.listStorageLocations(req.query.status as string | undefined);
  res.status(200).json({ success: true, data: { locations: data } });
});

export const approveStorage = asyncHandler(async (req: Request, res: Response) => {
  const location = await adminService.setStorageApproval(req.params.id, true);
  res.status(200).json({ success: true, data: { location } });
});

export const rejectStorage = asyncHandler(async (req: Request, res: Response) => {
  const location = await adminService.setStorageApproval(req.params.id, false);
  res.status(200).json({ success: true, data: { location } });
});

export const bookings = asyncHandler(async (_req: Request, res: Response) => {
  const data = await adminService.listAllBookings();
  res.status(200).json({ success: true, data: { bookings: data } });
});

export const payments = asyncHandler(async (_req: Request, res: Response) => {
  const data = await adminService.listAllPayments();
  res.status(200).json({ success: true, data: { payments: data } });
});

export const reviews = asyncHandler(async (_req: Request, res: Response) => {
  const data = await adminService.listAllReviews();
  res.status(200).json({ success: true, data: { reviews: data } });
});

export const reports = asyncHandler(async (req: Request, res: Response) => {
  const data = await adminService.listReports(req.query.status as string | undefined);
  res.status(200).json({ success: true, data: { reports: data } });
});

export const resolveReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await adminService.resolveReport(req.params.id, req.body.status, req.body.adminNote);
  res.status(200).json({ success: true, data: { report } });
});

export const createReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await prisma.report.create({
    data: { reporterId: req.user!.id, ...req.body },
  });
  res.status(201).json({ success: true, data: { report } });
});

export const getCommission = asyncHandler(async (_req: Request, res: Response) => {
  const config = await platformConfigService.getPlatformConfig();
  res.status(200).json({
    success: true,
    data: { commissionPercent: Number(config.commissionPercent), updatedAt: config.updatedAt },
  });
});

export const setCommission = asyncHandler(async (req: Request, res: Response) => {
  const config = await platformConfigService.setCommissionPercent(req.body.commissionPercent);
  res.status(200).json({
    success: true,
    data: { commissionPercent: Number(config.commissionPercent), updatedAt: config.updatedAt },
  });
});
