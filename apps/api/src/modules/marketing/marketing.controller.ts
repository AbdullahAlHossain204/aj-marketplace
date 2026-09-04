import { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import * as marketingService from "./marketing.service";
import * as productsService from "../products/products.service";
import { prisma } from "../../lib/prisma";
import { productListQuerySchema } from "../products/products.schemas";
import {
  bannerInputSchema,
  bannerUpdateSchema,
  featuredProductInputSchema,
  flashSaleInputSchema,
  flashSaleUpdateSchema,
} from "./marketing.schemas";

function ok(res: Response, data: unknown, status = 200) {
  res.status(status).json({ success: true, data, error: null });
}

// ---- Flash sales (admin) -------------------------------------------------

export const listFlashSalesHandler = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await marketingService.listFlashSales());
});

export const createFlashSaleHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = flashSaleInputSchema.parse(req.body);
  ok(res, await marketingService.createFlashSale(input), 201);
});

export const updateFlashSaleHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = flashSaleUpdateSchema.parse(req.body);
  ok(res, await marketingService.updateFlashSale(req.params.id, input));
});

export const deleteFlashSaleHandler = asyncHandler(async (req: Request, res: Response) => {
  await marketingService.deleteFlashSale(req.params.id);
  ok(res, { message: "Flash sale deactivated" });
});

// ---- Banners (admin write, public read) ------------------------------------

export const listAllBannersHandler = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await marketingService.listAllBanners());
});

export const createBannerHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = bannerInputSchema.parse(req.body);
  ok(res, await marketingService.createBanner(input), 201);
});

export const updateBannerHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = bannerUpdateSchema.parse(req.body);
  ok(res, await marketingService.updateBanner(req.params.id, input));
});

export const deleteBannerHandler = asyncHandler(async (req: Request, res: Response) => {
  await marketingService.deleteBanner(req.params.id);
  ok(res, { message: "Banner deleted" });
});

// ---- Featured products (admin write) ---------------------------------------

export const listFeaturedHandler = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await marketingService.listFeaturedProducts());
});

export const addFeaturedHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = featuredProductInputSchema.parse(req.body);
  ok(res, await marketingService.addFeaturedProduct(input), 201);
});

export const removeFeaturedHandler = asyncHandler(async (req: Request, res: Response) => {
  await marketingService.removeFeaturedProduct(req.params.productId);
  ok(res, { message: "Removed from featured" });
});

// ---- Recommendations (public) ----------------------------------------------

export const getRecommendationsHandler = asyncHandler(async (req: Request, res: Response) => {
  const product = await prisma.product.findUnique({ where: { slug: req.params.slug } });
  if (!product) return ok(res, []);
  ok(res, await marketingService.getRecommendedProducts(product.id));
});

// ---- Homepage composition (public) -----------------------------------------

/**
 * One call for the homepage to render every promotional section from —
 * "make promotional logic reusable and configurable" per the phase spec.
 * Reuses productsService.listProducts for new arrivals so pricing/rating
 * shape stays identical to the regular catalog, rather than duplicating it.
 */
export const getHomepageHandler = asyncHandler(async (req: Request, res: Response) => {
  const [banners, currentFlashSale, featured, newArrivalsResult] = await Promise.all([
    marketingService.listActiveBanners(),
    marketingService.getCurrentFlashSale(),
    marketingService.listFeaturedProducts(),
    productsService.listProducts(productListQuerySchema.parse({ sort: "newest", limit: 8 })),
  ]);

  ok(res, {
    banners,
    flashSale: currentFlashSale,
    featured: featured.filter((f: any) => f.product.status === "ACTIVE"),
    newArrivals: newArrivalsResult.items,
  });
});
