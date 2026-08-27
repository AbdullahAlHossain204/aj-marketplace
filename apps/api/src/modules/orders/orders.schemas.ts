import { z } from "zod";

export const checkoutSchema = z.object({
  addressId: z.string().uuid("Invalid address id"),
  paymentMethod: z.enum(["COD", "ONLINE"]).default("COD"),
});

export const orderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const updateOrderItemStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;
export type UpdateOrderItemStatusInput = z.infer<typeof updateOrderItemStatusSchema>;
