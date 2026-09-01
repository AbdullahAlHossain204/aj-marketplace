"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/AuthContext";
import { AdminOrderSummary, formatPrice } from "../../../lib/types";

export default function AdminOrdersPage() {
  const { authFetch } = useAuth();
  const [orders, setOrders] = useState<AdminOrderSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const res = await authFetch<AdminOrderSummary[]>("/api/v1/admin/orders?limit=50");
    if (res.success && res.data) setOrders(res.data);
    else setError(res.error?.message ?? "Could not load orders");
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancel this order? Unshipped items will be restocked and, if fully cancelled and paid, refunded.")) return;
    const res = await authFetch(`/api/v1/admin/orders/${id}/cancel`, { method: "POST" });
    if (!res.success) alert(res.error?.message ?? "Could not cancel order");
    load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Orders</h1>

      {error && <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">{error}</div>}

      {orders && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-medium">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{o.user.name}</td>
                  <td className="px-4 py-3">{formatPrice(o.grandTotal, o.currency)}</td>
                  <td className="px-4 py-3">{o.status}</td>
                  <td className="px-4 py-3">{o.paymentStatus}</td>
                  <td className="px-4 py-3 text-right">
                    {o.status !== "CANCELLED" && o.status !== "DELIVERED" && (
                      <button onClick={() => handleCancel(o.id)} className="text-red-600 hover:underline">
                        Cancel
                      </button>
                    )}
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
