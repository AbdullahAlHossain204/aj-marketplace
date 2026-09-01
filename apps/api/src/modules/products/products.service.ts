import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../lib/errors";
import { ProductListQuery } from "./products.schemas";

function averageRating(reviews: { rating: number }[]): number | null {
  if (reviews.length === 0) return null;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

export async function listProducts(query: ProductListQuery) {
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    deletedAt: null,
    store: { isActive: true, deletedAt: null },
  };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.category) {
    where.category = { slug: query.category };
  }

  if (query.storeSlug) {
    where.store = { ...where.store, slug: query.storeSlug };
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.basePrice = {
      ...(query.minPrice !== undefined && { gte: query.minPrice }),
      ...(query.maxPrice !== undefined && { lte: query.maxPrice }),
    };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    query.sort === "price_asc"
      ? { basePrice: "asc" }
      : query.sort === "price_desc"
      ? { basePrice: "desc" }
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
        basePrice: true,
        currency: true,
        images: { orderBy: { position: "asc" }, take: 1, select: { url: true, altText: true } },
        store: { select: { name: true, slug: true } },
        category: { select: { name: true, slug: true } },
        reviews: { where: { status: "APPROVED" }, select: { rating: true } },
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
      price: p.basePrice,
      currency: p.currency,
      image: p.images[0] ?? null,
      store: p.store,
      category: p.category,
      rating: averageRating(p.reviews),
      reviewCount: p.reviews.length,
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
    where: { slug, status: "ACTIVE", deletedAt: null, store: { isActive: true, deletedAt: null } },
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

  const rating = averageRating(product.reviews.map((r) => ({ rating: r.rating })));

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
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
    rating,
    reviewCount: product.reviews.length,
    reviews: product.reviews,
  };
}
