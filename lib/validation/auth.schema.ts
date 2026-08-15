import { z } from 'zod';

// Shared between the registration form (client-side UX validation) and the
// /api/auth/register route (server-side authority). Defining it once avoids
// the rules drifting apart.
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Enter a valid email address').optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9]{7,15}$/, 'Enter a valid phone number')
    .optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
}).refine((data) => data.email || data.phone, {
  message: 'Provide either an email or a phone number',
  path: ['email'],
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  identifier: z.string().min(3, 'Enter your email or phone'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
