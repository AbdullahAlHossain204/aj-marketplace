import { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import { loginSchema, registerSchema } from "./auth.schemas";
import * as authService from "./auth.service";
import { clearRefreshCookie, getRefreshCookie, setRefreshCookie } from "./auth.cookies";

export const registerHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body);
  const result = await authService.register(input);

  setRefreshCookie(res, result.refreshToken);

  res.status(201).json({
    success: true,
    data: { accessToken: result.accessToken, user: result.user },
    error: null,
  });
});

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);
  const result = await authService.login(input);

  setRefreshCookie(res, result.refreshToken);

  res.json({
    success: true,
    data: { accessToken: result.accessToken, user: result.user },
    error: null,
  });
});

export const refreshHandler = asyncHandler(async (req: Request, res: Response) => {
  const presentedToken = getRefreshCookie(req.cookies);
  if (!presentedToken) {
    throw new UnauthorizedError("No refresh token provided");
  }

  const result = await authService.refresh(presentedToken);
  setRefreshCookie(res, result.refreshToken);

  res.json({
    success: true,
    data: { accessToken: result.accessToken, user: result.user },
    error: null,
  });
});

export const logoutHandler = asyncHandler(async (req: Request, res: Response) => {
  const presentedToken = getRefreshCookie(req.cookies);
  if (presentedToken) {
    await authService.logout(presentedToken);
  }
  clearRefreshCookie(res);

  res.json({ success: true, data: { message: "Logged out" }, error: null });
});
