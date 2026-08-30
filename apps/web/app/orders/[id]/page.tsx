"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../lib/AuthContext";
import { OrderView, TransactionView, formatPrice } from "../../../lib/types";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  CONFIRMED: "bg-blue-50 text-blue-700",
  PROCESSING: "bg-blue-50 text-blue-700",
  SHIPPED: "bg-indigo-50 text-indigo-700",
  DELIVERED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
};

const CANCELLABLE = new Set(["PENDING", "CONFIRMED"]);

export default function OrderDetailPage() {
  const { user, isLoading: authLoading, authFetch } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [transactions, setTransactions] = useState<TransactionView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, params.id]);

  async function load() {
    const res = await authFetch<OrderView>(`/api/v1/orders/${params.id}`);
    if (res.success && res.data) setOrder(res.data);
    else setError(res.error?.message ?? "Could not load order");

    const txRes = await authFetch<TransactionView[]>(`/api/v1/orders/${params.id}/transactions`);
    if (txRes.success && txRes.data) setTransactions(txRes.data);
  }

  async function handleCancel() {
    if (!confirm("Cancel this order? This cannot be undone.")) return;
    setIsCancelling(true);
    const res = await authFetch<OrderView>(`/api/v1/orders/${params.id}/cancel`, { method: "POST" });
    setIsCancelling(false);
    if (res.success && res.data) setOrder(res.data);
    else setError(res.error?.message ?? "Could not cancel order");
  }

  if (authLoading || (!order && !error)) {
    return <main className="mx-auto max-w-2xl px-4 py-8 text-gray-500">Loading order...</main>;
  }

  if (error && !order) {
    return <main className="mx-auto max-w-2xl px-4 py-8 text-red-600">{error}</main>;
  }

  if (!order) return null;

  const canCancel = order.items.some((i) => CANCELLABLE.has(i.status));

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-sm text-gray-500">Placed {new Date(order.placedAt).toLocaleString()}</p>
        </div>
        <span className={`rounded px-3 py-1 text-sm font-medium ${statusColors[order.status]}`}>{order.status}</span>
      </div>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-3 font-semibold">Items</h2>
        <div className="flex flex-col gap-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0">
              <div>
                <p className="font-medium">{item.productNameSnapshot}</p>
                <p className="text-sm text-gray-500">
                  {item.variantNameSnapshot} × {item.quantity}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatPrice(item.lineTotal, order.currency)}</p>
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColors[item.status]}`}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {order.address && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-2 font-semibold">Delivery Address</h2>
          <p className="text-sm text-gray-600">{order.address.recipientName}</p>
          <p className="text-sm text-gray-600">{order.address.phone}</p>
          <p className="text-sm text-gray-600">
            {order.address.addressLine1}, {order.address.city}, {order.address.country}
          </p>
        </div>
      )}

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-3 font-semibold">Payment Summary</h2>
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotal, order.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{formatPrice(order.shippingTotal, order.currency)}</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span className="text-brand-600">{formatPrice(order.grandTotal, order.currency)}</span>
          </div>
          <p className="mt-2 text-gray-500">
            Payment: {order.paymentMethod} · {order.paymentStatus}
          </p>
        </div>
      </div>

      {transactions.length > 0 && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-3 font-semibold">Transaction History</h2>
          <div className="flex flex-col gap-2 text-sm">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium">
                    {tx.type === "PAYMENT" ? "Payment" : "Refund"} · {tx.provider}
                  </p>
                  <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString()}</p>
                  {tx.failureReason && <p className="text-xs text-red-600">{tx.failureReason}</p>}
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatPrice(tx.amount, tx.currency)}</p>
                  <span
                    className={`text-xs font-medium ${
                      tx.status === "SUCCEEDED"
                        ? "text-green-600"
                        : tx.status === "FAILED"
                        ? "text-red-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {canCancel && (
        <button
          onClick={handleCancel}
          disabled={isCancelling}
          className="rounded-md border border-red-300 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {isCancelling ? "Cancelling..." : "Cancel Order"}
        </button>
      )}
    </main>
  );
}
