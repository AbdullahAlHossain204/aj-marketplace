import { NotificationType } from "@prisma/client";

/**
 * NOTIFICATION CHANNEL ABSTRACTION
 * =================================
 * Modeled directly on payments.types.ts's `PaymentProvider` pattern: every
 * delivery mechanism (in-app, email, SMS, ...) implements this same
 * interface, and nothing outside `notifications.service.ts` and
 * `notifications.registry.ts` ever imports a specific channel class by
 * name. The functions business logic calls (`notifyOrderPlaced`,
 * `notifyVendorStatusChanged`, etc., in notifications.service.ts) only ever
 * talk to `NotificationChannel[]` returned from the registry — swapping or
 * adding a real email/SMS provider later means writing one new file that
 * implements this interface and registering it, with zero changes to
 * order/vendor/review/auth logic.
 */

export interface NotificationPayload {
  /** Never supplied by a client — always derived server-side from the
   * event that triggered the notification (the user who placed the order,
   * the vendor who owns the store, every user with role ADMIN, ...). */
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Structured, event-specific extra data (orderId, orderNumber, the
   * transition that occurred, etc.) — deliberately using the existing
   * `Notification.metadata` Json column rather than new columns or new
   * enum values, per the schema's own design intent. */
  metadata?: Record<string, unknown>;
}

export interface NotificationChannel {
  readonly name: string;
  send(payload: NotificationPayload): Promise<void>;
}
