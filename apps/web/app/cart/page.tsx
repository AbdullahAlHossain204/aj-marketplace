"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/AuthContext";
import { CartView, formatPrice } from "../../lib/types";

export default function CartPage() {
  const { user, isLoading: authLoading, authFetch } = useAuth();
  const router = useRouter();
  const [cart, setCart] = useState<CartView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  async function loadCart() {
    setIsLoading(true);
    const res = await authFetch<CartView>("/api/v1/cart");
    if (res.success && res.data) setCart(res.data);
    else setError(res.error?.message ?? "Could not load cart");
    setIsLoading(false);
  }

  async function updateQuantity(itemId: string, quantity: number) {
    const res = await authFetch<CartView>(`/api/v1/cart/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
    if (res.success && res.data) setCart(res.data);
    else setError(res.error?.message ?? "Could not update item");
  }

  async function removeItem(itemId: string) {
    const res = await authFetch<CartView>(`/api/v1/cart/items/${itemId}`, { method: "DELETE" });
    if (res.success && res.data) setCart(res.data);
  }

  if (authLoading || isLoading) {
    return <main className="mx-auto max-w-3xl px-4 py-8 text-gray-500">Loading cart...</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Your Cart</h1>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      {cart && cart.items.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
          Your cart is empty.{" "}
          <Link href="/products" className="text-brand-600 hover:underline">
            Start shopping
          </Link>
        </div>
      )}

      {cart && cart.items.length > 0 && (
        <div className="flex flex-col gap-4">
          {cart.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4">
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                {item.product.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.product.image} alt={item.product.name} className="h-full w-full object-cover" />
                ) : null}
              </div>

              <div className="flex-1">
                <Link href={`/products/${item.product.slug}`} className="font-medium hover:text-brand-600">
                  {item.product.name}
                </Link>
                <p className="text-sm text-gray-500">{item.variant.name}</p>
                <p className="text-sm font-medium text-brand-600">{formatPrice(item.unitPrice, item.currency)}</p>
                {item.exceedsStock && (
                  <p className="text-xs text-red-600">Only {item.available} left — please reduce quantity.</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  className="h-8 w-8 rounded border border-gray-300 text-gray-600 disabled:opacity-40"
                >
                  −
                </button>
                <span className="w-8 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  disabled={item.quantity >= item.available}
                  className="h-8 w-8 rounded border border-gray-300 text-gray-600 disabled:opacity-40"
                >
                  +
                </button>
              </div>

              <button onClick={() => removeItem(item.id)} className="text-sm text-red-600 hover:underline">
                Remove
              </button>
            </div>
          ))}

          <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
            <span className="text-lg font-semibold">Subtotal</span>
            <span className="text-lg font-bold text-brand-600">{formatPrice(cart.subtotal, cart.items[0]?.currency ?? "BDT")}</span>
          </div>

          <Link
            href="/checkout"
            className="rounded-md bg-brand-600 px-4 py-3 text-center font-medium text-white hover:bg-brand-700"
          >
            Proceed to Checkout
          </Link>
        </div>
      )}
    </main>
  );
}
