"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/AuthContext";
import { AdminStore } from "../../../lib/types";

export default function AdminStoresPage() {
  const { authFetch } = useAuth();
  const [stores, setStores] = useState<AdminStore[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const res = await authFetch<AdminStore[]>("/api/v1/admin/stores?limit=50");
    if (res.success && res.data) setStores(res.data);
    else setError(res.error?.message ?? "Could not load stores");
  }

  async function toggleActive(s: AdminStore) {
    const label = s.isActive ? "suspend" : "reactivate";
    if (!confirm(`Are you sure you want to ${label} "${s.name}"?`)) return;
    await authFetch(`/api/v1/admin/stores/${s.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Stores</h1>

      {error && <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">{error}</div>}

      {stores && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Vendor Status</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {stores.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.vendorProfile.status}</td>
                  <td className="px-4 py-3">{s._count.products}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        s.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      }`}
                    >
                      {s.isActive ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toggleActive(s)} className="text-brand-600 hover:underline">
                      {s.isActive ? "Suspend" : "Reactivate"}
                    </button>
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
