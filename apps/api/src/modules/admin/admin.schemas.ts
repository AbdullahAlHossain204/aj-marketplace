import { z } from "zod";

export const moderateReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;
