import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";
import { errorReporter } from "../lib/errorReporter";
import { env } from "../config/env";

/**
 * Single place that turns any thrown error into a consistent JSON response.
 * Must be registered LAST, after all routes.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  // Known, expected errors (validation, not found, auth, etc.)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      data: null,
      error: { message: err.message },
    });
  }

  // Zod validation errors that weren't already wrapped.
  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      data: null,
      error: {
        message: "Validation failed",
        details: err.flatten().fieldErrors,
      },
    });
  }

  // Anything else is unexpected — log full detail server-side, never leak
  // stack traces or internals to the client, and report it to the error
  // monitoring provider (see lib/errorReporter.ts) since this represents
  // an actual bug someone should be alerted to, unlike an AppError.
  logger.error("Unhandled error", {
    path: req.path,
    method: req.method,
    error: err instanceof Error ? err.stack : String(err),
  });
  errorReporter.captureException(err, { path: req.path, method: req.method });

  return res.status(500).json({
    success: false,
    data: null,
    error: {
      message:
        env.NODE_ENV === "production"
          ? "Internal server error"
          : err instanceof Error
          ? err.message
          : "Internal server error",
    },
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    data: null,
    error: { message: `Route ${req.method} ${req.path} not found` },
  });
}
