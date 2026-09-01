"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/apiClient";
import { Category } from "../lib/types";

export function ProductFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const [brands, setBrands] = useState<string[]>([]);

  useEffect(() => {
    apiFetch<string[]>("/api/v1/products/brands").then((res) => {
      if (res.success && res.data) setBrands(res.data);
    });
  }, []);

  function applyParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    params.delete("page"); // any filter change resets pagination
    router.push(`/products?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-gray-200 bg-white p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          applyParams({ search: search || null });
        }}
        className="flex flex-col gap-2"
      >
        <label className="text-sm font-medium text-gray-700">Search</label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
      </form>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Category</label>
        <select
          value={searchParams.get("category") ?? ""}
          onChange={(e) => applyParams({ category: e.target.value || null })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {brands.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Brand</label>
          <select
            value={searchParams.get("brand") ?? ""}
            onChange={(e) => applyParams({ brand: e.target.value || null })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Price range</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onBlur={() => applyParams({ minPrice: minPrice ? String(Number(minPrice) * 100) : null })}
            placeholder="Min"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <span className="text-gray-400">–</span>
          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            onBlur={() => applyParams({ maxPrice: maxPrice ? String(Number(maxPrice) * 100) : null })}
            placeholder="Max"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Minimum rating</label>
        <select
          value={searchParams.get("minRating") ?? ""}
          onChange={(e) => applyParams({ minRating: e.target.value || null })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">Any rating</option>
          <option value="4">★ 4 & up</option>
          <option value="3">★ 3 & up</option>
          <option value="2">★ 2 & up</option>
          <option value="1">★ 1 & up</option>
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          checked={searchParams.get("inStock") === "true"}
          onChange={(e) => applyParams({ inStock: e.target.checked ? "true" : null })}
        />
        In stock only
      </label>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Sort by</label>
        <select
          value={searchParams.get("sort") ?? "newest"}
          onChange={(e) => applyParams({ sort: e.target.value })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="rating_desc">Highest Rated</option>
        </select>
      </div>
    </div>
  );
}
