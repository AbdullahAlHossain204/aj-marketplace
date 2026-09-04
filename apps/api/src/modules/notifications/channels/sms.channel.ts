import { NotificationChannel, NotificationPayload } from "../notifications.types";

/**
 * Stub — see email.channel.ts's doc comment for the rationale. SMS in this
 * market would most likely go through a local gateway (e.g. an SSLWireless
 * or similar bKash-adjacent SMS API) rather than Twilio; that choice is
 * deliberately left for whoever wires this up for real, not guessed at
 * here.
 */
export class SmsChannel implements NotificationChannel {
  readonly name = "SMS" as const;

  async send(_payload: NotificationPayload): Promise<void> {
    throw new Error(
      "SmsChannel is not configured — no SMS provider is wired up yet. See notifications.registry.ts."
    );
  }
}
