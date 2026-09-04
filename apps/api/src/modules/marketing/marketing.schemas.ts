import { z } from "zod";

export const flashSaleInputSchema = z
  .object({
    name: z.string().min(2).max(150),
    description: z.string().max(1000).optional(),
    discountType: z.enum(["PERCENTAGE", "FIXED"]),
    discountValue: z.number().int().min(1),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    productIds: z.array(z.string().uuid()).min(1, "Select at least one product"),
  })
  .refine((d) => d.endsAt > d.startsAt, { message: "endsAt must be after startsAt", path: ["endsAt"] })
  .refine((d) => d.discountType !== "PERCENTAGE" || d.discountValue <= 100, {
    message: "A percentage discount cannot exceed 100",
    path: ["discountValue"],
  });

export const flashSaleUpdateSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  description: z.string().max(1000).optional(),
  discountValue: z.number().int().min(1).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

export const bannerInputSchema = z.object({
  title: z.string().min(1).max(150),
  imageUrl: z.string().url(),
  linkUrl: z.string().url().optional(),
  placement: z.enum(["HOMEPAGE_HERO", "HOMEPAGE_SECONDARY", "CATEGORY_TOP"]),
  displayOrder: z.number().int().min(0).default(0),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});

export const bannerUpdateSchema = bannerInputSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const featuredProductInputSchema = z.object({
  productId: z.string().uuid(),
  displayOrder: z.number().int().min(0).default(0),
});

export type FlashSaleInput = z.infer<typeof flashSaleInputSchema>;
export type FlashSaleUpdateInput = z.infer<typeof flashSaleUpdateSchema>;
export type BannerInput = z.infer<typeof bannerInputSchema>;
export type BannerUpdateInput = z.infer<typeof bannerUpdateSchema>;
export type FeaturedProductInput = z.infer<typeof featuredProductInputSchema>;
