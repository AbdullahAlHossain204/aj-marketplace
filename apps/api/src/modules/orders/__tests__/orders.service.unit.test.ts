import { describe, it, expect } from "vitest";
import { CANCELLABLE_STATUSES } from "../../../lib/orderStatusMachine";

describe("CANCELLABLE_STATUSES", () => {
  it("allows cancelling a PENDING item", () => {
    expect(CANCELLABLE_STATUSES.has("PENDING")).toBe(true);
  });

  it("allows cancelling a CONFIRMED item", () => {
    expect(CANCELLABLE_STATUSES.has("CONFIRMED")).toBe(true);
  });

  it("does NOT allow cancelling a SHIPPED item", () => {
    expect(CANCELLABLE_STATUSES.has("SHIPPED")).toBe(false);
  });

  it("does NOT allow cancelling a DELIVERED item", () => {
    expect(CANCELLABLE_STATUSES.has("DELIVERED")).toBe(false);
  });

  it("does NOT allow cancelling an already-CANCELLED item", () => {
    expect(CANCELLABLE_STATUSES.has("CANCELLED")).toBe(false);
  });
});
