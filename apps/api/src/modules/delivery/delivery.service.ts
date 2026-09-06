import { prisma } from "../../lib/prisma";
import { ForbiddenError, NotFoundError } from "../../lib/errors";
import { ManualCourierProvider } from "./providers/manual.provider";
import { SetShippingInfoInput } from "./delivery.schemas";

const courierProvider = new ManualCourierProvider();

/**
 * Appends one row to the order timeline. Called from wherever an
 * OrderItem's status actually changes — checkout (initial PENDING),
 * vendor.service.ts#updateOrderItemStatus (every subsequent transition),
 * and orders.service.ts's cancellation path — so "what happened and when"
 * is a real queryable fact, not just inferable from the current status.
 */
export async function recordStatusEvent(orderItemId: string, status: string, note?: string) {
  return prisma.orderStatusEvent.create({ data: { orderItemId, status: status as any, note } });
}

export async function getOrderTimeline(userId: string, orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new NotFoundError("Order");
  if (order.userId !== userId) throw new ForbiddenError("This order does not belong to you");

  const items = await prisma.orderItem.findMany({
    where: { orderId },
    include: { statusEvents: { orderBy: { createdAt: "asc" } } },
  });

  return items.map((item: any) => ({
    orderItemId: item.id,
    productName: item.productNameSnapshot,
    carrier: item.carrier,
    trackingNumber: item.trackingNumber,
    estimatedDeliveryAt: item.estimatedDeliveryAt,
    shippedAt: item.shippedAt,
    deliveredAt: item.deliveredAt,
    timeline: item.statusEvents.map((e: any) => ({ status: e.status, note: e.note, at: e.createdAt })),
  }));
}

/**
 * Vendor sets/updates shipping info for one of their own order items.
 * Deliberately independent of the status-transition endpoint — a vendor
 * may want to attach a tracking number before marking SHIPPED, or correct
 * it afterward without re-triggering the whole state machine.
 */
export async function setShippingInfo(userId: string, orderItemId: string, input: SetShippingInfoInput) {
  const item = await prisma.orderItem.findUnique({ where: { id: orderItemId } });
  if (!item) throw new NotFoundError("Order item");

  const vendorProfile = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendorProfile) throw new NotFoundError("Vendor profile");

  const store = await prisma.store.findUnique({ where: { vendorProfileId: vendorProfile.id } });
  if (!store || item.storeId !== store.id) {
    throw new ForbiddenError("This order item does not belong to your store");
  }

  const shipment = await courierProvider.createShipment({
    orderItemId,
    carrier: input.carrier,
    trackingNumber: input.trackingNumber,
    estimatedDeliveryAt: input.estimatedDeliveryAt,
  });

  return prisma.orderItem.update({
    where: { id: orderItemId },
    data: {
      carrier: shipment.carrier,
      trackingNumber: shipment.trackingNumber,
      estimatedDeliveryAt: shipment.estimatedDeliveryAt,
    },
  });
}
