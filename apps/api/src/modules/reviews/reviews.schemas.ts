import { z } from "zod";

export const createReviewSchema = z.object({
  productId: z.string().uuid("Invalid product id"),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(1).max(120).optional(),
  comment: z.string().trim().min(1).max(2000).optional(),
});

export const updateReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    title: z.string().trim().min(1).max(120).optional(),
    comment: z.string().trim().min(1).max(2000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field (rating, title, comment) must be provided",
  });

export const reportReviewSchema = z.object({
  reason: z.enum(["SPAM", "ABUSIVE", "OFFENSIVE", "FAKE", "OTHER"]),
  details: z.string().trim().min(1).max(500).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type ReportReviewInput = z.infer<typeof reportReviewSchema>;
