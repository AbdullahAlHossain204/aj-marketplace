import { prisma } from "../../lib/prisma";
import { AppError, ConflictError, NotFoundError } from "../../lib/errors";
import { ActiveFlashSaleInfo } from "./pricing";
import {
  BannerInput,
  BannerUpdateInput,
  FeaturedProductInput,
  FlashSaleInput,
  FlashSaleUpdateInput,
} from "./marketing.schemas";

// ============================================================================
// SHARED: active flash-sale lookup (used by products, cart, and checkout so
// display price and charged price are always the same number)
// ============================================================================

/**
 * Batch-resolves the active flash sale (if any) for each given product id.
 * If a product were ever in more than one simultaneously-active sale (not
 * possible to create via the API below, which is deliberate — see
 * createFlashSale), the largest percentage/amount off wins, so a customer
 * is never shown or charged a worse price due to an edge case.
 */
export async function getActiveFlashSalesForProducts(
  productIds: string[]
): Promise<Map<string, ActiveFlashSaleInfo>> {
  if (productIds.length === 0) return new Map();

  const now = new Date();
  const entries = await prisma.flashSaleProduct.findMany({
    where: {
      productId: { in: productIds },
      flashSale: { isActive: true, startsAt: { lte: now }, endsAt: { gt: now } },
    },
    include: { flashSale: true },
  });

  const map = new Map<string, ActiveFlashSaleInfo>();
  for (const entry of entries) {
    const info: ActiveFlashSaleInfo = {
      id: entry.flashSale.id,
      name: entry.flashSale.name,
      discountType: entry.flashSale.discountType as "PERCENTAGE" | "FIXED",
      discountValue: entry.flashSale.discountValue,
      endsAt: entry.flashSale.endsAt,
    };
    const existing = map.get(entry.productId);
    if (!existing || info.discountValue > existing.discountValue) {
      map.set(entry.productId, info);
    }
  }
  return map;
}

// ============================================================================
// FLASH SALES (admin-curated)
// ============================================================================

export async function listFlashSales() {
  return prisma.flashSale.findMany({
    orderBy: { startsAt: "desc" },
    include: { products: { include: { product: { select: { id: true, name: true, slug: true } } } } },
  });
}

/**
 * Refuses to add a product to a new sale if it's already in another
 * currently-active sale — one product, one active campaign at a time, so
 * "which discount applies" is never ambiguous by construction rather than
 * needing the tie-break logic in getActiveFlashSalesForProducts to run.
 */
export async function createFlashSale(input: FlashSaleInput) {
  const now = new Date();
  if (input.endsAt <= now) {
    throw new AppError("endsAt must be in the future", 400);
  }

  const conflicting = await prisma.flashSaleProduct.findMany({
    where: {
      productId: { in: input.productIds },
      flashSale: { isActive: true, startsAt: { lt: input.endsAt }, endsAt: { gt: input.startsAt } },
    },
    include: { product: { select: { name: true } } },
  });
  if (conflicting.length > 0) {
    throw new ConflictError(
      `Already in another active/overlapping flash sale: ${conflicting.map((c: any) => c.product.name).join(", ")}`
    );
  }

  const products = await prisma.product.findMany({ where: { id: { in: input.productIds } } });
  if (products.length !== input.productIds.length) {
    throw new NotFoundError("One or more products");
  }

  return prisma.flashSale.create({
    data: {
      name: input.name,
      description: input.description,
      discountType: input.discountType,
      discountValue: input.discountValue,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      products: { create: input.productIds.map((productId) => ({ productId })) },
    },
    include: { products: true },
  });
}

export async function updateFlashSale(id: string, input: FlashSaleUpdateInput) {
  const sale = await prisma.flashSale.findUnique({ where: { id } });
  if (!sale) throw new NotFoundError("Flash sale");
  return prisma.flashSale.update({ where: { id }, data: input });
}

export async function deleteFlashSale(id: string) {
  const sale = await prisma.flashSale.findUnique({ where: { id } });
  if (!sale) throw new NotFoundError("Flash sale");
  await prisma.flashSale.update({ where: { id }, data: { isActive: false } });
}

/** The single flash sale (if any) currently running, for homepage display. */
export async function getCurrentFlashSale() {
  const now = new Date();
  const sale = await prisma.flashSale.findFirst({
    where: { isActive: true, startsAt: { lte: now }, endsAt: { gt: now } },
    orderBy: { endsAt: "asc" }, // the one ending soonest is most urgent to show
    include: {
      products: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              basePrice: true,
              currency: true,
              images: { take: 1, orderBy: { position: "asc" }, select: { url: true } },
            },
          },
        },
      },
    },
  });
  return sale;
}

// ============================================================================
// BANNERS (admin-curated)
// ============================================================================

export async function listActiveBanners(placement?: string) {
  const now = new Date();
  return prisma.banner.findMany({
    where: {
      isActive: true,
      ...(placement && { placement }),
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
    },
    orderBy: { displayOrder: "asc" },
  });
}

export async function listAllBanners() {
  return prisma.banner.findMany({ orderBy: [{ placement: "asc" }, { displayOrder: "asc" }] });
}

export async function createBanner(input: BannerInput) {
  return prisma.banner.create({ data: input });
}

export async function updateBanner(id: string, input: BannerUpdateInput) {
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) throw new NotFoundError("Banner");
  return prisma.banner.update({ where: { id }, data: input });
}

export async function deleteBanner(id: string) {
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) throw new NotFoundError("Banner");
  await prisma.banner.delete({ where: { id } });
}

// ============================================================================
// FEATURED PRODUCTS (admin-curated)
// ============================================================================

export async function listFeaturedProducts() {
  return prisma.featuredProduct.findMany({
    orderBy: { displayOrder: "asc" },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          basePrice: true,
          currency: true,
          status: true,
          images: { take: 1, orderBy: { position: "asc" }, select: { url: true } },
        },
      },
    },
  });
}

export async function addFeaturedProduct(input: FeaturedProductInput) {
  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product || product.deletedAt) throw new NotFoundError("Product");

  return prisma.featuredProduct.upsert({
    where: { productId: input.productId },
    update: { displayOrder: input.displayOrder },
    create: { productId: input.productId, displayOrder: input.displayOrder },
  });
}

export async function removeFeaturedProduct(productId: string) {
  const entry = await prisma.featuredProduct.findUnique({ where: { productId } });
  if (!entry) throw new NotFoundError("Featured product entry");
  await prisma.featuredProduct.delete({ where: { productId } });
}

// ============================================================================
// RECOMMENDATIONS (computed, not stored)
// ============================================================================

/** "You may also like" — same category, active, excluding the product
 * itself, ranked by rating then recency. No new schema needed; this is
 * intentionally a live query rather than a precomputed table, since a
 * catalog this size doesn't need the complexity of a recommendation job. */
export async function getRecommendedProducts(productId: string, limit = 6) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return [];

  return prisma.product.findMany({
    where: {
      id: { not: productId },
      categoryId: product.categoryId,
      status: "ACTIVE",
      deletedAt: null,
      store: { isActive: true, deletedAt: null },
    },
    orderBy: [{ averageRating: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      name: true,
      slug: true,
      brand: true,
      basePrice: true,
      currency: true,
      averageRating: true,
      reviewCount: true,
      images: { take: 1, orderBy: { position: "asc" }, select: { url: true, altText: true } },
      store: { select: { name: true, slug: true } },
      category: { select: { name: true, slug: true } },
    },
  });
}
