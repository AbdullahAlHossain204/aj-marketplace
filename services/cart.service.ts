import { prisma } from '@/lib/db/prisma';

export class CartError extends Error {
  constructor(
    message: string,
    public code: 'NOT_FOUND' | 'OUT_OF_STOCK' | 'PRODUCT_UNAVAILABLE' | 'FORBIDDEN'
  ) {
    super(message);
  }
}

const cartInclude = {
  items: {
    where: { savedForLater: false },
    orderBy: { createdAt: 'asc' as const },
    include: {
      variant: {
        include: {
          inventory: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              deletedAt: true,
              basePrice: true,
              discountPrice: true,
              images: { orderBy: { position: 'asc' as const }, take: 1 },
              store: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  },
};

async function getOrCreateCart(userId: string) {
  return prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
    include: cartInclude,
  });
}

export async function getCart(userId: string) {
  return getOrCreateCart(userId);
}

/** Lightweight count for the header cart badge — avoids pulling every
 * item's product/inventory relations just to show a number. */
export async function getCartItemCount(userId: string): Promise<number> {
  const result = await prisma.cartItem.aggregate({
    where: { cart: { userId }, savedForLater: false },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}

/** Sum of (unit price × quantity) across active line items. Unit price is
 * the variant price — always read live from the DB, never trusted from the
 * client — so the cart total is only ever an estimate until checkout
 * re-validates it inside the order transaction. */
export function computeCartSummary(cart: Awaited<ReturnType<typeof getOrCreateCart>>) {
  const subtotal = cart.items.reduce(
    (sum, item) => sum + Number(item.variant.price) * item.quantity,
    0
  );
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  return { subtotal, itemCount };
}

async function assertVariantPurchasable(variantId: string, requestedQty: number) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { inventory: true, product: { select: { status: true, deletedAt: true } } },
  });

  if (!variant || variant.product.deletedAt || variant.product.status !== 'ACTIVE') {
    throw new CartError('This product is no longer available.', 'PRODUCT_UNAVAILABLE');
  }

  const available = (variant.inventory?.quantity ?? 0) - (variant.inventory?.reserved ?? 0);
  if (available < requestedQty) {
    throw new CartError(
      available <= 0 ? 'This item is out of stock.' : `Only ${available} left in stock.`,
      'OUT_OF_STOCK'
    );
  }

  return variant;
}

export async function addItemToCart(userId: string, variantId: string, quantity: number) {
  const cart = await getOrCreateCart(userId);
  const existing = cart.items.find((i) => i.variantId === variantId);
  const totalRequested = (existing?.quantity ?? 0) + quantity;

  await assertVariantPurchasable(variantId, totalRequested);

  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    update: { quantity: totalRequested },
    create: { cartId: cart.id, variantId, quantity },
  });

  return getOrCreateCart(userId);
}

export async function updateCartItemQuantity(userId: string, itemId: string, quantity: number) {
  const item = await prisma.cartItem.findUnique({ where: { id: itemId }, include: { cart: true } });
  if (!item || item.cart.userId !== userId) {
    throw new CartError('Cart item not found.', 'NOT_FOUND');
  }

  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
    return getOrCreateCart(userId);
  }

  await assertVariantPurchasable(item.variantId, quantity);
  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  return getOrCreateCart(userId);
}

export async function removeCartItem(userId: string, itemId: string) {
  const item = await prisma.cartItem.findUnique({ where: { id: itemId }, include: { cart: true } });
  if (!item || item.cart.userId !== userId) {
    throw new CartError('Cart item not found.', 'NOT_FOUND');
  }
  await prisma.cartItem.delete({ where: { id: itemId } });
  return getOrCreateCart(userId);
}
