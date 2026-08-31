import { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import { createReviewSchema, reportReviewSchema, updateReviewSchema } from "./reviews.schemas";
import * as reviewsService from "./reviews.service";

function uid(req: Request): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

export const createReviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = createReviewSchema.parse(req.body);
  const review = await reviewsService.createReview(uid(req), input);
  res.status(201).json({ success: true, data: review, error: null });
});

export const updateReviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = updateReviewSchema.parse(req.body);
  const review = await reviewsService.updateReview(uid(req), req.params.id, input);
  res.json({ success: true, data: review, error: null });
});

export const deleteReviewHandler = asyncHandler(async (req: Request, res: Response) => {
  await reviewsService.deleteReview(uid(req), req.params.id);
  res.json({ success: true, data: { message: "Review deleted" }, error: null });
});

export const reportReviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = reportReviewSchema.parse(req.body);
  const report = await reviewsService.reportReview(uid(req), req.params.id, input);
  res.status(201).json({ success: true, data: report, error: null });
});

export const getMyReviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const review = await reviewsService.getMyReview(uid(req), req.params.productId);
  res.json({ success: true, data: review, error: null });
});
