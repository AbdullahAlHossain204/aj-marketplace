import { prisma } from "../../../lib/prisma";
import { NotFoundError } from "../../../lib/errors";
import { AdminVendorListQuery } from "../admin.schemas";
import { recordAuditLog } from "./audit.service";
import { notifyVendorStatusChanged } from "../../notifications/notifications.service";

export async function listVendors(query: AdminVendorListQuery) {
  const where = {
    deletedAt: null,
    ...(query.status && { status: query.status }),
  };

  const [items, total] = await Promise.all([
    prisma.vendorProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        user: { select: { id: true, name: true, email: true, isActive: true } },
        store: { select: { id: true, name: true, slug: true, isActive: true } },
      },
    }),
    prisma.vendorProfile.count({ where }),
  ]);

  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function getVendor(vendorProfileId: string) {
  const profile = await prisma.vendorProfile.findUnique({
    where: { id: vendorProfileId },
    include: {
      user: { select: { id: true, name: true, email: true, isActive: true, createdAt: true } },
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          _count: { select: { products: true } },
        },
      },
    },
  });

  if (!profile || profile.deletedAt) throw new NotFoundError("Vendor profile");
  return profile;
}

/**
 * Vendor approval/rejection/suspension. Unlike the order status machine,
 * this deliberately has no forward-only transition constraint — an admin
 * needs to be able to reinstate a SUSPENDED vendor back to APPROVED, or
 * reconsider a REJECTED application, at their own discretion. approvedAt
 * is stamped the first time a vendor reaches APPROVED and left alone after
 * that (re-approving doesn't erase the original approval date).
 */
export async function setVendorStatus(adminId: string, vendorProfileId: string, status: string) {
  const profile = await prisma.vendorProfile.findUnique({ where: { id: vendorProfileId } });
  if (!profile || profile.deletedAt) throw new NotFoundError("Vendor profile");

  const updated = await prisma.vendorProfile.update({
    where: { id: vendorProfileId },
    data: {
      status: status as any,
      ...(status === "APPROVED" && !profile.approvedAt && { approvedAt: new Date() }),
    },
  });

  await recordAuditLog(adminId, "VENDOR_STATUS_CHANGE", "VendorProfile", vendorProfileId, {
    from: profile.status,
    to: status,
  });

  // notifyVendorStatusChanged no-ops for any status other than
  // APPROVED/REJECTED/SUSPENDED (e.g. a bounce back to PENDING) — see its
  // doc comment in notifications.service.ts.
  await notifyVendorStatusChanged(profile.userId, status, updated.businessName);

  return updated;
}
