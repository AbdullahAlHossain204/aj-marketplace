import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { ForbiddenError, UnauthorizedError } from "../lib/errors";

/**
 * Restricts a route to specific roles. Must run after `authenticate`.
 * Usage: router.get("/admin/stuff", authenticate, requireRole("ADMIN"), handler)
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError("Authentication required");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError("You do not have permission to perform this action");
    }

    next();
  };
}
