"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/AuthContext";
import { AdminProduct, formatPrice } from "../../../lib/types";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-green-50 text-green-700",
  INACTIVE: "bg-yellow-50 text-yellow-700",
  ARCHIVED: "bg-red-50 text-red-700",
};

const STATUSES = ["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"];

export default function AdminProductsPage() {
  const { authFetch } = useAuth();
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const res = await authFetch<AdminProduct[]>("/api/v1/admin/products?limit=50");
    if (res.success && res.data) setProducts(res.data);
    else setError(res.error?.message ?? "Could not load products");
  }

  async function setStatus(id: string, status: string) {
    await authFetch(`/api/v1/admin/products/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Products</h1>
      <p className="mb-4 text-sm text-gray-500">
        Admin can force a product's status (e.g. take down a policy-violating listing) but cannot edit its content —
        that stays the vendor's responsibility.
      </p>

      {error && <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">{error}</div>}

      {products && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.store.name}</td>
                  <td className="px-4 py-3">{formatPrice(p.basePrice, p.currency)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColors[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <select
                      value={p.status}
                      onChange={(e) => setStatus(p.id, e.target.value)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
