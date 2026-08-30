import { ChargeInput, ChargeResult, PaymentProvider, RefundInput, RefundResult } from "../payments.types";

/**
 * COD isn't really a "payment gateway" — no money moves at checkout. This
 * provider exists so the rest of the system (checkout, transaction
 * recording) doesn't need a special case for "no provider" — COD is just
 * another provider whose charge() always succeeds immediately with status
 * PENDING (collected later, in cash, at delivery).
 */
export class CodProvider implements PaymentProvider {
  readonly name = "COD" as const;

  async charge(input: ChargeInput): Promise<ChargeResult> {
    return { status: "PENDING", providerRef: `cod_${input.reference}` };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    // Nothing was ever collected upfront, so there's nothing to reverse
    // through a gateway — a COD "refund" just means the vendor doesn't
    // collect cash on delivery, which the order cancellation already covers.
    return { status: "SUCCEEDED", providerRef: `cod_refund_${input.reference}` };
  }
}
