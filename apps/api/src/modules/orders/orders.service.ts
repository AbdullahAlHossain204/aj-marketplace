import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { AppError, ForbiddenError, NotFoundError } from "../../lib/errors";
import { CANCELLABLE_STATUSES } from "../../lib/orderStatusMachine";
import { CheckoutInput, OrderListQuery } from "./orders.schemas";
import { chargeForCheckout, recordTransaction, refundFailedCheckout, refundOrder, listOrderTransactions } from "../payments/payments.service";
import {
  notifyLowStock,
  notifyOrderCancelled,
  notifyOrderPlaced,
  notifyOrderStatusChanged,
  notifyVendorsOfNewOrder,
} from "../notifications/notifications.service";
import { logger } from "../../lib/logger";
import { computeEffectivePrice } from "../marketing/pricing";
import { getActiveFlashSalesForProducts } from "../marketing/marketing.service";

// Flat shipping fee per order (smallest currency unit). Real per-vendor or
// distance-based shipping logic is a Phase 13 (delivery) concern.
const SHIPPING_FLAT_RATE = 6000; // 60.00

function generateOrderNumber(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `AJ-${datePart}-${randomPart}`;
}

/**
 * Places an order from the customer's current cart.
 *
 * Inventory safety: each variant's stock is decremented with a single
 * conditional UPDATE (`WHERE quantity >= requested`) inside the same
 * transaction as order creation. If two customers race for the last unit,
 * the second UPDATE affects zero rows and we abort the whole transaction —
 * no oversell is possible, and no explicit row locking is needed.
 */
