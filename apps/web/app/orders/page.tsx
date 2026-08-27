"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/AuthContext";
import { OrderView, formatPrice } from "../../lib/types";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  CONFIRMED: "bg-blue-50 text-blue-700",
  PROCESSING: "bg-blue-50 text-blue-700",
  SHIPPED: "bg-indigo-50 text-indigo-700",
  DELIVERED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
};

export default function OrdersPage() {
  const { user, isLoading: authLoading, authFetch } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderView[] | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    authFetch<OrderView[]>("/api/v1/orders").then((res) => {
      if (res.success && res.data) setOrders(res.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  if (authLoading || orders === null) {
    return <main className="mx-auto max-w-3xl px-4 py-8 text-gray-500">Loading orders...</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Your Orders</h1>

      {orders.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
          You haven&apos;t placed any orders yet.{" "}
          <Link href="/products" className="text-brand-600 hover:underline">
            Start shopping
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md"
          >
            <div>
              <p className="font-medium">{order.orderNumber}</p>
              <p className="text-sm text-gray-500">
                {new Date(order.placedAt).toLocaleDateString()} · {order.items.length} item(s)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColors[order.status]}`}>
                {order.status}
              </span>
              <span className="font-semibold text-brand-600">{formatPrice(order.grandTotal, order.currency)}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
