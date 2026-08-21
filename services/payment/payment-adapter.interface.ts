export type PaymentAdapterStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface InitiateResult {
  providerRef: string;
  status: PaymentAdapterStatus;
}

/**
 * Every payment provider (COD now, a real gateway in Phase 6) implements
 * this. `order.service.ts` only ever calls through this interface — see
 * docs/ARCHITECTURE.md §G.
 */
export interface PaymentAdapter {
  initiate(params: { orderId: string; amount: number }): Promise<InitiateResult>;
  verifyWebhook(payload: unknown, signature?: string): Promise<boolean>;
  getStatus(providerRef: string): Promise<PaymentAdapterStatus>;
  refund(providerRef: string, amount: number): Promise<boolean>;
}
