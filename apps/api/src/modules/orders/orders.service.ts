import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { AppError, ForbiddenError, NotFoundError } from "../../lib/errors";
import { CheckoutInput, OrderListQuery } from "./orders.schemas";

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
  if (input.paymentMethod === "ONLINE") {
    throw new AppError("Online payment isn't available yet — please choose Cash on Delivery", 400);
  }

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

  const lineItems = cartWithItems.items.map((item: any) => {
    const product = productMap.get(item.productId);
    const unitPrice = (product?.basePrice ?? 0) + item.productVariant.priceDelta;
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

  const order = await prisma.$transaction(async (tx: any) => {
    // Atomically decrement stock for every line item; abort on any failure.
    for (const item of lineItems) {
      const result = await tx.inventoryRecord.updateMany({
        where: { productVariantId: item.productVariantId, quantity: { gte: item.quantity } },
        data: { quantity: { decrement: item.quantity } },
      });
      if (result.count === 0) {
        throw new AppError(`Insufficient stock for "${item.productNameSnapshot}"`, 409);
      }
    }

    const createdOrder = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        addressId: input.addressId,
        subtotal: computedSubtotal,
        shippingTotal,
        discountTotal: 0,
        taxTotal: 0,
        grandTotal,
        paymentMethod: input.paymentMethod,
        paymentStatus: "PENDING",
        status: "PENDING",
        items: { create: lineItems },
      },
      include: { items: true },
    });

    // Empty the cart now that its contents have become an order.
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return createdOrder;
  });

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

const CANCELLABLE_STATUSES = new Set(["PENDING", "CONFIRMED"]);

/**
 * Customer-initiated cancellation. Only items that haven't shipped yet can
 * be cancelled; their reserved stock is released back to inventory. If some
 * items are already past that point, they're left untouched and the order
 * ends up in a mixed state — reflected accurately rather than lying about it.
 */
export async function cancelOrder(userId: string, orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new NotFoundError("Order");
  if (order.userId !== userId) throw new ForbiddenError("This order does not belong to you");

  const cancellableItems = order.items.filter((i: any) => CANCELLABLE_STATUSES.has(i.status));
  if (cancellableItems.length === 0) {
    throw new AppError("This order can no longer be cancelled — it has already shipped", 409);
  }

  await prisma.$transaction(async (tx: any) => {
    for (const item of cancellableItems) {
      await tx.orderItem.update({ where: { id: item.id }, data: { status: "CANCELLED" } });
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

  return getOrder(userId, orderId);
}
