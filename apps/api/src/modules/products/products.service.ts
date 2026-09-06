import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../lib/errors";
import { ProductListQuery } from "./products.schemas";
import { computeEffectivePrice } from "../marketing/pricing";
import { getActiveFlashSalesForProducts } from "../marketing/marketing.service";

const activeStoreFilter = { isActive: true, deletedAt: null };

export async function listProducts(query: ProductListQuery) {
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    deletedAt: null,
    store: activeStoreFilter,
  };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
      { brand: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.category) {
    where.category = { slug: query.category };
  }

  if (query.storeSlug) {
    where.store = { ...activeStoreFilter, slug: query.storeSlug };
  }

  if (query.brand) {
    where.brand = { equals: query.brand, mode: "insensitive" };
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.basePrice = {
      ...(query.minPrice !== undefined && { gte: query.minPrice }),
      ...(query.maxPrice !== undefined && { lte: query.maxPrice }),
    };
  }

  if (query.minRating !== undefined) {
    where.averageRating = { gte: query.minRating };
  }

  if (query.inStock) {
    // Approximates "in stock" as quantity > 0, ignoring reservedQuantity.
    // reservedQuantity is currently unused everywhere else in the system
    // (always 0) — if a future phase starts actively reserving stock during
    // checkout holds, this should move to a raw query comparing the two
    // columns, since Prisma can't express a column-to-column filter here.
    where.variants = { some: { inventory: { quantity: { gt: 0 } } } };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    query.sort === "price_asc"
      ? { basePrice: "asc" }
      : query.sort === "price_desc"
      ? { basePrice: "desc" }
      : query.sort === "rating_desc"
      ? { averageRating: "desc" }
      : { createdAt: "desc" };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        name: true,
        slug: true,
        brand: true,
        basePrice: true,
        compareAtPrice: true,
        currency: true,
        averageRating: true,
        reviewCount: true,
        images: { orderBy: { position: "asc" }, take: 1, select: { url: true, altText: true } },
        store: { select: { name: true, slug: true } },
        category: { select: { name: true, slug: true } },
        variants: {
          select: { inventory: { select: { quantity: true, reservedQuantity: true } } },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const flashSales = await getActiveFlashSalesForProducts(items.map((p) => p.id));

  const data = items.map((p) => {
    const totalStock = p.variants.reduce(
      (sum, v) => sum + Math.max(0, (v.inventory?.quantity ?? 0) - (v.inventory?.reservedQuantity ?? 0)),
      0
    );
    const effective = computeEffectivePrice(p.basePrice, p.compareAtPrice, flashSales.get(p.id) ?? null);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand,
      price: effective.price,
      compareAtPrice: effective.compareAtPrice,
      flashSale: effective.activeFlashSale,
      currency: p.currency,
      image: p.images[0] ?? null,
      store: p.store,
      category: p.category,
      rating: p.averageRating,
      reviewCount: p.reviewCount,
      inStock: totalStock > 0,
    };
  });

  return {
    items: data,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, status: "ACTIVE", deletedAt: null, store: activeStoreFilter },
    include: {
      images: { orderBy: { position: "asc" } },
      category: { select: { id: true, name: true, slug: true } },
      store: { select: { id: true, name: true, slug: true, logoUrl: true } },
      variants: {
        where: { deletedAt: null },
        include: { inventory: true },
      },
      reviews: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          rating: true,
          title: true,
          comment: true,
          isVerifiedPurchase: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      },
    },
  });

  if (!product) {
    throw new NotFoundError("Product");
  }

  const flashSales = await getActiveFlashSalesForProducts([product.id]);
  const activeFlashSale = flashSales.get(product.id) ?? null;
  const topLevelEffective = computeEffectivePrice(product.basePrice, product.compareAtPrice, activeFlashSale);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    description: product.description,
    basePrice: topLevelEffective.price,
    compareAtPrice: topLevelEffective.compareAtPrice,
    currency: product.currency,
    category: product.category,
    store: product.store,
    images: product.images,
    flashSale: activeFlashSale,
    variants: product.variants.map((v) => {
      const variantBase = product.basePrice + v.priceDelta;
      const effective = computeEffectivePrice(variantBase, null, activeFlashSale);
      return {
        id: v.id,
        name: v.name,
        sku: v.sku,
        price: effective.price,
        attributes: v.attributes,
        available: Math.max(0, (v.inventory?.quantity ?? 0) - (v.inventory?.reservedQuantity ?? 0)),
      };
    }),
    // Denormalized on Product, not derived from the capped `reviews` list
    // below — computing reviewCount from a take:10 query silently
    // under-reports it for any product with more than 10 approved reviews.
    rating: product.averageRating,
    reviewCount: product.reviewCount,
    reviews: product.reviews,
  };
}

/** Lightweight typeahead results for the search bar. */
export async function getSuggestions(q: string) {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        store: activeStoreFilter,
        name: { contains: q, mode: "insensitive" },
      },
      select: { id: true, name: true, slug: true },
      take: 6,
      orderBy: { reviewCount: "desc" },
    }),
    prisma.category.findMany({
      where: { isActive: true, deletedAt: null, name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, slug: true },
      take: 3,
    }),
  ]);

  return { products, categories };
}

/** Distinct brand values across active listings, for the brand filter dropdown. */
export async function listBrands() {
  const rows = await prisma.product.findMany({
    where: { status: "ACTIVE", deletedAt: null, store: activeStoreFilter, brand: { not: null } },
    select: { brand: true },
    distinct: ["brand"],
    orderBy: { brand: "asc" },
  });
  return rows.map((r: any) => r.brand).filter(Boolean);
}
