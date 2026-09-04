import { prisma } from "../../../lib/prisma";
import { NotificationChannel, NotificationPayload } from "../notifications.types";

/**
 * Writes a row to the `Notification` table (the schema that's existed
 * since Phase 2, unused until now). This is the only channel that's
 * actually live today — everything else in the platform (the bell
 * dropdown, unread-count badge) reads from this same table.
 */
export class InAppChannel implements NotificationChannel {
  readonly name = "IN_APP" as const;

  async send(payload: NotificationPayload): Promise<void> {
    await prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        metadata: (payload.metadata as any) ?? undefined,
      },
    });
  }
}
