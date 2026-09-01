"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/AuthContext";
import { AdminVendor } from "../../../lib/types";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  APPROVED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
  SUSPENDED: "bg-red-50 text-red-700",
};

export default function AdminVendorsPage() {
  const { authFetch } = useAuth();
  const [vendors, setVendors] = useState<AdminVendor[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const res = await authFetch<AdminVendor[]>("/api/v1/admin/vendors?limit=50");
    if (res.success && res.data) setVendors(res.data);
    else setError(res.error?.message ?? "Could not load vendors");
  }

  async function setStatus(id: string, status: string) {
    await authFetch(`/api/v1/admin/vendors/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Vendors</h1>

      {error && <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">{error}</div>}

      {vendors && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-medium">{v.businessName}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {v.user.name} · {v.user.email}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{v.store?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColors[v.status]}`}>{v.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      {v.status !== "APPROVED" && (
                        <button onClick={() => setStatus(v.id, "APPROVED")} className="text-green-600 hover:underline">
                          Approve
                        </button>
                      )}
                      {v.status !== "REJECTED" && v.status === "PENDING" && (
                        <button onClick={() => setStatus(v.id, "REJECTED")} className="text-red-600 hover:underline">
                          Reject
                        </button>
                      )}
                      {v.status === "APPROVED" && (
                        <button onClick={() => setStatus(v.id, "SUSPENDED")} className="text-red-600 hover:underline">
                          Suspend
                        </button>
                      )}
                      {v.status === "SUSPENDED" && (
                        <button onClick={() => setStatus(v.id, "APPROVED")} className="text-green-600 hover:underline">
                          Reinstate
                        </button>
                      )}
                    </div>
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
