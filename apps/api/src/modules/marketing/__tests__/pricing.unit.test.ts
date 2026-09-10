import { describe, it, expect } from "vitest";
import { computeEffectivePrice } from "../pricing";

const now = new Date("2026-06-01T12:00:00Z");
const activeSale = { id: "s1", name: "Sale", discountType: "PERCENTAGE" as const, discountValue: 20, endsAt: new Date("2026-06-02T00:00:00Z") };
const fixedSale = { id: "s2", name: "Sale2", discountType: "FIXED" as const, discountValue: 300, endsAt: new Date("2026-06-02T00:00:00Z") };
const expiredSale = { id: "s3", name: "Expired", discountType: "PERCENTAGE" as const, discountValue: 50, endsAt: new Date("2026-05-01T00:00:00Z") };
const bigDiscount = { id: "s4", name: "Big", discountType: "FIXED" as const, discountValue: 5000, endsAt: new Date("2026-06-02T00:00:00Z") };

describe("computeEffectivePrice", () => {
  it("returns basePrice unchanged with no discount at all", () => {
    const r = computeEffectivePrice(1000, null, null, now);
    expect(r.price).toBe(1000);
    expect(r.compareAtPrice).toBeNull();
  });

  it("shows vendor compareAtPrice when no flash sale is active", () => {
    const r = computeEffectivePrice(1000, 1200, null, now);
    expect(r.price).toBe(1000);
    expect(r.compareAtPrice).toBe(1200);
  });

  it("applies a percentage flash sale and sets compareAtPrice to the original", () => {
    const r = computeEffectivePrice(1000, null, activeSale, now);
    expect(r.price).toBe(800);
    expect(r.compareAtPrice).toBe(1000);
    expect(r.activeFlashSale).toEqual(activeSale);
  });

  it("applies a fixed-amount flash sale", () => {
    const r = computeEffectivePrice(1000, null, fixedSale, now);
    expect(r.price).toBe(700);
  });

  it("ignores a flash sale whose endsAt is in the past", () => {
    const r = computeEffectivePrice(1000, null, expiredSale, now);
    expect(r.price).toBe(1000);
    expect(r.activeFlashSale).toBeNull();
  });

  it("never lets a fixed discount push price below zero", () => {
    const r = computeEffectivePrice(1000, null, bigDiscount, now);
    expect(r.price).toBe(0);
  });

  it("prefers the flash sale price over a vendor compareAtPrice when both exist", () => {
    const r = computeEffectivePrice(1000, 900, activeSale, now);
    expect(r.price).toBe(800);
    expect(r.compareAtPrice).toBe(1000);
  });
});
