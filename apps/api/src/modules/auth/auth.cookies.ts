import { Response } from "express";
import { env } from "../../config/env";
import { parseDurationToMs } from "../../lib/tokens";

const REFRESH_COOKIE_NAME = "ajmarket_refresh_token";

export function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    // Scoped to the auth routes only — the cookie is never sent on
    // unrelated requests, limiting blast radius if it's ever leaked.
    path: "/api/v1/auth",
    maxAge: parseDurationToMs(env.REFRESH_TOKEN_TTL),
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth",
  });
}

export function getRefreshCookie(cookies: Record<string, string>): string | undefined {
  return cookies[REFRESH_COOKIE_NAME];
}
