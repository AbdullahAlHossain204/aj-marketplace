import { z } from 'zod';

// Upper bound is a UX/abuse guard, not a business rule — real stock limits
// are always re-checked server-side against Inventory at add/update time.
const MAX_QTY_PER_LINE = 20;

export const addCartItemSchema = z.object({
  variantId: z.string().min(1, 'variantId is required'),
  quantity: z.coerce.number().int().min(1).max(MAX_QTY_PER_LINE).default(1),
});
export type AddCartItemInput = z.infer<typeof addCartItemSchema>;

// quantity 0 is treated as "remove this line" by the route handler.
export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(0).max(MAX_QTY_PER_LINE),
});
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
