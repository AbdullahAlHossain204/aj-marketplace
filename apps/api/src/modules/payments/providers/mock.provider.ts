import crypto from "crypto";
import { ChargeInput, ChargeResult, PaymentProvider, RefundInput, RefundResult } from "../payments.types";

/**
 * Simulates a real online payment gateway (Stripe/SSLCommerz/bKash-shaped).
 * This sandbox has no network access to actual payment providers, so this
 * stands in for one — implementing the exact same `PaymentProvider`
 * interface a real integration would. Swapping this for Stripe later is a
 * one-file change in `payments.registry.ts`; nothing else in the app
 * knows or cares which provider is behind the interface.
 *
 * For demo/testing purposes only (mirrors how real gateways use "test
 * card" magic values in sandbox mode): a charge for exactly this amount
 * deterministically fails, so the failure/rollback/refund paths can be
 * exercised on demand without relying on real gateway test accounts.
 */
const SIMULATED_DECLINE_AMOUNT = 131313; // i.e. an order totalling exactly 1,313.13

export class MockProvider implements PaymentProvider {
  readonly name = "MOCK" as const;

  async charge(input: ChargeInput): Promise<ChargeResult> {
    // Simulate realistic network latency.
    await new Promise((resolve) => setTimeout(resolve, 50));

    if (input.amount === SIMULATED_DECLINE_AMOUNT) {
      return {
        status: "FAILED",
        failureReason: "Card declined by issuing bank (simulated)",
      };
    }

    return {
      status: "SUCCEEDED",
      providerRef: `mock_ch_${crypto.randomBytes(8).toString("hex")}`,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    await new Promise((resolve) => setTimeout(resolve, 50));

    return {
      status: "SUCCEEDED",
      providerRef: `mock_re_${crypto.randomBytes(8).toString("hex")}`,
    };
  }
}
