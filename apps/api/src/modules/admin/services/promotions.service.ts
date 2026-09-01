import { prisma } from "../../../lib/prisma";
import { ConflictError, NotFoundError } from "../../../lib/errors";
import { CreateCouponInput, UpdateCouponInput } from "../admin.schemas";
import { recordAuditLog } from "./audit.service";

/**
 * DELIBERATE SCOPE NOTE: this gives admins full coupon CRUD, but coupon
 * *redemption* is not wired into checkout — orders.service.ts's checkout()
 * doesn't currently accept or apply a coupon code. Wiring that up is a
 * customer-facing checkout change, not an admin-panel concern, and is
 * flagged as a known gap in the Phase 10 completion report rather than
 * silently expanded into here.
 */
export async function listCoupons() {
  return prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createCoupon(adminId: string, input: CreateCouponInput) {
  const existing = await prisma.coupon.findUnique({ where: { code: input.code } });
  if (existing) throw new ConflictError("A coupon with this code already exists");

  const coupon = await prisma.coupon.create({ data: input });
  await recordAuditLog(adminId, "COUPON_CREATE", "Coupon", coupon.id);
  return coupon;
}

export async function updateCoupon(adminId: string, couponId: string, input: UpdateCouponInput) {
  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!coupon) throw new NotFoundError("Coupon");

  const updated = await prisma.coupon.update({ where: { id: couponId }, data: input });
  await recordAuditLog(adminId, "COUPON_UPDATE", "Coupon", couponId);
  return updated;
}

/** Coupons have no deletedAt column (they're a promotional/config concept,
 * not user content) — "deleting" one just deactivates it, which is
 * sufficient since Order.couponId is kept for historical orders regardless. */
export async function deactivateCoupon(adminId: string, couponId: string) {
  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!coupon) throw new NotFoundError("Coupon");

  await prisma.coupon.update({ where: { id: couponId }, data: { isActive: false } });
  await recordAuditLog(adminId, "COUPON_DEACTIVATE", "Coupon", couponId);
}
