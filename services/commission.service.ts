import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

const FALLBACK_PERCENTAGE = Number(process.env.DEFAULT_COMMISSION_PERCENTAGE ?? 10);

/**
 * Resolution order (matches docs/ARCHITECTURE.md §C):
 *   1. Seller.commissionOverride, if set on the seller that owns storeId
 *   2. Commission row scoped to the product's categoryId
 *   3. Commission row scoped GLOBAL
 *   4. FALLBACK_PERCENTAGE (env), only if the seed's global row is missing
 *
 * `client` accepts a transaction client so this can run inside the
 * checkout transaction without a second, out-of-transaction connection.
 */
export async function resolveCommissionPercentage(
  storeId: string,
  categoryId: string,
  client: Prisma.TransactionClient | PrismaClient = prisma
): Promise<number> {
  const seller = await client.seller.findUnique({
    where: { storeId },
    select: { commissionOverride: true },
  });
  if (seller?.commissionOverride != null) {
    return Number(seller.commissionOverride);
  }

  const categoryRate = await client.commission.findFirst({
    where: { scope: 'CATEGORY', categoryId },
  });
  if (categoryRate) return Number(categoryRate.percentage);

  const globalRate = await client.commission.findFirst({ where: { scope: 'GLOBAL' } });
  if (globalRate) return Number(globalRate.percentage);

  return FALLBACK_PERCENTAGE;
}
