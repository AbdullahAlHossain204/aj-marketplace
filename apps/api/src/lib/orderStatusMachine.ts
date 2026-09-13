/**
 * Pure order/order-item status rules — deliberately has zero imports from
 * Prisma or anything else with side effects, so this logic is unit-testable
 * in complete isolation. vendor.service.ts and orders.service.ts both
 * import from here rather than defining their own copies inline.
 */
export const VENDOR_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const CANCELLABLE_STATUSES = new Set(["PENDING", "CONFIRMED"]);
