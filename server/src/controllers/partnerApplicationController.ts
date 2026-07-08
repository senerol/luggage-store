import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { AppError } from "../utils/AppError";
import * as applicationService from "../services/partnerApplicationService";

export const submit = asyncHandler(async (req: Request, res: Response) => {
  const application = await applicationService.submitApplication(req.user!.id, req.body);
  res.status(201).json({ success: true, data: { application } });
});

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const applications = await applicationService.getMyApplications(req.user!.id);
  res.status(200).json({ success: true, data: { applications } });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const application = await applicationService.getApplicationById(
    req.user!.id,
    req.user!.role,
    req.params.id
  );
  res.status(200).json({ success: true, data: { application } });
});

export const listAll = asyncHandler(async (req: Request, res: Response) => {
  const applications = await applicationService.listApplications(req.query.status as string | undefined);
  res.status(200).json({ success: true, data: { applications } });
});

export const approve = asyncHandler(async (req: Request, res: Response) => {
  const application = await applicationService.approveApplication(req.user!.id, req.params.id);
  res.status(200).json({ success: true, data: { application } });
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  if (!req.body.rejectionReason) throw AppError.badRequest("rejectionReason is required.");
  const application = await applicationService.rejectApplication(
    req.user!.id,
    req.params.id,
    req.body.rejectionReason
  );
  res.status(200).json({ success: true, data: { application } });
});

export const requestChanges = asyncHandler(async (req: Request, res: Response) => {
  if (!req.body.adminNote) throw AppError.badRequest("adminNote is required.");
  const application = await applicationService.requestChanges(req.user!.id, req.params.id, req.body.adminNote);
  res.status(200).json({ success: true, data: { application } });
});

export const suspendPartner = asyncHandler(async (req: Request, res: Response) => {
  const partner = await applicationService.suspendPartner(req.user!.id, req.params.id);
  res.status(200).json({ success: true, data: { partner } });
});

export const reinstatePartner = asyncHandler(async (req: Request, res: Response) => {
  const partner = await applicationService.reinstatePartner(req.params.id);
  res.status(200).json({ success: true, data: { partner } });
});
