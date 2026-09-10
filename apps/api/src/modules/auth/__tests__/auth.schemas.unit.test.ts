import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "../auth.schemas";

describe("registerSchema", () => {
  const base = { email: "test@example.com", password: "Passw0rd1", name: "Test User" };

  it("accepts a valid CUSTOMER registration", () => {
    const r = registerSchema.safeParse({ ...base, role: "CUSTOMER" });
    expect(r.success).toBe(true);
  });

  it("defaults role to CUSTOMER when omitted", () => {
    const r = registerSchema.parse(base);
    expect(r.role).toBe("CUSTOMER");
  });

  it("rejects a password with no uppercase letter", () => {
    const r = registerSchema.safeParse({ ...base, password: "passw0rd1" });
    expect(r.success).toBe(false);
  });

  it("rejects a password with no number", () => {
    const r = registerSchema.safeParse({ ...base, password: "Password" });
    expect(r.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const r = registerSchema.safeParse({ ...base, password: "Pass1" });
    expect(r.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const r = registerSchema.safeParse({ ...base, email: "not-an-email" });
    expect(r.success).toBe(false);
  });

  it("rejects VENDOR role without a businessName", () => {
    const r = registerSchema.safeParse({ ...base, role: "VENDOR" });
    expect(r.success).toBe(false);
  });

  it("accepts VENDOR role when businessName is provided", () => {
    const r = registerSchema.safeParse({ ...base, role: "VENDOR", businessName: "Acme Co" });
    expect(r.success).toBe(true);
  });

  it("rejects ADMIN as a self-registerable role", () => {
    // registerSchema's role enum is ["CUSTOMER", "VENDOR"] only — ADMIN
    // accounts must never be creatable through public registration.
    const r = registerSchema.safeParse({ ...base, role: "ADMIN" });
    expect(r.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials shape", () => {
    const r = loginSchema.safeParse({ email: "a@b.com", password: "anything" });
    expect(r.success).toBe(true);
  });

  it("rejects a missing password", () => {
    const r = loginSchema.safeParse({ email: "a@b.com", password: "" });
    expect(r.success).toBe(false);
  });

  it("rejects an invalid email format", () => {
    const r = loginSchema.safeParse({ email: "not-an-email", password: "x" });
    expect(r.success).toBe(false);
  });
});
