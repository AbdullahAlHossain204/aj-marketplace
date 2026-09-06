"use client";

import { Fragment, useEffect, useState } from "react";
import { useAuth } from "../../../lib/AuthContext";
import { OrderItemView, formatPrice } from "../../../lib/types";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  CONFIRMED: "bg-blue-50 text-blue-700",
  PROCESSING: "bg-blue-50 text-blue-700",
  SHIPPED: "bg-indigo-50 text-indigo-700",
  DELIVERED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
};

const NEXT_STATUS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export default function VendorOrdersPage() {
  const { authFetch } = useAuth();
  const [items, setItems] = useState<OrderItemView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [shippingFormId, setShippingFormId] = useState<string | null>(null);
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [estimatedDeliveryAt, setEstimatedDeliveryAt] = useState("");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const res = await authFetch<OrderItemView[]>("/api/v1/vendor/orders");
    if (res.success && res.data) setItems(res.data);
    else setError(res.error?.message ?? "Could not load orders");
  }

  async function updateStatus(itemId: string, status: string) {
    setUpdatingId(itemId);
    const res = await authFetch(`/api/v1/vendor/orders/${itemId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setUpdatingId(null);
    if (res.success) load();
    else alert(res.error?.message ?? "Could not update status");
  }

  function openShippingForm(item: OrderItemView) {
    setShippingFormId(item.id);
    setCarrier(item.carrier ?? "");
    setTrackingNumber(item.trackingNumber ?? "");
    setEstimatedDeliveryAt(item.estimatedDeliveryAt ? item.estimatedDeliveryAt.slice(0, 10) : "");
  }

  async function saveShippingInfo(itemId: string) {
    const res = await authFetch(`/api/v1/vendor/orders/${itemId}/shipping`, {
      method: "PATCH",
      body: JSON.stringify({
        carrier: carrier || undefined,
        trackingNumber: trackingNumber || undefined,
        estimatedDeliveryAt: estimatedDeliveryAt || undefined,
      }),
    });
    if (res.success) {
      setShippingFormId(null);
      load();
    } else {
      alert(res.error?.message ?? "Could not save shipping info");
    }
  }

  if (error) {
    return <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">{error}</div>;
  }

  if (!items) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Orders</h1>

      {items.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
          No orders yet. Once customers buy your products, they&apos;ll show up here.
        </div>
      )}

      {items.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Shipping</th>
                <th className="px-4 py-3">Update</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const nextOptions = NEXT_STATUS[item.status] ?? [];
                return (
                  <Fragment key={item.id}>
                    <tr className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3">{item.order?.orderNumber ?? "—"}</td>
                      <td className="px-4 py-3">
                        {item.productNameSnapshot}
                        <span className="text-gray-400"> ({item.variantNameSnapshot})</span>
                      </td>
                      <td className="px-4 py-3">{item.quantity}</td>
                      <td className="px-4 py-3">{formatPrice(item.lineTotal, "BDT")}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColors[item.status]}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.trackingNumber ? (
                          <button onClick={() => openShippingForm(item)} className="text-brand-600 hover:underline">
                            {item.carrier ?? "Carrier"} · {item.trackingNumber}
                          </button>
                        ) : (
                          <button onClick={() => openShippingForm(item)} className="text-gray-500 hover:underline">
                            + Add tracking
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {nextOptions.length > 0 ? (
                          <select
                            disabled={updatingId === item.id}
                            value=""
                            onChange={(e) => e.target.value && updateStatus(item.id, e.target.value)}
                            className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none"
                          >
                            <option value="">Move to...</option>
                            {nextOptions.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                    {shippingFormId === item.id && (
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="flex flex-wrap items-end gap-2">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-600">Carrier</label>
                              <input
                                value={carrier}
                                onChange={(e) => setCarrier(e.target.value)}
                                placeholder="e.g. Pathao, RedX..."
                                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-600">Tracking number</label>
                              <input
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-600">Est. delivery</label>
                              <input
                                type="date"
                                value={estimatedDeliveryAt}
                                onChange={(e) => setEstimatedDeliveryAt(e.target.value)}
                                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                              />
                            </div>
                            <button
                              onClick={() => saveShippingInfo(item.id)}
                              className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setShippingFormId(null)}
                              className="rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
