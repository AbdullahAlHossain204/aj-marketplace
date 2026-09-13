import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";

const app = createApp();
const suffix = Date.now();

async function registerAndLogin(role: "CUSTOMER" | "VENDOR" | undefined, email: string, businessName?: string) {
  await request(app).post("/api/v1/auth/register").send({ email, password: "Passw0rd123", name: "Test", role, businessName });
  const res = await request(app).post("/api/v1/auth/login").send({ email, password: "Passw0rd123" });
  return res.body.data.accessToken as string;
}

describe("Permission boundaries (integration)", () => {
  const customerEmail = `perm-customer-${suffix}@example.com`;
  const vendorAEmail = `perm-vendor-a-${suffix}@example.com`;
  const vendorBEmail = `perm-vendor-b-${suffix}@example.com`;

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [customerEmail, vendorAEmail, vendorBEmail] } } });
    await prisma.$disconnect();
  });

  it("blocks a CUSTOMER from any /api/v1/admin/* route", async () => {
    const token = await registerAndLogin("CUSTOMER", customerEmail);
    const res = await request(app).get("/api/v1/admin/overview").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
  it("blocks a CUSTOMER from any /api/v1/vendor/* route", async () => {
    const token = await registerAndLogin("CUSTOMER", customerEmail);
    const res = await request(app).get("/api/v1/vendor/dashboard").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
  it("blocks a VENDOR from customer-only /api/v1/cart", async () => {
    const token = await registerAndLogin("VENDOR", vendorAEmail, "Vendor A Co");
    const res = await request(app).get("/api/v1/cart").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
  it("prevents Vendor B from reading Vendor A's product list via storeId tampering", async () => {
    const tokenA = await registerAndLogin("VENDOR", vendorAEmail, "Vendor A Co");
    await request(app).post("/api/v1/vendor/store").set("Authorization", `Bearer ${tokenA}`).send({ name: `Store A ${suffix}`, slug: `store-a-${suffix}` });
    const tokenB = await registerAndLogin("VENDOR", vendorBEmail, "Vendor B Co");
    await request(app).post("/api/v1/vendor/store").set("Authorization", `Bearer ${tokenB}`).send({ name: `Store B ${suffix}`, slug: `store-b-${suffix}` });
    const res = await request(app).get("/api/v1/vendor/products").set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
  });
  it("returns 401 for a completely unauthenticated request", async () => {
    const res = await request(app).get("/api/v1/vendor/dashboard");
    expect(res.status).toBe(401);
  });
});
