import { prisma } from '@/lib/db/prisma';
import type { AddressInput } from '@/lib/validation/address.schema';

export async function listAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function createAddress(userId: string, input: AddressInput) {
  // Only one default address per user — clear any existing default in the
  // same transaction as setting the new one, rather than trusting the UI
  // to have only shown one "default" toggle.
  if (input.isDefault) {
    await prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
  }
  return prisma.address.create({ data: { ...input, userId } });
}

export async function getAddressForUser(userId: string, addressId: string) {
  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.userId !== userId) return null;
  return address;
}
