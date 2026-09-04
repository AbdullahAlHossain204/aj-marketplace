import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import {
  addFeaturedHandler,
  createBannerHandler,
  createFlashSaleHandler,
  deleteBannerHandler,
  deleteFlashSaleHandler,
  getHomepageHandler,
  getRecommendationsHandler,
  listAllBannersHandler,
  listFeaturedHandler,
  listFlashSalesHandler,
  removeFeaturedHandler,
  updateBannerHandler,
  updateFlashSaleHandler,
} from "./marketing.controller";

// Public routes — homepage composition and per-product recommendations,
// no auth required, mounted directly under /api/v1.
export const marketingPublicRouter = Router();
marketingPublicRouter.get("/homepage", getHomepageHandler);
marketingPublicRouter.get("/products/:slug/recommendations", getRecommendationsHandler);

// Admin-only routes — all curation actions (create/edit/delete a flash
// sale, banner, or featured slot) are platform decisions, not vendor
// self-service, consistent with how the schema comments describe them.
export const marketingAdminRouter = Router();
marketingAdminRouter.use(authenticate, requireRole("ADMIN"));

marketingAdminRouter.get("/flash-sales", listFlashSalesHandler);
marketingAdminRouter.post("/flash-sales", createFlashSaleHandler);
marketingAdminRouter.patch("/flash-sales/:id", updateFlashSaleHandler);
marketingAdminRouter.delete("/flash-sales/:id", deleteFlashSaleHandler);

marketingAdminRouter.get("/banners", listAllBannersHandler);
marketingAdminRouter.post("/banners", createBannerHandler);
marketingAdminRouter.patch("/banners/:id", updateBannerHandler);
marketingAdminRouter.delete("/banners/:id", deleteBannerHandler);

marketingAdminRouter.get("/featured", listFeaturedHandler);
marketingAdminRouter.post("/featured", addFeaturedHandler);
marketingAdminRouter.delete("/featured/:productId", removeFeaturedHandler);
