import { prisma } from "../../../lib/prisma";

/**
 * Platform-wide counts across every domain, for the top-level admin
 * dashboard. Deliberately cheap, count-only queries — no joins — so this
 * stays fast even as the platform grows; anything needing row-level detail
 * belongs on the relevant section's own list endpoint (Users, Vendors, etc).
 */
export async function getPlatformOverview() {
  const [
    totalUsers,
    customerCount,
    vendorCount,
    adminCount,
    pendingVendorCount,
    totalStores,
    activeStoreCount,
    totalProducts,
    activeProductCount,
    totalOrders,
    totalReviews,
    pendingReviewCount,
    pendingReportCount,
    activeCouponCount,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { role: "CUSTOMER", deletedAt: null } }),
    prisma.user.count({ where: { role: "VENDOR", deletedAt: null } }),
    prisma.user.count({ where: { role: "ADMIN", deletedAt: null } }),
    prisma.vendorProfile.count({ where: { status: "PENDING" } }),
    prisma.store.count({ where: { deletedAt: null } }),
    prisma.store.count({ where: { isActive: true, deletedAt: null } }),
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.product.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.order.count(),
    prisma.review.count({ where: { deletedAt: null } }),
    prisma.review.count({ where: { status: "PENDING", deletedAt: null } }),
    prisma.reviewReport.count({ where: { status: "PENDING" } }),
    prisma.coupon.count({ where: { isActive: true } }),
  ]);

  return {
    users: { total: totalUsers, customers: customerCount, vendors: vendorCount, admins: adminCount },
    vendors: { pendingApproval: pendingVendorCount },
    stores: { total: totalStores, active: activeStoreCount },
    products: { total: totalProducts, active: activeProductCount },
    orders: { total: totalOrders },
    reviews: { total: totalReviews, pendingModeration: pendingReviewCount },
    reports: { pendingTriage: pendingReportCount },
    promotions: { active: activeCouponCount },
  };
}

/**
 * Revenue overview: total collected revenue, refunds, net, and a simple
 * day-by-day series for the requested window — enough for an admin to see
 * the trend without needing a full BI tool. "Revenue" here means orders
 * that actually collected payment (paymentStatus PAID or REFUNDED both
 * count as having collected — REFUNDED just also nets back out below).
 */
export async function getRevenueOverview(days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const [grossAggregate, refundAggregate, orderCount, ordersInWindow] = await Promise.all([
    prisma.order.aggregate({
      where: { paymentStatus: { in: ["PAID", "REFUNDED"] } },
      _sum: { grandTotal: true },
    }),
    prisma.transaction.aggregate({
      where: { type: "REFUND", status: "SUCCEEDED" },
      _sum: { amount: true },
    }),
    prisma.order.count({ where: { paymentStatus: { in: ["PAID", "REFUNDED"] } } }),
    prisma.order.findMany({
      where: { paymentStatus: { in: ["PAID", "REFUNDED"] }, placedAt: { gte: since } },
      select: { placedAt: true, grandTotal: true },
    }),
  ]);

  const grossRevenue = grossAggregate._sum.grandTotal ?? 0;
  const totalRefunded = refundAggregate._sum.amount ?? 0;
  const netRevenue = grossRevenue - totalRefunded;
  const averageOrderValue = orderCount > 0 ? Math.round(grossRevenue / orderCount) : 0;

  // Bucket into day-by-day totals for the requested window.
  const byDay = new Map<string, number>();
  for (const order of ordersInWindow) {
    const key = order.placedAt.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + order.grandTotal);
  }
  const series = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));

  return {
    grossRevenue,
    totalRefunded,
    netRevenue,
    orderCount,
    averageOrderValue,
    windowDays: days,
    series,
  };
}
