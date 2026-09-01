import { prisma } from "../../../lib/prisma";
import { ForbiddenError, NotFoundError } from "../../../lib/errors";
import { AdminUserListQuery } from "../admin.schemas";
import { recordAuditLog } from "./audit.service";

export async function listUsers(query: AdminUserListQuery) {
  const where = {
    deletedAt: null,
    ...(query.role && { role: query.role }),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
    ...(query.search && {
      OR: [
        { name: { contains: query.search, mode: "insensitive" as const } },
        { email: { contains: query.search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        vendorProfile: { select: { status: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function getUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      deletedAt: true,
      vendorProfile: { select: { id: true, status: true, businessName: true } },
      _count: { select: { orders: true, reviews: true } },
    },
  });

  if (!user || user.deletedAt) throw new NotFoundError("User");

  const { deletedAt, ...rest } = user;
  return rest;
}

/**
 * Suspends or reactivates a user account (User.isActive). Deliberately not
 * a hard delete — a user can have orders, reviews, and store history
 * (if they're a vendor) that must remain intact for the platform's own
 * records, so "removing" a user always means deactivating, never erasing.
 * A deactivated user can no longer log in (auth.service.ts checks isActive).
 */
export async function setUserActive(adminId: string, userId: string, isActive: boolean) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) throw new NotFoundError("User");

  if (user.role === "ADMIN" && !isActive) {
    // This endpoint is for moderating customers/vendors, not for admins to
    // deactivate each other (or lock themselves out) — that needs a
    // different, more deliberate process than a single PATCH call.
    throw new ForbiddenError("Admin accounts cannot be deactivated through this endpoint");
  }

  const updated = await prisma.user.update({ where: { id: userId }, data: { isActive } });

  await recordAuditLog(adminId, isActive ? "USER_REACTIVATE" : "USER_SUSPEND", "User", userId);

  return updated;
}
