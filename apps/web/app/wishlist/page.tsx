"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/AuthContext";
import { WishlistItemView, formatPrice } from "../../lib/types";

export default function WishlistPage() {
  const { user, isLoading: authLoading, authFetch } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<WishlistItemView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    authFetch<WishlistItemView[]>("/api/v1/wishlist").then((res) => {
      if (res.success && res.data) setItems(res.data);
      else setError(res.error?.message ?? "Could not load wishlist");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  async function removeItem(productId: string) {
    await authFetch(`/api/v1/wishlist/items/${productId}`, { method: "DELETE" });
    setItems((prev) => prev?.filter((i) => i.product.id !== productId) ?? null);
  }

  async function moveToCart(productId: string) {
    // Wishlist stores products (not variants), so send the user to the
    // product page to pick a variant before adding to cart.
    router.push(`/products/${items?.find((i) => i.product.id === productId)?.product.slug}`);
  }

  if (authLoading || items === null) {
    return <main className="mx-auto max-w-3xl px-4 py-8 text-gray-500">Loading wishlist...</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Your Wishlist</h1>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      {items.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
          Your wishlist is empty.{" "}
          <Link href="/products" className="text-brand-600 hover:underline">
            Browse products
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {items.map((item) => (
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
              <p className="text-sm font-medium text-brand-600">
                {formatPrice(item.product.price, item.product.currency)}
              </p>
            </div>

            <button
              onClick={() => moveToCart(item.product.id)}
              className="rounded-md border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
            >
              View product
            </button>
            <button onClick={() => removeItem(item.product.id)} className="text-sm text-red-600 hover:underline">
              Remove
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
