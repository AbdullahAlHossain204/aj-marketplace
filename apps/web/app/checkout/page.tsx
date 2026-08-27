"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/AuthContext";
import { Address, CartView, OrderView, formatPrice } from "../../lib/types";

export default function CheckoutPage() {
  const { user, isLoading: authLoading, authFetch } = useAuth();
  const router = useRouter();
  const [cart, setCart] = useState<CartView | null>(null);
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    Promise.all([authFetch<CartView>("/api/v1/cart"), authFetch<Address[]>("/api/v1/addresses")]).then(
      ([cartRes, addrRes]) => {
        if (cartRes.success && cartRes.data) setCart(cartRes.data);
        if (addrRes.success && addrRes.data) {
          setAddresses(addrRes.data);
          const defaultAddr = addrRes.data.find((a) => a.isDefault) ?? addrRes.data[0];
          if (defaultAddr) setSelectedAddressId(defaultAddr.id);
        }
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  async function handlePlaceOrder() {
    if (!selectedAddressId) {
      setError("Please select a delivery address.");
      return;
    }
    setIsPlacing(true);
    setError(null);

    const res = await authFetch<OrderView>("/api/v1/orders", {
      method: "POST",
      body: JSON.stringify({ addressId: selectedAddressId, paymentMethod: "COD" }),
    });

    setIsPlacing(false);
    if (res.success && res.data) {
      router.push(`/orders/${res.data.id}`);
    } else {
      setError(res.error?.message ?? "Could not place order");
    }
  }

  if (authLoading || cart === null || addresses === null) {
    return <main className="mx-auto max-w-2xl px-4 py-8 text-gray-500">Loading checkout...</main>;
  }

  if (cart.items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
          Your cart is empty.{" "}
          <Link href="/products" className="text-brand-600 hover:underline">
            Start shopping
          </Link>
        </div>
      </main>
    );
  }

  const shippingTotal = 6000;
  const grandTotal = cart.subtotal + shippingTotal;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Checkout</h1>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Delivery Address</h2>
          <Link href="/account/addresses" className="text-sm text-brand-600 hover:underline">
            Manage addresses
          </Link>
        </div>

        {addresses.length === 0 ? (
          <p className="text-sm text-gray-500">
            You don&apos;t have any saved addresses.{" "}
            <Link href="/account/addresses" className="text-brand-600 hover:underline">
              Add one to continue
            </Link>
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {addresses.map((addr) => (
              <label
                key={addr.id}
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm ${
                  selectedAddressId === addr.id ? "border-brand-600 bg-brand-50" : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name="address"
                  checked={selectedAddressId === addr.id}
                  onChange={() => setSelectedAddressId(addr.id)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">
                    {addr.recipientName} {addr.isDefault && <span className="text-xs text-brand-600">(Default)</span>}
                  </p>
                  <p className="text-gray-600">{addr.phone}</p>
                  <p className="text-gray-600">
                    {addr.addressLine1}, {addr.city}, {addr.country}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-3 font-semibold">Order Summary</h2>
        <div className="flex flex-col gap-2 text-sm">
          {cart.items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>
                {item.product.name} × {item.quantity}
              </span>
              <span>{formatPrice(item.lineTotal, item.currency)}</span>
            </div>
          ))}
          <hr className="my-2" />
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPrice(cart.subtotal, "BDT")}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{formatPrice(shippingTotal, "BDT")}</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span className="text-brand-600">{formatPrice(grandTotal, "BDT")}</span>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-2 font-semibold">Payment Method</h2>
        <p className="text-sm text-gray-600">Cash on Delivery (online payment coming soon)</p>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <button
        onClick={handlePlaceOrder}
        disabled={isPlacing || addresses.length === 0}
        className="w-full rounded-md bg-brand-600 px-4 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {isPlacing ? "Placing order..." : "Place Order"}
      </button>
    </main>
  );
}
