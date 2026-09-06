/**
 * Modeled directly on payments/payments.registry.ts's provider pattern —
 * no real courier API (Pathao, RedX, Sundarban, etc.) is integrated yet,
 * but the seam is here so one can be added later without touching
 * delivery.service.ts or any of its callers.
 */
export interface CreateShipmentParams {
  orderItemId: string;
  carrier?: string;
  /** If the vendor already has a tracking number (e.g. typed it in from a
   * courier's own dashboard), pass it through as-is rather than generating
   * one — this provider never overrides vendor-supplied data. */
  trackingNumber?: string;
  estimatedDeliveryAt?: Date;
}

export interface ShipmentResult {
  carrier: string | null;
  trackingNumber: string | null;
  estimatedDeliveryAt: Date | null;
}

export interface CourierProvider {
  readonly name: "MANUAL";
  createShipment(params: CreateShipmentParams): Promise<ShipmentResult>;
}
