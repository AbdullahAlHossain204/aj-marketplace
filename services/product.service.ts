import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import type { ProductListQuery } from '@/lib/validation/product.schema';
import { getCategoryAndDescendantIds } from '@/services/category.service';

// Only what the storefront needs to render a card — avoids pulling
// description/attributes/etc. into every list response.
const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  basePrice: true,
  discountPrice: true,
  ratingAvg: true,
  reviewCount: true,
  images: { orderBy: { position: Prisma.SortOrder.asc }, take: 1 },
  store: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ProductSelect;

export interface ListProductsResult {
  products: Awaited<ReturnType<typeof prisma.product.findMany<{ select: typeof productCardSelect }>>>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function listProducts(
  query: ProductListQuery,
  opts: { categorySlug?: string; storeSlug?: string } = {}
): Promise<ListProductsResult> {
  const where: Prisma.ProductWhereInput = {
    status: 'ACTIVE',
    deletedAt: null,
  };

  if (opts.storeSlug) {
    where.store = { slug: opts.storeSlug };
  }

  if (opts.categorySlug) {
    const categoryIds = await getCategoryAndDescendantIds(opts.categorySlug);
    // Unknown category slug → no results, not "ignore the filter". Returning
    // everything for a typo'd category URL would be confusing, not helpful.
    where.categoryId = { in: categoryIds ?? ['__no_match__'] };
  }

  if (query.category && !opts.categorySlug) {
    const categoryIds = await getCategoryAndDescendantIds(query.category);
    where.categoryId = { in: categoryIds ?? ['__no_match__'] };
  }

  if (query.brand) {
    where.brand = { slug: query.brand };
  }

  if (query.q) {
    // Postgres full-text/trigram search is the documented upgrade path
    // (see docs/ARCHITECTURE.md §A "Search") once volume demands it; a
    // contains-based OR is sufficient for MVP catalog sizes.
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { shortDescription: { contains: query.q, mode: 'insensitive' } },
      { description: { contains: query.q, mode: 'insensitive' } },
    ];
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    // Effective price is discountPrice when set, else basePrice — filter
    // must account for both cases, not just basePrice.
    const range: Prisma.DecimalFilter = {};
    if (query.minPrice !== undefined) range.gte = query.minPrice;
    if (query.maxPrice !== undefined) range.lte = query.maxPrice;
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { discountPrice: { not: null, ...range } },
          { discountPrice: null, basePrice: range },
        ],
      },
    ];
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    query.sort === 'price_asc'
      ? { basePrice: 'asc' }
      : query.sort === 'price_desc'
        ? { basePrice: 'desc' }
        : query.sort === 'rating'
          ? { ratingAvg: 'desc' }
          : // 'relevance' has no ranking signal without FTS wired up yet —
            // falls back to newest, same as the explicit 'newest' option.
            { createdAt: 'desc' };

  const skip = (query.page - 1) * query.limit;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: productCardSelect,
      orderBy,
      skip,
      take: query.limit,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, status: 'ACTIVE', deletedAt: null },
    include: {
      images: { orderBy: { position: 'asc' } },
      variants: {
        include: { inventory: true },
      },
      attributes: true,
      brand: true,
      category: true,
      store: { select: { id: true, name: true, slug: true, logoUrl: true, ratingAvg: true } },
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { name: true } } },
      },
    },
  });
}

/** Used by the PDP "related products" rail — same category, excluding itself. */
export async function getRelatedProducts(categoryId: string, excludeProductId: string, take = 8) {
  return prisma.product.findMany({
    where: {
      categoryId,
      status: 'ACTIVE',
      deletedAt: null,
      id: { not: excludeProductId },
    },
    select: productCardSelect,
    take,
    orderBy: { createdAt: 'desc' },
  });
}
