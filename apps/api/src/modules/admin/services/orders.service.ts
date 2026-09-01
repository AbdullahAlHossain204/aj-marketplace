import { prisma } from "../../../lib/prisma";
import { NotFoundError } from "../../../lib/errors";
import { performOrderCancellation } from "../../orders/orders.service";
import { AdminOrderListQuery } from "../admin.schemas";
import { recordAuditLog } from "./audit.service";

export async function listOrders(query: AdminOrderListQuery) {
  const where = {
    ...(query.status && { status: query.status }),
    ...(query.paymentStatus && { paymentStatus: query.paymentStatus }),
  };

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { select: { id: true, storeId: true, productNameSnapshot: true, status: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function getOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      address: true,
      items: true,
      transactions: true,
    },
  });

  if (!order) throw new NotFoundError("Order");
  return order;
}

/**
 * Admin-initiated cancellation — for disputes/fraud/policy issues, distinct
 * from the customer's own self-service cancellation. Reuses the exact same
 * core logic (inventory release, refund-if-fully-paid) via
 * performOrderCancellation rather than duplicating it or impersonating the
 * customer to call their endpoint.
 */
export async function cancelOrder(adminId: string, orderId: string) {
  await performOrderCancellation(orderId);
  await recordAuditLog(adminId, "ORDER_ADMIN_CANCEL", "Order", orderId);
  return getOrder(orderId);
}
