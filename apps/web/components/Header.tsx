"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { CartView } from "../lib/types";

export function Header() {
  const { user, isLoading, logout, authFetch } = useAuth();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (!user || user.role !== "CUSTOMER") {
      setCartCount(0);
      return;
    }
    authFetch<CartView>("/api/v1/cart").then((res) => {
      if (res.success && res.data) setCartCount(res.data.itemCount);
    });
  }, [user, authFetch]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    router.push(`/products?search=${encodeURIComponent(searchValue)}`);
  }

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href="/" className="text-xl font-bold text-brand-600">
          AJ Market
        </Link>

        <form onSubmit={handleSearch} className="flex flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-l-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-r-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Search
          </button>
        </form>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/products" className="text-gray-700 hover:text-brand-600">
            Shop
          </Link>

          {!isLoading && user?.role === "CUSTOMER" && (
            <>
              <Link href="/orders" className="text-gray-700 hover:text-brand-600">
                Orders
              </Link>
              <Link href="/wishlist" className="text-gray-700 hover:text-brand-600">
                Wishlist
              </Link>
              <Link href="/cart" className="text-gray-700 hover:text-brand-600">
                Cart {cartCount > 0 && `(${cartCount})`}
              </Link>
            </>
          )}

          {!isLoading && !user && (
            <>
              <Link href="/login" className="text-gray-700 hover:text-brand-600">
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700"
              >
                Sign up
              </Link>
            </>
          )}

          {!isLoading && user && (
            <>
              <Link href="/account" className="text-gray-700 hover:text-brand-600">
                Hi, {user.name.split(" ")[0]}
              </Link>
              <button onClick={() => logout()} className="text-gray-700 hover:text-brand-600">
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
