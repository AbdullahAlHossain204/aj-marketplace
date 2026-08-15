import { prisma } from '@/lib/db/prisma';

export type AppRole = 'admin' | 'seller' | 'customer';

/**
 * Re-derives the user's role and permission set from the database on every
 * call. We deliberately do NOT trust a role claim cached on the session
 * object for authorization-critical checks (session role is fine for UI
 * display, never for gating an action) — suspending a seller must take
 * effect immediately, not after their session expires.
 */
export async function getUserRoleAndPermissions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      status: true,
      role: {
        select: {
          name: true,
          permissions: {
            select: { permission: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!user || user.status !== 'ACTIVE') {
    return null;
  }

  return {
    role: user.role.name as AppRole,
    permissions: user.role.permissions.map((p) => p.permission.name),
  };
}

export async function requireRole(userId: string, allowed: AppRole[]): Promise<boolean> {
  const info = await getUserRoleAndPermissions(userId);
  if (!info) return false;
  return allowed.includes(info.role);
}

export async function requirePermission(userId: string, permission: string): Promise<boolean> {
  const info = await getUserRoleAndPermissions(userId);
  if (!info) return false;
  return info.permissions.includes(permission);
}

/**
 * Seller-specific ownership check: confirms the given user is the seller
 * that owns `storeId`. Every /api/seller/* route must call this before
 * acting on store-scoped data — a seller must never be able to reach
 * another store's orders/products by guessing an ID.
 */
export async function requireStoreOwnership(userId: string, storeId: string): Promise<boolean> {
  const seller = await prisma.seller.findUnique({
    where: { userId },
    select: { storeId: true },
  });
  return seller?.storeId === storeId;
}