export async function checkout(userId: string, input: CheckoutInput) {
  const address = await prisma.address.findUnique({ where: { id: input.addressId } });
  if (!address || address.deletedAt) throw new NotFoundError("Address");
  if (address.userId !== userId) throw new ForbiddenError("This address does not belong to you");

  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) throw new AppError("Your cart is empty", 400);

  const cartWithItems = await prisma.cart.findUniqueOrThrow({
    where: { id: cart.id },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, storeId: true, status: true, deletedAt: true } },
          productVariant: { select: { id: true, name: true, priceDelta: true } },
        },
      },
    },
  });

  if (cartWithItems.items.length === 0) {
    throw new AppError("Your cart is empty", 400);
  }

  for (const item of cartWithItems.items) {
    if (item.product.status !== "ACTIVE" || item.product.deletedAt) {
      throw new AppError(`"${item.product.name}" is no longer available`, 409);
    }
  }

  // Fetch current basePrice per product so the unit price reflects the
  // price at checkout time (priceDelta from the variant applied on top).
  const productIds = [...new Set(cartWithItems.items.map((i: any) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p: any) => [p.id, p]));

  // Same flash-sale resolution used by cart display (cart.service.ts) and
  // product pages (products.service.ts) — this is what guarantees the
  // customer is charged exactly the price they were shown, not basePrice.
  const flashSales = await getActiveFlashSalesForProducts(productIds as string[]);

  const lineItems = cartWithItems.items.map((item: any) => {
    const product = productMap.get(item.productId);
    const variantBase = (product?.basePrice ?? 0) + item.productVariant.priceDelta;
    const unitPrice = computeEffectivePrice(variantBase, null, flashSales.get(item.productId) ?? null).price;
    return {
      productId: item.productId,
      productVariantId: item.productVariantId,
      storeId: item.product.storeId,
      productNameSnapshot: item.product.name,
      variantNameSnapshot: item.productVariant.name,
      unitPrice,
      quantity: item.quantity,
      lineTotal: unitPrice * item.quantity,
    };
  });

  const computedSubtotal = lineItems.reduce((sum, i) => sum + i.lineTotal, 0);
  const shippingTotal = SHIPPING_FLAT_RATE;
  const grandTotal = computedSubtotal + shippingTotal;
  const orderNumber = generateOrderNumber();

  // Charge BEFORE touching the database. Payment gateway calls are network
  // I/O and must never happen inside a DB transaction. If this throws
  // (payment declined), nothing below has run — the cart is untouched and
  // the customer can simply retry.
  const chargeResult = await chargeForCheckout(input.paymentMethod, orderNumber, grandTotal, "BDT");

  // Populated inside the transaction below (variant/threshold comparisons
  // only, no I/O) and only acted on — dispatching notifications — after
  // the transaction commits. Notification sends are no different from
  // payment gateway calls in this respect: I/O that can be slow must never
  // happen while a DB transaction holds its connection/locks open.
  const lowStockAlerts: Array<{
    storeId: string;
    productName: string;
    variantName: string;
    remaining: number;
    threshold: number;
  }> = [];

  let order;
  try {
    order = await prisma.$transaction(async (tx: any) => {
      // Atomically decrement stock for every line item; abort on any failure.
      for (const item of lineItems) {
        const result = await tx.inventoryRecord.updateMany({
          where: { productVariantId: item.productVariantId, quantity: { gte: item.quantity } },
          data: { quantity: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          throw new AppError(`Insufficient stock for "${item.productNameSnapshot}"`, 409);
        }

        // Check where the atomic decrement landed relative to this
        // variant's low-stock threshold, right after it succeeds — this is
        // the one place in the codebase that reliably observes every
        // stock-decreasing event (see the phase prompt's rationale for
        // putting the check here rather than as a periodic scan).
        const inventory = await tx.inventoryRecord.findUnique({
          where: { productVariantId: item.productVariantId },
        });
        if (inventory && inventory.quantity <= inventory.lowStockThreshold) {
          lowStockAlerts.push({
            storeId: item.storeId,
            productName: item.productNameSnapshot,
            variantName: item.variantNameSnapshot,
            remaining: inventory.quantity,
            threshold: inventory.lowStockThreshold,
          });
        }
      }

      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId: input.addressId,
          subtotal: computedSubtotal,
          shippingTotal,
          discountTotal: 0,
          taxTotal: 0,
          grandTotal,
          paymentMethod: input.paymentMethod,
          paymentStatus: chargeResult.status === "PENDING" ? "PENDING" : "PAID",
          status: "PENDING",
          items: { create: lineItems },
        },
        include: { items: true },
      });

      // Seed the order timeline — one PENDING event per item, atomic with
      // order creation itself, so "when was this order placed" is always
      // the first row rather than something inferred from Order.createdAt.
      for (const item of createdOrder.items) {
        await tx.orderStatusEvent.create({ data: { orderItemId: item.id, status: "PENDING" } });
      }

      // Empty the cart now that its contents have become an order.
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return createdOrder;
    });
  } catch (err) {
    // The charge succeeded but we couldn't complete the order (e.g. a
    // stock race lost between the charge and this write) — refund
    // immediately rather than leaving the customer charged with nothing
    // to show for it. Best-effort: log if even the refund fails, since at
    // that point this needs a human to reconcile, not a retry loop.
    if (input.paymentMethod === "ONLINE") {
      try {
        await refundFailedCheckout(input.paymentMethod, orderNumber, grandTotal, "BDT", chargeResult.providerRef);
      } catch (refundErr) {
        logger.error("Failed to refund after a failed checkout — needs manual reconciliation", {
          orderNumber,
          providerRef: chargeResult.providerRef,
          refundError: refundErr instanceof Error ? refundErr.message : String(refundErr),
        });
      }
    }
    throw err;
  }

  await recordTransaction(order.id, input.paymentMethod, chargeResult, grandTotal, "BDT");

  // Notification dispatch happens last and after everything else has
  // committed — see notifications.service.ts#dispatch for why a
  // notification failure is caught there and never allowed to fail
  // checkout itself.
  await notifyOrderPlaced({ id: order.id, orderNumber: order.orderNumber, userId });
  await notifyVendorsOfNewOrder(
    { id: order.id, orderNumber: order.orderNumber },
    lineItems.map((i) => i.storeId)
  );
  for (const alert of lowStockAlerts) {
    const store = await prisma.store.findUnique({
      where: { id: alert.storeId },
      select: { vendorProfile: { select: { userId: true } } },
    });
    if (store) {
      await notifyLowStock({
        vendorUserId: store.vendorProfile.userId,
        productName: alert.productName,
        variantName: alert.variantName,
        remaining: alert.remaining,
        threshold: alert.threshold,
      });
    }
  }

  return order;
}

