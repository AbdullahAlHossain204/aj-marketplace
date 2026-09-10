import { describe, it, expect } from "vitest";
import { VENDOR_STATUS_TRANSITIONS } from "../../../lib/orderStatusMachine";

describe("VENDOR_STATUS_TRANSITIONS (order item state machine)", () => {
  it("allows PENDING -> CONFIRMED", () => {
    expect(VENDOR_STATUS_TRANSITIONS.PENDING).toContain("CONFIRMED");
  });

  it("allows PENDING -> CANCELLED", () => {
    expect(VENDOR_STATUS_TRANSITIONS.PENDING).toContain("CANCELLED");
  });

  it("does NOT allow PENDING -> SHIPPED (skipping steps)", () => {
    expect(VENDOR_STATUS_TRANSITIONS.PENDING).not.toContain("SHIPPED");
  });

  it("does NOT allow PENDING -> DELIVERED (skipping steps)", () => {
    expect(VENDOR_STATUS_TRANSITIONS.PENDING).not.toContain("DELIVERED");
  });

  it("allows SHIPPED -> DELIVERED but not SHIPPED -> CANCELLED", () => {
    expect(VENDOR_STATUS_TRANSITIONS.SHIPPED).toContain("DELIVERED");
    expect(VENDOR_STATUS_TRANSITIONS.SHIPPED).not.toContain("CANCELLED");
  });

  it("is a dead end once DELIVERED", () => {
    expect(VENDOR_STATUS_TRANSITIONS.DELIVERED).toEqual([]);
  });

  it("is a dead end once CANCELLED", () => {
    expect(VENDOR_STATUS_TRANSITIONS.CANCELLED).toEqual([]);
  });

  it("never allows moving backward from PROCESSING to CONFIRMED", () => {
    expect(VENDOR_STATUS_TRANSITIONS.PROCESSING).not.toContain("CONFIRMED");
  });
});
