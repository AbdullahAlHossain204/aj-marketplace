/**
 * PAYMENT PROVIDER ABSTRACTION
 * =============================
 * Every gateway (COD, Stripe, SSLCommerz, bKash, ...) implements this same
 * interface. Nothing outside `payments.service.ts` and `payments.registry.ts`
 * ever imports a specific provider directly — checkout, cancellation, and
 * refunds all talk to `PaymentProvider`, never to "Stripe" or "MockProvider"
 * by name. Swapping or adding a real gateway later means writing one new
 * file that implements this interface and registering it — no changes to
 * order logic, checkout, or the database layer.
 */

export interface ChargeInput {
  /** Human-readable reference the provider can show in its own dashboard
   * (we use the order number) — not a database foreign key. */
  reference: string;
  amount: number; // smallest currency unit
  currency: string;
}

export interface ChargeResult {
  status: "SUCCEEDED" | "FAILED" | "PENDING";
  providerRef?: string;
  failureReason?: string;
  raw?: unknown;
}

export interface RefundInput {
  /** The providerRef returned by the original successful charge. */
  originalProviderRef?: string;
  reference: string;
  amount: number;
  currency: string;
}

export interface RefundResult {
  status: "SUCCEEDED" | "FAILED";
  providerRef?: string;
  failureReason?: string;
  raw?: unknown;
}

export interface PaymentProvider {
  readonly name: "COD" | "MOCK";
  charge(input: ChargeInput): Promise<ChargeResult>;
  refund(input: RefundInput): Promise<RefundResult>;
}
