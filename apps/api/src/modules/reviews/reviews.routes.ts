import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import {
  createReviewHandler,
  deleteReviewHandler,
  getMyReviewHandler,
  reportReviewHandler,
  updateReviewHandler,
} from "./reviews.controller";

export const reviewsRouter = Router();

// Review and report submission get a tighter limit than the global API
// rate limit — same rationale as auth.routes.ts's authLimiter — to deter
// spam/abuse submissions.
const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: { message: "Too many submissions. Please try again later." },
  },
});

reviewsRouter.use(authenticate, requireRole("CUSTOMER"));

reviewsRouter.post("/", reviewLimiter, createReviewHandler);
reviewsRouter.patch("/:id", updateReviewHandler);
reviewsRouter.delete("/:id", deleteReviewHandler);
reviewsRouter.post("/:id/report", reviewLimiter, reportReviewHandler);
reviewsRouter.get("/mine/:productId", getMyReviewHandler);
