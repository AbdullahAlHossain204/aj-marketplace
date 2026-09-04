import { prisma } from "../../lib/prisma";
import { ForbiddenError, NotFoundError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { getActiveChannels } from "./notifications.registry";
import { NotificationPayload } from "./notifications.types";
import { NotificationListQuery } from "./notifications.schemas";

/**
 * THE SEAM
 * ========
 * This file is the ONLY place business logic (orders, vendor status,
 * reviews, auth) talks to in order to notify someone. Call sites never
 * touch `prisma.notification` directly and never know which channels
 * exist — they call one of the `notifyX` functions below with plain,
 * already-known data (an order, a vendor profile, a user), and this
 * module handles turning that into a `NotificationPayload` and fanning it
 * out to every active channel.
 *
 * DESIGN DECISION — named functions over an event emitter (see the doc
 * comment block at the top of orders.service.ts and payments.service.ts
 * for the project's tone on documenting this kind of choice): this
 * codebase already has a working precedent for "business logic calls into
 * another module with a single line" — orders.service.ts calling
 * chargeForCheckout/recordTransaction/refundOrder in payments.service.ts.
 * A `notifyOrderPlaced(order)` call site reads exactly the same way and
 * needs no new architectural concept (event names as magic strings, a
 * listener-registration step, discovering what listens to what). An
 * EventEmitter buys additional decoupling — call sites wouldn't need to
 * import this module at all — but at the cost of an indirection that
 * doesn't match anything else in this codebase and makes "what happens
 * when an order is placed" harder to trace by reading the code. Given the
 * explicit requirement is "don't inline prisma.notification.create calls
 * in business logic" rather than "remove all knowledge that notifications
 * exist," named functions satisfy the requirement with the smaller,
 * more consistent change.
 */
async function dispatch(payload: NotificationPayload): Promise<void> {
  const channels = getActiveChannels();

  // Fan out to every active channel independently. A channel failing to
  // send (e.g. a future EmailChannel's provider timing out) must never
  // block another channel, and — critically — must never bubble up and
  // fail the business operation that triggered it. An order placing
  // successfully should never fail because a notification hiccuped; this
  // mirrors the "best-effort, log and move on" posture
  // payments.service.ts uses for refundFailedCheckout.
  await Promise.all(
    channels.map(async (channel) => {
      try {
        await channel.send(payload);
      } catch (err) {
        logger.error(`Notification channel "${channel.name}" failed to send`, {
          userId: payload.userId,
          type: payload.type,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })
  );
}

// ---- ORDER NOTIFICATIONS ------------------------------------------------

export async function notifyOrderPlaced(order: { id: string; orderNumber: string; userId: string }) {
  await dispatch({
    userId: order.userId,
    type: "ORDER",
    title: "Order placed",
    message: `Your order ${order.orderNumber} has been placed successfully.`,
    metadata: { event: "ORDER_PLACED", orderId: order.id, orderNumber: order.orderNumber },
  });
}

/** Notifies every vendor with at least one line item in a freshly placed
 * order, scoped to their own store — a single marketplace order can span
 * multiple vendors (see OrderItem's storeId denormalization comment in
 * the schema), and each vendor only cares about their own slice. */
export async function notifyVendorsOfNewOrder(order: { id: string; orderNumber: string }, storeIds: string[]) {
  const uniqueStoreIds = [...new Set(storeIds)];
  const stores = await prisma.store.findMany({
    where: { id: { in: uniqueStoreIds } },
    select: { id: true, name: true, vendorProfile: { select: { userId: true } } },
  });

  await Promise.all(
    stores.map((store) =>
      dispatch({
        userId: store.vendorProfile.userId,
        type: "ORDER",
        title: "New order received",
        message: `You have a new order (${order.orderNumber}) for "${store.name}".`,
        metadata: { event: "VENDOR_NEW_ORDER", orderId: order.id, orderNumber: order.orderNumber, storeId: store.id },
      })
    )
  );
}

/** Fired whenever a single order item moves to a new status — covers both
 * the vendor-facing per-item state machine (vendor.service.ts) and
 * cancellation (orders.service.ts). Deliberately per-item, not per-order:
 * a mixed-vendor order can have items at different stages, and the
 * customer should see which specific item changed. */
export async function notifyOrderStatusChanged(params: {
  userId: string;
  orderId: string;
  orderNumber: string;
  productName: string;
  newStatus: string;
}) {
  await dispatch({
    userId: params.userId,
    type: "ORDER",
    title: "Order status updated",
    message: `"${params.productName}" in order ${params.orderNumber} is now ${params.newStatus.toLowerCase()}.`,
    metadata: {
      event: "ORDER_ITEM_STATUS_CHANGED",
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      newStatus: params.newStatus,
    },
  });
}

/** Order-level cancellation summary — one notification per cancellation
 * event rather than one per cancelled line item, since a cancelled cart
 * can span many items and per-item spam would bury the useful signal. */
export async function notifyOrderCancelled(params: {
  userId: string;
  orderId: string;
  orderNumber: string;
  itemCount: number;
}) {
  await dispatch({
    userId: params.userId,
    type: "ORDER",
    title: "Order cancelled",
    message:
      params.itemCount === 1
        ? `1 item in your order ${params.orderNumber} has been cancelled.`
        : `${params.itemCount} items in your order ${params.orderNumber} have been cancelled.`,
    metadata: { event: "ORDER_CANCELLED", orderId: params.orderId, orderNumber: params.orderNumber },
  });
}

// ---- ACCOUNT NOTIFICATIONS ------------------------------------------------

export async function notifyWelcome(user: { id: string; name: string }) {
  await dispatch({
    userId: user.id,
    type: "ACCOUNT",
    title: "Welcome to AJ Market!",
    message: `Hi ${user.name}, thanks for joining AJ Market. Start exploring products from our vendors.`,
    metadata: { event: "WELCOME" },
  });
}

// ---- VENDOR NOTIFICATIONS ------------------------------------------------

const VENDOR_STATUS_MESSAGES: Record<string, string> = {
  APPROVED: "Congratulations! Your vendor application has been approved — you can now start selling.",
  REJECTED: "Your vendor application was not approved this time.",
  SUSPENDED: "Your vendor account has been suspended. Contact support for details.",
};

/** setVendorStatus (admin/services/vendors.service.ts) intentionally has
 * no forward-only transition constraint (an admin can move a vendor back
 * to PENDING, e.g. to reconsider), so this only sends a notification for
 * the three outcomes a vendor actually needs to hear about — a bounce
 * back to PENDING isn't a customer/vendor-facing event worth a
 * notification. */
export async function notifyVendorStatusChanged(vendorUserId: string, status: string, businessName: string) {
  const message = VENDOR_STATUS_MESSAGES[status];
  if (!message) return;

  await dispatch({
    userId: vendorUserId,
    type: "VENDOR",
    title: `Vendor application ${status.toLowerCase()}`,
    message: `${message} (${businessName})`,
    metadata: { event: `VENDOR_STATUS_${status}`, status },
  });
}

// ---- ADMIN NOTIFICATIONS ------------------------------------------------

/** Fans out to every active admin — there's no single "the admin" owner
 * for platform-wide moderation queues (vendor applications, review
 * reports), so every admin gets notified and any one of them can act. */
async function notifyAllAdmins(payload: Omit<NotificationPayload, "userId">) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", deletedAt: null, isActive: true },
    select: { id: true },
  });

  await Promise.all(admins.map((admin) => dispatch({ ...payload, userId: admin.id })));
}

export async function notifyAdminNewVendorApplication(vendorProfileId: string, businessName: string) {
  await notifyAllAdmins({
    type: "ADMIN",
    title: "New vendor application",
    message: `"${businessName}" has applied to become a vendor and is awaiting review.`,
    metadata: { event: "ADMIN_VENDOR_APPLICATION", vendorProfileId },
  });
}

export async function notifyAdminNewReviewReport(reportId: string, reviewId: string) {
  await notifyAllAdmins({
    type: "ADMIN",
    title: "New review report",
    message: "A review was reported and is awaiting moderation.",
    metadata: { event: "ADMIN_REVIEW_REPORT", reportId, reviewId },
  });
}

// ---- STOCK NOTIFICATIONS ------------------------------------------------

/** Called once per low-stock variant after checkout's atomic inventory
 * decrement — see orders.service.ts#checkout for why the check happens
 * inside the transaction but the notification is dispatched only after
 * the transaction commits (notification I/O, like payment I/O, must never
 * run inside a DB transaction). */
export async function notifyLowStock(params: {
  vendorUserId: string;
  productName: string;
  variantName: string;
  remaining: number;
  threshold: number;
}) {
  await dispatch({
    userId: params.vendorUserId,
    type: "STOCK",
    title: "Low stock alert",
    message: `"${params.productName}" (${params.variantName}) is down to ${params.remaining} left (threshold: ${params.threshold}).`,
    metadata: {
      event: "LOW_STOCK",
      remaining: params.remaining,
      threshold: params.threshold,
    },
  });
}

// ---- READ SIDE (own notifications only) ---------------------------------

export async function listNotifications(userId: string, query: NotificationListQuery) {
  const where = { userId };
  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function getUnreadCount(userId: string) {
  const count = await prisma.notification.count({ where: { userId, isRead: false } });
  return { count };
}

async function getOwnNotification(userId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification) throw new NotFoundError("Notification");
  if (notification.userId !== userId) throw new ForbiddenError("This notification does not belong to you");
  return notification;
}

export async function markAsRead(userId: string, notificationId: string) {
  await getOwnNotification(userId, notificationId);
  return prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
}

export async function markAllAsRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  return { message: "All notifications marked as read" };
}
