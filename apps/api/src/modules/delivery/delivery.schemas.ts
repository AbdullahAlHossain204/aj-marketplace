import { z } from "zod";

export const setShippingInfoSchema = z.object({
  carrier: z.string().min(1).max(100).optional(),
  trackingNumber: z.string().min(1).max(150).optional(),
  estimatedDeliveryAt: z.coerce.date().optional(),
});

export type SetShippingInfoInput = z.infer<typeof setShippingInfoSchema>;
