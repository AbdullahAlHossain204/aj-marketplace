import { z } from 'zod';

export const addressSchema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(50),
  line1: z.string().trim().min(1, 'Address line 1 is required').max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1, 'City is required').max(100),
  region: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
  country: z.string().trim().min(1, 'Country is required').max(100),
  phone: z.string().trim().max(20).optional(),
  isDefault: z.boolean().optional().default(false),
});
export type AddressInput = z.infer<typeof addressSchema>;
