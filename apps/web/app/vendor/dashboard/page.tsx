"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/AuthContext";
import { VendorDashboard } from "../../../lib/types";

export default function VendorDashboardPage() {
  const { authFetch } = useAuth();
  const [data, setData] = useState<VendorDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authFetch<VendorDashboard>("/api/v1/vendor/dashboard").then((res) => {
      if (res.success && res.data) setData(res.data);
      else setError(res.error?.message ?? "Could not load dashboard");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="mb-4 text-gray-600">{error}</p>
        {error.toLowerCase().includes("store") && (
          <Link href="/vendor/store" className="text-brand-600 hover:underline">
            Set up your store to get started
          </Link>
        )}
      </div>
    );
  }

  if (!data) return <p className="text-gray-500">Loading...</p>;

  const stats = [
    { label: "Total Products", value: data.productCount },
    { label: "Active Products", value: data.activeProductCount },
    { label: "Draft Products", value: data.draftProductCount },
    { label: "Stock Units", value: data.totalStockUnits },
    { label: "Low Stock Alerts", value: data.lowStockVariants },
    { label: "Total Orders", value: data.totalOrders },
    {
      label: "Store Rating",
      value: data.storeRating !== null ? `★ ${data.storeRating.toFixed(1)} (${data.storeReviewCount})` : "No reviews yet",
    },
  ];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">{data.store.name}</h1>
      <div className="mb-6 flex items-center gap-2 text-sm">
        <span className="text-gray-500">Vendor status:</span>
        <span
          className={`rounded px-2 py-0.5 font-medium ${
            data.vendorStatus === "APPROVED"
              ? "bg-green-50 text-green-700"
              : data.vendorStatus === "PENDING"
              ? "bg-yellow-50 text-yellow-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {data.vendorStatus}
        </span>
        {data.vendorStatus === "PENDING" && (
          <span className="text-gray-500">— products can be saved as drafts until approval</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-2xl font-bold text-brand-600">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Link
          href="/vendor/products/new"
          className="rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Add Product
        </Link>
      </div>
    </div>
  );
}
