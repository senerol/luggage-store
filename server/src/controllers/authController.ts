import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { setAuthCookies, clearAuthCookies, REFRESH_COOKIE } from "../utils/jwt";
import * as authService from "../services/authService";
import { AppError } from "../utils/AppError";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { accessToken, refreshToken, user } = await authService.registerUser(req.body);
  setAuthCookies(res, accessToken, refreshToken);
  res.status(201).json({ success: true, data: { user } });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { accessToken, refreshToken, user } = await authService.loginUser(req.body);
  setAuthCookies(res, accessToken, refreshToken);
  res.status(200).json({ success: true, data: { user } });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw AppError.unauthorized("No session found. Please log in.");
  const { accessToken, refreshToken, user } = await authService.refreshSession(token);
  setAuthCookies(res, accessToken, refreshToken);
  res.status(200).json({ success: true, data: { user } });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  clearAuthCookies(res);
  res.status(200).json({ success: true, data: null });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.user!.id);
  res.status(200).json({ success: true, data: { user } });
});
