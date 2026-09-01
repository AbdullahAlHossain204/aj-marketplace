"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/AuthContext";
import { PlatformOverview, RevenueOverview, formatPrice } from "../../../lib/types";

export default function AdminDashboardPage() {
  const { authFetch } = useAuth();
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [revenue, setRevenue] = useState<RevenueOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      authFetch<PlatformOverview>("/api/v1/admin/overview"),
      authFetch<RevenueOverview>("/api/v1/admin/revenue?days=30"),
    ]).then(([o, r]) => {
      if (o.success && o.data) setOverview(o.data);
      else setError(o.error?.message ?? "Could not load overview");
      if (r.success && r.data) setRevenue(r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">{error}</div>;
  if (!overview || !revenue) return <p className="text-gray-500">Loading...</p>;

  const platformStats = [
    { label: "Total Users", value: overview.users.total },
    { label: "Customers", value: overview.users.customers },
    { label: "Vendors", value: overview.users.vendors },
    { label: "Pending Vendor Approvals", value: overview.vendors.pendingApproval, highlight: overview.vendors.pendingApproval > 0 },
    { label: "Active Stores", value: `${overview.stores.active} / ${overview.stores.total}` },
    { label: "Active Products", value: `${overview.products.active} / ${overview.products.total}` },
    { label: "Total Orders", value: overview.orders.total },
    { label: "Pending Review Moderation", value: overview.reviews.pendingModeration, highlight: overview.reviews.pendingModeration > 0 },
    { label: "Pending Report Triage", value: overview.reports.pendingTriage, highlight: overview.reports.pendingTriage > 0 },
    { label: "Active Promotions", value: overview.promotions.active },
  ];

  const revenueStats = [
    { label: "Gross Revenue", value: formatPrice(revenue.grossRevenue, "BDT") },
    { label: "Refunded", value: formatPrice(revenue.totalRefunded, "BDT") },
    { label: "Net Revenue", value: formatPrice(revenue.netRevenue, "BDT") },
    { label: "Paid Orders", value: revenue.orderCount },
    { label: "Avg. Order Value", value: formatPrice(revenue.averageOrderValue, "BDT") },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-4 text-2xl font-bold">Platform Overview</h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {platformStats.map((s) => (
            <div
              key={s.label}
              className={`rounded-lg border p-4 ${s.highlight ? "border-yellow-300 bg-yellow-50" : "border-gray-200 bg-white"}`}
            >
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="mt-1 text-xl font-semibold">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-xl font-bold">Revenue Overview (last {revenue.windowDays} days)</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {revenueStats.map((s) => (
            <div key={s.label} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="mt-1 text-xl font-semibold">{s.value}</p>
            </div>
          ))}
        </div>

        {revenue.series.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {revenue.series.map((d) => (
                  <tr key={d.date} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2">{d.date}</td>
                    <td className="px-4 py-2">{formatPrice(d.revenue, "BDT")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
