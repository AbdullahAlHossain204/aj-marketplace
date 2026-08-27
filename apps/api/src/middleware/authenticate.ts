import { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../lib/errors";
import { verifyAccessToken } from "../lib/tokens";

/**
 * Requires a valid `Authorization: Bearer <accessToken>` header.
 * Never trusts a role or user id sent by the client directly — everything
 * about `req.user` comes only from a verified, signed token.
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    throw new UnauthorizedError("Invalid or expired access token");
  }
}

/**
 * Like `authenticate`, but doesn't fail if no token is present — useful for
 * routes that behave differently for logged-in vs anonymous users without
 * requiring login (e.g. product listing with personalized wishlisting state).
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next();
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
  } catch {
    // Invalid/expired token on an optional route — proceed as anonymous.
  }

  next();
}
