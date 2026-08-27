"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/AuthContext";
import { CartView, ProductVariant } from "../lib/types";

export function ProductActions({
  productId,
  variants,
}: {
  productId: string;
  variants: ProductVariant[];
}) {
  const { user, authFetch } = useAuth();
  const router = useRouter();
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);

  async function handleAddToCart() {
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "CUSTOMER") {
      setMessage({ type: "error", text: "Only customer accounts can add items to a cart." });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    const res = await authFetch<CartView>("/api/v1/cart/items", {
      method: "POST",
      body: JSON.stringify({ productVariantId: selectedVariantId, quantity }),
    });
    setIsSubmitting(false);

    if (res.success) {
      setMessage({ type: "success", text: "Added to cart!" });
    } else {
      setMessage({ type: "error", text: res.error?.message ?? "Could not add to cart." });
    }
  }

  async function handleAddToWishlist() {
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "CUSTOMER") {
      setMessage({ type: "error", text: "Only customer accounts can use the wishlist." });
      return;
    }

    const res = await authFetch("/api/v1/wishlist/items", {
      method: "POST",
      body: JSON.stringify({ productId }),
    });

    setMessage(
      res.success
        ? { type: "success", text: "Added to wishlist!" }
        : { type: "error", text: res.error?.message ?? "Could not add to wishlist." }
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {variants.length > 1 && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Variant</label>
          <select
            value={selectedVariantId}
            onChange={(e) => setSelectedVariantId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id} disabled={v.available === 0}>
                {v.name} {v.available === 0 ? "(Out of stock)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Quantity</label>
        <input
          type="number"
          min={1}
          max={selectedVariant?.available ?? 99}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
          className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleAddToCart}
          disabled={isSubmitting || !selectedVariant || selectedVariant.available === 0}
          className="flex-1 rounded-md bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {selectedVariant?.available === 0 ? "Out of stock" : "Add to Cart"}
        </button>
        <button
          onClick={handleAddToWishlist}
          className="rounded-md border border-gray-300 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
        >
          ♡ Wishlist
        </button>
      </div>

      {message && (
        <p className={message.type === "success" ? "text-sm text-green-600" : "text-sm text-red-600"}>
          {message.text}
        </p>
      )}
    </div>
  );
}
