import { Router } from "express";
import rateLimit from "express-rate-limit";
import { loginHandler, logoutHandler, refreshHandler, registerHandler } from "./auth.controller";

export const authRouter = Router();

// Credential-guessing endpoints get a much tighter limit than the global
// API rate limit — slows brute-force login/registration attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: { message: "Too many attempts. Please try again later." },
  },
});

authRouter.post("/register", authLimiter, registerHandler);
authRouter.post("/login", authLimiter, loginHandler);
authRouter.post("/refresh", refreshHandler);
authRouter.post("/logout", logoutHandler);
