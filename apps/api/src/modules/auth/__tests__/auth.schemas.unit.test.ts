import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "../auth.schemas";

describe("registerSchema", () => {
  const base = { email: "test@example.com", password: "Passw0rd1", name: "Test User" };
  it("accepts a valid CUSTOMER registration", () => {
    expect(registerSchema.safeParse({ ...base, role: "CUSTOMER" }).success).toBe(true);
  });
  it("defaults role to CUSTOMER when omitted", () => {
    expect(registerSchema.parse(base).role).toBe("CUSTOMER");
  });
  it("rejects a password with no uppercase letter", () => {
    expect(registerSchema.safeParse({ ...base, password: "passw0rd1" }).success).toBe(false);
  });
  it("rejects a password with no number", () => {
    expect(registerSchema.safeParse({ ...base, password: "Password" }).success).toBe(false);
  });
  it("rejects a password shorter than 8 characters", () => {
    expect(registerSchema.safeParse({ ...base, password: "Pass1" }).success).toBe(false);
  });
  it("rejects an invalid email", () => {
    expect(registerSchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(false);
  });
  it("rejects VENDOR role without a businessName", () => {
    expect(registerSchema.safeParse({ ...base, role: "VENDOR" }).success).toBe(false);
  });
  it("accepts VENDOR role when businessName is provided", () => {
    expect(registerSchema.safeParse({ ...base, role: "VENDOR", businessName: "Acme Co" }).success).toBe(true);
  });
  it("rejects ADMIN as a self-registerable role", () => {
    expect(registerSchema.safeParse({ ...base, role: "ADMIN" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials shape", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "anything" }).success).toBe(true);
  });
  it("rejects a missing password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
  it("rejects an invalid email format", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
  });
});
