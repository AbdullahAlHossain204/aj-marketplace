import type { PaymentAdapter, InitiateResult, PaymentAdapterStatus } from './payment-adapter.interface';

/**
 * Cash on Delivery has no online authorization step, so `initiate` never
 * fails and always returns PENDING — the real state transition (PAID)
 * happens later, out of band, when the seller/courier marks the order
 * delivered (Phase 4/6 concern, not this adapter).
 */
export class CODAdapter implements PaymentAdapter {
  async initiate({ orderId }: { orderId: string; amount: number }): Promise<InitiateResult> {
    return { providerRef: `cod_${orderId}`, status: 'PENDING' };
  }

  async verifyWebhook(): Promise<boolean> {
    // COD has no webhooks — nothing to verify.
    return false;
  }

  async getStatus(): Promise<PaymentAdapterStatus> {
    return 'PENDING';
  }

  async refund(): Promise<boolean> {
    // COD refunds are a manual/offline process handled by ops, not an API call.
    return false;
  }
}

export const codAdapter = new CODAdapter();
