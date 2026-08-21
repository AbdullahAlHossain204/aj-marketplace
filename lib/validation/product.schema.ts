import { z } from 'zod';

export const productSortSchema = z.enum(['newest', 'price_asc', 'price_desc', 'rating', 'relevance']);
export type ProductSort = z.infer<typeof productSortSchema>;

// Shared by the /api/products route (server authority) and the storefront
// pages that build the query string (client convenience) — same rule as
// auth.schema.ts: define validation once, use it on both sides.
export const productListQuerySchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  category: z.string().trim().optional(), // category slug
  brand: z.string().trim().optional(), // brand slug
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  sort: productSortSchema.default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;
