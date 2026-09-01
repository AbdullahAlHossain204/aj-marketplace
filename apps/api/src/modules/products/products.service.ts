import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../lib/errors";
import { ProductListQuery } from "./products.schemas";

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

  const data = items.map((p) => {
    const totalStock = p.variants.reduce(
      (sum, v) => sum + Math.max(0, (v.inventory?.quantity ?? 0) - (v.inventory?.reservedQuantity ?? 0)),
      0
    );
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand,
      price: p.basePrice,
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

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    description: product.description,
    basePrice: product.basePrice,
    currency: product.currency,
    category: product.category,
    store: product.store,
    images: product.images,
    variants: product.variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: product.basePrice + v.priceDelta,
      attributes: v.attributes,
      available: Math.max(0, (v.inventory?.quantity ?? 0) - (v.inventory?.reservedQuantity ?? 0)),
    })),
    // Denormalized on Product, not derived from the capped `reviews` list
    // below — the previous implementation computed reviewCount from that
    // same take:10 query, which silently under-reported the count for any
    // product with more than 10 approved reviews. This is the accurate,
    // real total; `reviews` below is just the latest 10 for display.
    rating: product.averageRating,
    reviewCount: product.reviewCount,
    reviews: product.reviews,
  };
}

/**
 * Lightweight typeahead results for the search bar: a handful of matching
 * product names plus matching categories, so the dropdown stays fast and
 * doesn't ship full product payloads for every keystroke.
 */
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

/** Distinct brand values across active listings, for the brand filter
 * dropdown. Upgrade path: once the catalog is large enough that this scan
 * is slow, cache it (e.g. Redis, TTL a few minutes) rather than querying
 * live — not needed at current scale. */
export async function listBrands() {
  const rows = await prisma.product.findMany({
    where: { status: "ACTIVE", deletedAt: null, store: activeStoreFilter, brand: { not: null } },
    select: { brand: true },
    distinct: ["brand"],
    orderBy: { brand: "asc" },
  });
  return rows.map((r: any) => r.brand).filter(Boolean);
}
