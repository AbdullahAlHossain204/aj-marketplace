import { prisma } from "../../../lib/prisma";
import { NotFoundError } from "../../../lib/errors";
import { AdminProductListQuery } from "../admin.schemas";
import { recordAuditLog } from "./audit.service";

export async function listProducts(query: AdminProductListQuery) {
  const where = {
    deletedAt: null,
    ...(query.status && { status: query.status }),
    ...(query.storeId && { storeId: query.storeId }),
    ...(query.search && { name: { contains: query.search, mode: "insensitive" as const } }),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        currency: true,
        status: true,
        createdAt: true,
        store: { select: { id: true, name: true, slug: true } },
        category: { select: { name: true, slug: true } },
        images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

/**
 * Admin's moderation power over a product is deliberately narrow: it can
 * only change `status` (e.g. force it off ACTIVE for a policy violation,
 * or reinstate it), never the product's actual content (name, price,
 * images, variants) — that stays the vendor's own responsibility. This
 * keeps the admin's authority limited to "take it down / bring it back",
 * not silent rewriting of a vendor's listing.
 */
export async function setProductStatus(adminId: string, productId: string, status: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.deletedAt) throw new NotFoundError("Product");

  const updated = await prisma.product.update({ where: { id: productId }, data: { status: status as any } });

  await recordAuditLog(adminId, "PRODUCT_STATUS_OVERRIDE", "Product", productId, {
    from: product.status,
    to: status,
  });

  return updated;
}
