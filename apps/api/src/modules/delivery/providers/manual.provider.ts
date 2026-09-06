import { CourierProvider, CreateShipmentParams, ShipmentResult } from "../courier.types";

/**
 * No real courier is integrated — this provider is a straight pass-through
 * of whatever the vendor typed in (they're using the courier's own
 * dashboard/app today, same real-world situation Cash on Delivery models
 * for payments). A future PathaoProvider/RedXProvider would implement the
 * same CreateShipmentParams -> ShipmentResult contract, actually calling
 * an external API to book a pickup and generate a tracking number, and
 * delivery.service.ts would not need to change at all to use it.
 */
export class ManualCourierProvider implements CourierProvider {
  readonly name = "MANUAL" as const;

  async createShipment(params: CreateShipmentParams): Promise<ShipmentResult> {
    return {
      carrier: params.carrier ?? null,
      trackingNumber: params.trackingNumber ?? null,
      estimatedDeliveryAt: params.estimatedDeliveryAt ?? null,
    };
  }
}
