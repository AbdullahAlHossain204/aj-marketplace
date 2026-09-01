import { z } from "zod";

export const createStoreSchema = z.object({
  name: z.string().min(2).max(150),
  slug: z
    .string()
    .min(2)
    .max(150)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  description: z.string().max(2000).optional(),
  logoUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
});

export const updateStoreSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  description: z.string().max(2000).optional(),
  logoUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

const variantInputSchema = z.object({
  name: z.string().min(1).max(150),
  sku: z.string().min(1).max(100),
  priceDelta: z.number().int().default(0),
  attributes: z.record(z.string()).optional(),
  quantity: z.number().int().min(0).default(0),
});

export const createProductSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  description: z.string().max(5000).optional(),
  categoryId: z.string().uuid(),
  basePrice: z.number().int().min(0),
  currency: z.string().length(3).default("BDT"),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]).default("DRAFT"),
  images: z.array(z.object({ url: z.string().url(), altText: z.string().max(200).optional() })).max(10).default([]),
  variants: z.array(variantInputSchema).min(1, "At least one variant is required"),
});

export const updateProductSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(5000).optional(),
  categoryId: z.string().uuid().optional(),
  basePrice: z.number().int().min(0).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});

export const updateInventorySchema = z.object({
  quantity: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).optional(),
});

export const addImageSchema = z.object({
  url: z.string().url(),
  altText: z.string().max(200).optional(),
  position: z.number().int().min(0).default(0),
});

export const productListQuerySchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>;
export type AddImageInput = z.infer<typeof addImageSchema>;
export type VendorProductListQuery = z.infer<typeof productListQuerySchema>;
