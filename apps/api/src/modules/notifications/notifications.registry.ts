import { NotificationChannel } from "./notifications.types";
import { InAppChannel } from "./channels/in-app.channel";

const inAppChannel = new InAppChannel();

/**
 * The channels a notification is actually dispatched to today. This is the
 * ONLY place in the codebase that decides which concrete channels are
 * "live" — the same role payments.registry.ts plays for payment providers.
 *
 * EmailChannel and SmsChannel deliberately are NOT in this list: they
 * exist (see ./channels) so the interface is proven out and call sites
 * never need to change, but they're stubs that throw until a real
 * provider is configured. Turning email/SMS on later means: implement the
 * provider properly (or leave the stub if it's just for a specific
 * transactional flow), then add it to this array — no changes needed in
 * notifications.service.ts's `notifyX` functions or any business-logic
 * call site (orders.service.ts, admin vendor status, etc.).
 */
const activeChannels: NotificationChannel[] = [inAppChannel];

export function getActiveChannels(): NotificationChannel[] {
  return activeChannels;
}
