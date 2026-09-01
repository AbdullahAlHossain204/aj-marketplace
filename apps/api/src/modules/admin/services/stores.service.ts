import { prisma } from "../../../lib/prisma";
import { NotFoundError } from "../../../lib/errors";
import { AdminListQuery } from "../admin.schemas";
import { recordAuditLog } from "./audit.service";

export async function listStores(query: AdminListQuery) {
  const where = {
    deletedAt: null,
    ...(query.search && { name: { contains: query.search, mode: "insensitive" as const } }),
  };

  const [items, total] = await Promise.all([
    prisma.store.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        vendorProfile: { select: { id: true, status: true, businessName: true } },
        _count: { select: { products: true } },
      },
    }),
    prisma.store.count({ where }),
  ]);

  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function getStore(storeId: string) {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      vendorProfile: { select: { id: true, status: true, businessName: true, user: { select: { name: true, email: true } } } },
      _count: { select: { products: true } },
    },
  });

  if (!store || store.deletedAt) throw new NotFoundError("Store");
  return store;
}

/**
 * Suspends or reactivates a store platform-wide (Store.isActive) — e.g. for
 * policy violations. This is deliberately a coarser, faster tool than
 * unpublishing products one at a time: an inactive store's products stop
 * appearing in listings (products.service.ts filters on
 * `store: { isActive: true }`) without the admin having to touch the
 * vendor's approval status or archive every individual product.
 */
export async function setStoreActive(adminId: string, storeId: string, isActive: boolean) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store || store.deletedAt) throw new NotFoundError("Store");

  const updated = await prisma.store.update({ where: { id: storeId }, data: { isActive } });

  await recordAuditLog(adminId, isActive ? "STORE_REACTIVATE" : "STORE_SUSPEND", "Store", storeId);

  return updated;
}
