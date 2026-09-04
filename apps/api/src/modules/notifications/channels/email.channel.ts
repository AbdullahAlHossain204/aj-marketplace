import { NotificationChannel, NotificationPayload } from "../notifications.types";

/**
 * Not wired to a real email provider (SES/SendGrid/Postmark/...) yet — this
 * is intentionally a stub so the *interface* exists and callers never need
 * to change when a real implementation lands. Deliberately NOT registered
 * in notifications.registry.ts's active channel list (see that file):
 * registering it would mean every notification silently fails its email
 * leg on every send. Implementing this for real is future work — swap the
 * body of `send()` for an actual API call, add the provider's API key to
 * config/env.ts, and add one line to the registry, matching exactly how a
 * real Stripe/SSLCommerz `PaymentProvider` would replace `MockProvider`.
 */
export class EmailChannel implements NotificationChannel {
  readonly name = "EMAIL" as const;

  async send(_payload: NotificationPayload): Promise<void> {
    throw new Error(
      "EmailChannel is not configured — no email provider is wired up yet. See notifications.registry.ts."
    );
  }
}
