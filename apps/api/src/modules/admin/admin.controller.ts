import { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
// Reused directly from the reviews module rather than duplicated — the
// same cross-module pattern vendor.controller.ts uses for order status
// updates (importing orders.schemas / calling into orders.service-adjacent
// logic).
import * as reviewsService from "../reviews/reviews.service";
import { moderateReviewSchema } from "./admin.schemas";

export const moderateReviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = moderateReviewSchema.parse(req.body);
  const review = await reviewsService.moderateReviewStatus(req.params.id, input.status);
  res.json({ success: true, data: review, error: null });
});
