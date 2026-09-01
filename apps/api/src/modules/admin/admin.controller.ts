import { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
// Reused directly from the reviews module rather than duplicated — the
// same cross-module pattern vendor.controller.ts uses for order status
// updates (importing orders.schemas / calling into orders.service-adjacent
// logic).
import * as reviewsService from "../reviews/reviews.service";
import * as dashboardService from "./services/dashboard.service";
import * as usersService from "./services/users.service";
import * as vendorsService from "./services/vendors.service";
import * as storesService from "./services/stores.service";
import * as productsService from "./services/products.service";
import * as categoriesService from "./services/categories.service";
import * as ordersService from "./services/orders.service";
import * as reportsService from "./services/reports.service";
import * as promotionsService from "./services/promotions.service";
import { recordAuditLog } from "./services/audit.service";
import {
  adminListQuerySchema,
  adminOrderListQuerySchema,
  adminProductListQuerySchema,
  adminReportListQuerySchema,
  adminReviewListQuerySchema,
  adminUserListQuerySchema,
  adminVendorListQuerySchema,
  createCategorySchema,
  createCouponSchema,
  moderateReviewSchema,
  setProductStatusSchema,
  setReportStatusSchema,
  setStoreActiveSchema,
  setUserActiveSchema,
  setVendorStatusSchema,
  updateCategorySchema,
  updateCouponSchema,
} from "./admin.schemas";

function aid(req: Request): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

// ---- DASHBOARD --------------------------------------------------------

export const platformOverviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getPlatformOverview();
  res.json({ success: true, data, error: null });
});

export const revenueOverviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
  const data = await dashboardService.getRevenueOverview(days);
  res.json({ success: true, data, error: null });
});

// ---- USERS --------------------------------------------------------

export const listUsersHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = adminUserListQuerySchema.parse(req.query);
  const result = await usersService.listUsers(query);
  res.json({ success: true, data: result.items, error: null, meta: { pagination: result.pagination } });
});

export const getUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.getUser(req.params.id);
  res.json({ success: true, data: user, error: null });
});

export const setUserActiveHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = setUserActiveSchema.parse(req.body);
  const user = await usersService.setUserActive(aid(req), req.params.id, input.isActive);
  res.json({ success: true, data: user, error: null });
});

// ---- VENDORS --------------------------------------------------------

export const listVendorsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = adminVendorListQuerySchema.parse(req.query);
  const result = await vendorsService.listVendors(query);
  res.json({ success: true, data: result.items, error: null, meta: { pagination: result.pagination } });
});

export const getVendorHandler = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await vendorsService.getVendor(req.params.id);
  res.json({ success: true, data: vendor, error: null });
});

export const setVendorStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = setVendorStatusSchema.parse(req.body);
  const vendor = await vendorsService.setVendorStatus(aid(req), req.params.id, input.status);
  res.json({ success: true, data: vendor, error: null });
});

// ---- STORES --------------------------------------------------------

export const listStoresHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = adminListQuerySchema.parse(req.query);
  const result = await storesService.listStores(query);
  res.json({ success: true, data: result.items, error: null, meta: { pagination: result.pagination } });
});

export const getStoreHandler = asyncHandler(async (req: Request, res: Response) => {
  const store = await storesService.getStore(req.params.id);
  res.json({ success: true, data: store, error: null });
});

export const setStoreActiveHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = setStoreActiveSchema.parse(req.body);
  const store = await storesService.setStoreActive(aid(req), req.params.id, input.isActive);
  res.json({ success: true, data: store, error: null });
});

// ---- PRODUCTS --------------------------------------------------------

export const listProductsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = adminProductListQuerySchema.parse(req.query);
  const result = await productsService.listProducts(query);
  res.json({ success: true, data: result.items, error: null, meta: { pagination: result.pagination } });
});

export const setProductStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = setProductStatusSchema.parse(req.body);
  const product = await productsService.setProductStatus(aid(req), req.params.id, input.status);
  res.json({ success: true, data: product, error: null });
});

// ---- CATEGORIES --------------------------------------------------------

export const listCategoriesHandler = asyncHandler(async (req: Request, res: Response) => {
  const categories = await categoriesService.listAllCategories();
  res.json({ success: true, data: categories, error: null });
});

export const createCategoryHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = createCategorySchema.parse(req.body);
  const category = await categoriesService.createCategory(aid(req), input);
  res.status(201).json({ success: true, data: category, error: null });
});

export const updateCategoryHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = updateCategorySchema.parse(req.body);
  const category = await categoriesService.updateCategory(aid(req), req.params.id, input);
  res.json({ success: true, data: category, error: null });
});

export const deleteCategoryHandler = asyncHandler(async (req: Request, res: Response) => {
  await categoriesService.deleteCategory(aid(req), req.params.id);
  res.json({ success: true, data: { message: "Category deleted" }, error: null });
});

// ---- ORDERS --------------------------------------------------------

export const listOrdersHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = adminOrderListQuerySchema.parse(req.query);
  const result = await ordersService.listOrders(query);
  res.json({ success: true, data: result.items, error: null, meta: { pagination: result.pagination } });
});

export const getOrderHandler = asyncHandler(async (req: Request, res: Response) => {
  const order = await ordersService.getOrder(req.params.id);
  res.json({ success: true, data: order, error: null });
});

export const cancelOrderHandler = asyncHandler(async (req: Request, res: Response) => {
  const order = await ordersService.cancelOrder(aid(req), req.params.id);
  res.json({ success: true, data: order, error: null });
});

// ---- REVIEWS --------------------------------------------------------

export const listReviewsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = adminReviewListQuerySchema.parse(req.query);
  const result = await reviewsService.listReviewsForModeration(query.status, query.page, query.limit);
  res.json({ success: true, data: result.items, error: null, meta: { pagination: result.pagination } });
});

export const moderateReviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = moderateReviewSchema.parse(req.body);
  const review = await reviewsService.moderateReviewStatus(req.params.id, input.status);
  await recordAuditLog(aid(req), "REVIEW_MODERATE", "Review", req.params.id, { status: input.status });
  res.json({ success: true, data: review, error: null });
});

// ---- REPORTS --------------------------------------------------------

export const listReportsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = adminReportListQuerySchema.parse(req.query);
  const result = await reportsService.listReports(query);
  res.json({ success: true, data: result.items, error: null, meta: { pagination: result.pagination } });
});

export const setReportStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = setReportStatusSchema.parse(req.body);
  const report = await reportsService.setReportStatus(aid(req), req.params.id, input.status);
  res.json({ success: true, data: report, error: null });
});

// ---- PROMOTIONS --------------------------------------------------------

export const listCouponsHandler = asyncHandler(async (req: Request, res: Response) => {
  const coupons = await promotionsService.listCoupons();
  res.json({ success: true, data: coupons, error: null });
});

export const createCouponHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = createCouponSchema.parse(req.body);
  const coupon = await promotionsService.createCoupon(aid(req), input);
  res.status(201).json({ success: true, data: coupon, error: null });
});

export const updateCouponHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = updateCouponSchema.parse(req.body);
  const coupon = await promotionsService.updateCoupon(aid(req), req.params.id, input);
  res.json({ success: true, data: coupon, error: null });
});

export const deactivateCouponHandler = asyncHandler(async (req: Request, res: Response) => {
  await promotionsService.deactivateCoupon(aid(req), req.params.id);
  res.json({ success: true, data: { message: "Coupon deactivated" }, error: null });
});
