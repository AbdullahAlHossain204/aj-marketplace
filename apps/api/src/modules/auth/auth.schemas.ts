import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number");

export const registerSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: passwordSchema,
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    phone: z.string().min(6).max(20).optional(),
    role: z.enum(["CUSTOMER", "VENDOR"]).default("CUSTOMER"),
    businessName: z.string().min(2).max(150).optional(),
  })
  .refine((data) => data.role !== "VENDOR" || !!data.businessName, {
    message: "businessName is required when registering as a vendor",
    path: ["businessName"],
  });

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
