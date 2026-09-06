import { z } from "zod";

export const productListQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  category: z.string().trim().min(1).max(200).optional(), // category slug
  storeSlug: z.string().trim().min(1).max(200).optional(),
  brand: z.string().trim().min(1).max(100).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  // z.coerce.boolean() would treat the string "false" as truthy
  // (JS Boolean("false") === true) — an explicit enum avoids that trap.
  inStock: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "rating_desc"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const suggestQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type SuggestQuery = z.infer<typeof suggestQuerySchema>;
