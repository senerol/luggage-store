import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { AppError } from "../utils/AppError";
import { ACCESS_COOKIE, verifyAccessToken } from "../utils/jwt";

// Verifies the access-token cookie and attaches { id, role } to req.user.
// Every protected route depends on this running first — authorization
// decisions (below) are then made server-side from req.user, never from
// anything the client claims in the request body.
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) {
    return next(AppError.unauthorized("You must be logged in to do this."));
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(AppError.unauthorized("Your session has expired. Please log in again."));
  }
}

// Optional auth: attaches req.user if a valid cookie is present, but does not
// reject the request otherwise. Useful for endpoints that are public but
// behave slightly differently for logged-in users.
export function attachUserIfPresent(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
  } catch {
    // ignore invalid/expired token on optional-auth routes
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden("Your account type cannot access this resource."));
    }
    next();
  };
}
