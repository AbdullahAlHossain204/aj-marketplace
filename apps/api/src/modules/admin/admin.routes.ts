import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import {
  cancelOrderHandler,
  createCategoryHandler,
  createCouponHandler,
  deactivateCouponHandler,
  deleteCategoryHandler,
  getOrderHandler,
  getStoreHandler,
  getUserHandler,
  getVendorHandler,
  listCategoriesHandler,
  listCouponsHandler,
  listOrdersHandler,
  listProductsHandler,
  listReportsHandler,
  listReviewsHandler,
  listStoresHandler,
  listUsersHandler,
  listVendorsHandler,
  moderateReviewHandler,
  platformOverviewHandler,
  revenueOverviewHandler,
  setProductStatusHandler,
  setReportStatusHandler,
  setStoreActiveHandler,
  setUserActiveHandler,
  setVendorStatusHandler,
  updateCategoryHandler,
  updateCouponHandler,
} from "./admin.controller";

export const adminRouter = Router();

// Every route below requires an authenticated ADMIN — this single
// router-level gate is the strict-authorization choke point for the whole
// control center; no individual admin route re-implements or can
// accidentally skip this check (matches the ordersRouter/vendorRouter
// pattern of gating at the router, not per-route).
adminRouter.use(authenticate, requireRole("ADMIN"));

/** Proves role-based access control works end to end. */
adminRouter.get("/ping", (req, res) => {
  res.json({ success: true, data: { message: "Admin access confirmed" }, error: null });
});

// ---- DASHBOARD: Platform overview + Revenue overview -------------------
adminRouter.get("/overview", platformOverviewHandler);
adminRouter.get("/revenue", revenueOverviewHandler);

// ---- USERS ---------------------------------------------------------------
adminRouter.get("/users", listUsersHandler);
adminRouter.get("/users/:id", getUserHandler);
adminRouter.patch("/users/:id/status", setUserActiveHandler);

// ---- VENDORS (includes vendor approval) -----------------------------------
adminRouter.get("/vendors", listVendorsHandler);
adminRouter.get("/vendors/:id", getVendorHandler);
adminRouter.patch("/vendors/:id/status", setVendorStatusHandler);

// ---- STORE MANAGEMENT -------------------------------------------------
adminRouter.get("/stores", listStoresHandler);
adminRouter.get("/stores/:id", getStoreHandler);
adminRouter.patch("/stores/:id/status", setStoreActiveHandler);

// ---- PRODUCTS ---------------------------------------------------------
adminRouter.get("/products", listProductsHandler);
adminRouter.patch("/products/:id/status", setProductStatusHandler);

// ---- CATEGORIES ---------------------------------------------------------
adminRouter.get("/categories", listCategoriesHandler);
adminRouter.post("/categories", createCategoryHandler);
adminRouter.patch("/categories/:id", updateCategoryHandler);
adminRouter.delete("/categories/:id", deleteCategoryHandler);

// ---- ORDERS ---------------------------------------------------------
adminRouter.get("/orders", listOrdersHandler);
adminRouter.get("/orders/:id", getOrderHandler);
adminRouter.post("/orders/:id/cancel", cancelOrderHandler);

// ---- REVIEWS (moderation) -------------------------------------------------
adminRouter.get("/reviews", listReviewsHandler);
adminRouter.patch("/reviews/:id/status", moderateReviewHandler);

// ---- REPORTS (review-report triage) ----------------------------------------
adminRouter.get("/reports", listReportsHandler);
adminRouter.patch("/reports/:id/status", setReportStatusHandler);

// ---- PROMOTIONS (coupons) -------------------------------------------------
adminRouter.get("/promotions", listCouponsHandler);
adminRouter.post("/promotions", createCouponHandler);
adminRouter.patch("/promotions/:id", updateCouponHandler);
adminRouter.delete("/promotions/:id", deactivateCouponHandler);
