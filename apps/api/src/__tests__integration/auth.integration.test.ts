import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";

const app = createApp();
const testEmail = `test-${Date.now()}@example.com`;

describe("Auth flow (integration)", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  });

  it("registers a new customer and returns an access token", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: testEmail, password: "Passw0rd123", name: "Test User" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.email).toBe(testEmail);
    expect(res.body.data.user.password).toBeUndefined();
  });

  it("rejects registering the same email twice", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: testEmail, password: "Passw0rd123", name: "Test User" });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("rejects login with the wrong password using a generic message", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testEmail, password: "WrongPassword1" });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Invalid email or password");
  });

  it("logs in successfully with correct credentials", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testEmail, password: "Passw0rd123" });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it("rejects an unauthenticated request to a protected route", async () => {
    const res = await request(app).get("/api/v1/users/me");
    expect(res.status).toBe(401);
  });

  it("allows access to a protected route with a valid token", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testEmail, password: "Passw0rd123" });
    const token = loginRes.body.data.accessToken;

    const res = await request(app).get("/api/v1/users/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(testEmail);
  });
});
