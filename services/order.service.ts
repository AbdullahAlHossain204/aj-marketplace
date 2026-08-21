import { prisma } from '@/lib/db/prisma';
import { generateOrderNumber } from '@/lib/utils/order-number';
import { resolveCommissionPercentage } from '@/services/commission.service';
import { codAdapter } from '@/services/payment/cod.adapter';
import type { CheckoutInput } from '@/lib/validation/checkout.schema';

export class CheckoutError extends Error {
  constructor(
    message: string,
    public code: 'EMPTY_CART' | 'OUT_OF_STOCK' | 'ADDRESS_NOT_FOUND' | 'PRODUCT_UNAVAILABLE'
  ) {
    super(message);
  }
}

// Flat delivery fee for MVP — the schema/service layer already isolates this
// behind order.service so a per-store or distance-based fee can be dropped
// in later without touching call sites (checkout route, cart summary).
const DELIVERY_FEE = Number(process.env.DELIVERY_FEE ?? 60);

/**
 * Turns the user's cart into a real order. Everything price/stock-related
 * is re-read and re-validated *inside* the transaction — the cart's cached
 * quantities/prices are a UX convenience only, never trusted as the source
 * of truth (docs/ARCHITECTURE.md §H).
 */
export async function createOrderFromCart(userId: string, input: CheckoutInput) {
  const address = await prisma.address.findUnique({ where: { id: input.shippingAddressId } });
  if (!address || address.userId !== userId) {
    throw new CheckoutError('Shipping address not found.', 'ADDRESS_NOT_FOUND');
  }

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        where: { savedForLater: false },
        include: {
          variant: {
            include: {
              inventory: true,
              product: { select: { id: true, storeId: true, categoryId: true, status: true, deletedAt: true } },
            },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new CheckoutError('Your cart is empty.', 'EMPTY_CART');
  }

  const order = await prisma.$transaction(async (tx) => {
    // Re-fetch each line fresh inside the transaction so a concurrent
    // purchase that exhausts stock between "view cart" and "place order"
    // is caught here, not assumed away.
    const validatedLines = [];
    for (const item of cart.items) {
      const variant = await tx.productVariant.findUnique({
        where: { id: item.variantId },
        include: { inventory: true, product: true },
      });
      if (!variant || variant.product.deletedAt || variant.product.status !== 'ACTIVE') {
        throw new CheckoutError(`"${variant?.product.name ?? 'An item'}" is no longer available.`, 'PRODUCT_UNAVAILABLE');
      }
      const available = (variant.inventory?.quantity ?? 0) - (variant.inventory?.reserved ?? 0);
      if (available < item.quantity) {
        throw new CheckoutError(`Only ${available} left of "${variant.product.name}".`, 'OUT_OF_STOCK');
      }
      validatedLines.push({ item, variant });
    }

    // Group by store — one SellerOrder per store within the parent Order.
    const byStore = new Map<string, typeof validatedLines>();
    for (const line of validatedLines) {
      const storeId = line.variant.product.storeId;
      const bucket = byStore.get(storeId) ?? [];
      bucket.push(line);
      byStore.set(storeId, bucket);
    }

    const subtotal = validatedLines.reduce(
      (sum, l) => sum + Number(l.variant.price) * l.item.quantity,
      0
    );
    const total = subtotal + DELIVERY_FEE;

    const createdOrder = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        shippingAddressId: address.id,
        subtotal,
        discountTotal: 0,
        deliveryFee: DELIVERY_FEE,
        total,
        paymentStatus: 'PENDING',
        orderStatus: 'PENDING',
      },
    });

    for (const [storeId, lines] of byStore) {
      const storeSubtotal = lines.reduce((sum, l) => sum + Number(l.variant.price) * l.item.quantity, 0);
      const categoryId = lines[0]!.variant.product.categoryId;
      const commissionPct = await resolveCommissionPercentage(storeId, categoryId, tx);
      const commissionAmount = Math.round(storeSubtotal * (commissionPct / 100) * 100) / 100;
      const sellerPayout = storeSubtotal - commissionAmount;

      const sellerOrder = await tx.sellerOrder.create({
        data: {
          orderId: createdOrder.id,
          storeId,
          subtotal: storeSubtotal,
          commissionAmount,
          sellerPayout,
          status: 'PENDING',
        },
      });

      await tx.commissionLedgerEntry.create({
        data: { sellerOrderId: sellerOrder.id, amount: commissionAmount, type: 'earned' },
      });

      for (const { item, variant } of lines) {
        await tx.orderItem.create({
          data: {
            sellerOrderId: sellerOrder.id,
            variantId: variant.id,
            quantity: item.quantity,
            priceAtPurchase: variant.price,
            discountAtPurchase: 0,
          },
        });

        // Reserve stock (not decrement yet) — actual quantity is decremented
        // when the seller/admin confirms fulfillment in a later phase; this
        // just prevents the same units being oversold in a concurrent
        // checkout.
        await tx.inventory.update({
          where: { variantId: variant.id },
          data: { reserved: { increment: item.quantity } },
        });
        await tx.inventoryHistory.create({
          data: {
            inventoryId: variant.inventory!.id,
            change: -item.quantity,
            reason: 'order_placed',
            orderId: createdOrder.id,
          },
        });
      }
    }

    const paymentResult = await codAdapter.initiate({ orderId: createdOrder.id, amount: total });
    await tx.payment.create({
      data: {
        orderId: createdOrder.id,
        provider: 'cod',
        providerRef: paymentResult.providerRef,
        amount: total,
        status: paymentResult.status,
      },
    });

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return createdOrder;
  });

  return order;
}

const orderDetailInclude = {
  shippingAddress: true,
  payments: true,
  sellerOrders: {
    include: {
      store: { select: { name: true, slug: true, logoUrl: true } },
      shipment: true,
      items: {
        include: {
          variant: {
            include: {
              product: { select: { name: true, slug: true, images: { take: 1, orderBy: { position: 'asc' as const } } } },
            },
          },
        },
      },
    },
  },
};

export async function listOrdersForUser(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { sellerOrders: { select: { id: true, status: true, storeId: true } } },
  });
}

export async function getOrderForUser(userId: string, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderDetailInclude,
  });
  if (!order || order.userId !== userId) return null;
  return order;
}
