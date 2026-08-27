import { z } from "zod";

export const addressSchema = z.object({
  label: z.string().max(50).optional(),
  recipientName: z.string().min(2).max(100),
  phone: z.string().min(6).max(20),
  addressLine1: z.string().min(3).max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().min(1).max(100).default("Bangladesh"),
  isDefault: z.boolean().default(false),
});

export const updateAddressSchema = addressSchema.partial();

export type AddressInput = z.infer<typeof addressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
