import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";
import { isProd } from "../config/env";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Centralized error handler. Every route/controller throws AppError (or lets
// Zod/Prisma errors bubble up) and this is the single place that turns them
// into a consistent JSON shape. Never leaks stack traces or raw DB errors.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (!isProd) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  if (err instanceof ZodError) {
    const message = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    return res.status(400).json({ success: false, message });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ success: false, message: "A record with these details already exists." });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "Resource not found." });
    }
    return res.status(400).json({ success: false, message: "Database request failed." });
  }

  return res.status(500).json({ success: false, message: "Internal server error." });
}
