import { z } from 'zod';

// Only COD is wired up in Phase 3. The 'gateway' adapter exists structurally
// (services/payment/) but ships in Phase 6 — keeping the enum to one value
// now means the checkout route already rejects anything else server-side
// rather than silently accepting a provider nothing implements yet.
export const checkoutSchema = z.object({
  shippingAddressId: z.string().min(1, 'A shipping address is required'),
  paymentProvider: z.enum(['cod']).default('cod'),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;