export async function listOrders(userId: string, query: OrderListQuery) {
  const where = { userId };
  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: { items: true },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function getOrder(userId: string, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, address: true },
  });

  if (!order) throw new NotFoundError("Order");
  if (order.userId !== userId) throw new ForbiddenError("This order does not belong to you");

  return order;
}

// Exported for direct unit testing (see orders.service.unit.test.ts).
export { CANCELLABLE_STATUSES };

/**
 * Core cancellation logic, independent of who's allowed to invoke it.
 * Cancels every item that hasn't shipped yet and releases its reserved
 * stock. If some items are already past that point, they're left
 * untouched and the order ends up in a mixed state — reflected accurately
 * rather than lying about it. Refunds only when the ENTIRE order ends up
 * cancelled and it was paid online (per-line-item proration on a partially
 * cancelled multi-vendor order is a more advanced flow than this phase
 * covers).
 *
 * Exported so the admin module (Phase 10) can reuse the exact same logic
 * for dispute/fraud-driven cancellations, without either duplicating it or
 * having to fake customer ownership to call the customer-facing function.
 */
export async function performOrderCancellation(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new NotFoundError("Order");

  const cancellableItems = order.items.filter((i: any) => CANCELLABLE_STATUSES.has(i.status));
  if (cancellableItems.length === 0) {
    throw new AppError("This order can no longer be cancelled — it has already shipped", 409);
  }

  await prisma.$transaction(async (tx: any) => {
    for (const item of cancellableItems) {
      await tx.orderItem.update({ where: { id: item.id }, data: { status: "CANCELLED" } });
      await tx.orderStatusEvent.create({ data: { orderItemId: item.id, status: "CANCELLED" } });
      await tx.inventoryRecord.update({
        where: { productVariantId: item.productVariantId },
        data: { quantity: { increment: item.quantity } },
      });
    }

    const allItems = await tx.orderItem.findMany({ where: { orderId } });
    const allCancelled = allItems.every((i: any) => i.status === "CANCELLED");
    await tx.order.update({
      where: { id: orderId },
      data: { status: allCancelled ? "CANCELLED" : "PROCESSING" },
    });
  });

  const refreshedOrder = await prisma.order.findUnique({ where: { id: orderId } });
  if (refreshedOrder.status === "CANCELLED" && refreshedOrder.paymentStatus === "PAID") {
    await refundOrder(orderId, refreshedOrder.paymentMethod, refreshedOrder.grandTotal, refreshedOrder.currency);
    await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: "REFUNDED" } });
  }

  await notifyOrderCancelled({
    userId: order.userId,
    orderId: order.id,
    orderNumber: order.orderNumber,
    itemCount: cancellableItems.length,
  });

  return refreshedOrder;
}

/** Customer-initiated cancellation — ownership-checked wrapper around
 * performOrderCancellation. */
export async function cancelOrder(userId: string, orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new NotFoundError("Order");
  if (order.userId !== userId) throw new ForbiddenError("This order does not belong to you");

  await performOrderCancellation(orderId);
  return getOrder(userId, orderId);
}

export async function getOrderTransactions(userId: string, orderId: string) {
  await getOrder(userId, orderId); // ownership check, throws if not the owner
  return listOrderTransactions(orderId);
}
