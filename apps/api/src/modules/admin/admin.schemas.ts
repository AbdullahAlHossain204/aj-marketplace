import { z } from "zod";

// ---- REVIEWS (Phase 8, extended here with listing) ----------------------

export const moderateReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const adminReviewListQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ---- SHARED LIST QUERY ----------------------------------------------------

export const adminListQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ---- USERS ----------------------------------------------------------------

export const adminUserListQuerySchema = z.object({
  role: z.enum(["CUSTOMER", "VENDOR", "ADMIN"]).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const setUserActiveSchema = z.object({
  isActive: z.boolean(),
});

// ---- VENDORS ----------------------------------------------------------------

export const adminVendorListQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const setVendorStatusSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]),
});

// ---- STORES ----------------------------------------------------------------

export const setStoreActiveSchema = z.object({
  isActive: z.boolean(),
});

// ---- PRODUCTS ----------------------------------------------------------------

export const adminProductListQuerySchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  storeId: z.string().uuid().optional(),
  search: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const setProductStatusSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]),
});

// ---- CATEGORIES ----------------------------------------------------------------

export const createCategorySchema = z.object({
  name: z.string().min(2).max(150),
  slug: z
    .string()
    .min(2)
    .max(150)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional(),
  parentId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(150).optional(),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional(),
  parentId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

// ---- ORDERS ----------------------------------------------------------------

export const adminOrderListQuerySchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
  paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ---- REPORTS ----------------------------------------------------------------

export const adminReportListQuerySchema = z.object({
  status: z.enum(["PENDING", "RESOLVED", "DISMISSED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const setReportStatusSchema = z.object({
  status: z.enum(["RESOLVED", "DISMISSED"]),
});

// ---- PROMOTIONS (COUPONS) ----------------------------------------------------

export const createCouponSchema = z
  .object({
    code: z
      .string()
      .min(3)
      .max(40)
      .regex(/^[A-Z0-9_-]+$/, "Code must be uppercase letters, numbers, hyphens, or underscores"),
    description: z.string().max(500).optional(),
    discountType: z.enum(["PERCENTAGE", "FIXED"]),
    discountValue: z.number().int().min(1),
    minOrderAmount: z.number().int().min(0).optional(),
    maxDiscountAmount: z.number().int().min(0).optional(),
    usageLimit: z.number().int().min(1).optional(),
    startsAt: z.coerce.date().optional(),
    expiresAt: z.coerce.date().optional(),
    isActive: z.boolean().default(true),
  })
  .refine((data) => data.discountType !== "PERCENTAGE" || data.discountValue <= 100, {
    message: "A percentage discount cannot exceed 100",
    path: ["discountValue"],
  });

export const updateCouponSchema = z.object({
  description: z.string().max(500).optional(),
  discountValue: z.number().int().min(1).optional(),
  minOrderAmount: z.number().int().min(0).optional(),
  maxDiscountAmount: z.number().int().min(0).optional(),
  usageLimit: z.number().int().min(1).optional(),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

// ---- TYPES ----------------------------------------------------------------

export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;
export type AdminReviewListQuery = z.infer<typeof adminReviewListQuerySchema>;
export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type SetUserActiveInput = z.infer<typeof setUserActiveSchema>;
export type AdminVendorListQuery = z.infer<typeof adminVendorListQuerySchema>;
export type SetVendorStatusInput = z.infer<typeof setVendorStatusSchema>;
export type SetStoreActiveInput = z.infer<typeof setStoreActiveSchema>;
export type AdminProductListQuery = z.infer<typeof adminProductListQuerySchema>;
export type SetProductStatusInput = z.infer<typeof setProductStatusSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;
export type AdminReportListQuery = z.infer<typeof adminReportListQuerySchema>;
export type SetReportStatusInput = z.infer<typeof setReportStatusSchema>;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
