"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/AuthContext";
import { VendorProduct, formatPrice } from "../../../lib/types";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-green-50 text-green-700",
  INACTIVE: "bg-yellow-50 text-yellow-700",
  ARCHIVED: "bg-red-50 text-red-700",
};

export default function VendorProductsPage() {
  const { authFetch } = useAuth();
  const [products, setProducts] = useState<VendorProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const res = await authFetch<VendorProduct[]>("/api/v1/vendor/products");
    if (res.success && res.data) setProducts(res.data);
    else setError(res.error?.message ?? "Could not load products");
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    await authFetch(`/api/v1/vendor/products/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link
          href="/vendor/products/new"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Add Product
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">{error}</div>
      )}

      {products && products.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
          No products yet. Create your first one to get started.
        </div>
      )}

      {products && products.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const stock = p.variants.reduce((sum, v) => sum + (v.inventory?.quantity ?? 0), 0);
                return (
                  <tr key={p.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                          {p.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.images[0].url} alt={p.name} className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <span className="font-medium">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{formatPrice(p.basePrice, p.currency)}</td>
                    <td className="px-4 py-3">{stock}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColors[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/vendor/products/${p.id}/edit`} className="mr-3 text-brand-600 hover:underline">
                        Edit
                      </Link>
                      <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline">
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
