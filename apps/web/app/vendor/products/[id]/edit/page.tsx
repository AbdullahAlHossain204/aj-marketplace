"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "../../../../../lib/apiClient";
import { useAuth } from "../../../../../lib/AuthContext";
import { Category, VendorProduct } from "../../../../../lib/types";

export default function EditVendorProductPage() {
  const { authFetch } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [product, setProduct] = useState<VendorProduct | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ name: "", description: "", basePrice: "", categoryId: "", status: "DRAFT" as string });
  const [stockEdits, setStockEdits] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    apiFetch<Category[]>("/api/v1/categories").then((res) => {
      if (res.success && res.data) setCategories(res.data);
    });
    authFetch<VendorProduct>(`/api/v1/vendor/products/${params.id}`).then((res) => {
      if (res.success && res.data) {
        setProduct(res.data);
        setForm({
          name: res.data.name,
          description: res.data.description ?? "",
          basePrice: String(res.data.basePrice / 100),
          categoryId: res.data.category.id,
          status: res.data.status,
        });
        const edits: Record<string, string> = {};
        res.data.variants.forEach((v) => (edits[v.id] = String(v.inventory?.quantity ?? 0)));
        setStockEdits(edits);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const res = await authFetch(`/api/v1/vendor/products/${params.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: form.name,
        description: form.description || undefined,
        categoryId: form.categoryId,
        basePrice: Math.round(Number(form.basePrice) * 100),
        status: form.status,
      }),
    });

    if (!res.success) {
      setIsSaving(false);
      setMessage({ type: "error", text: res.error?.message ?? "Could not update product" });
      return;
    }

    // Push any changed stock quantities.
    if (product) {
      for (const variant of product.variants) {
        const newQty = Number(stockEdits[variant.id]);
        if (!isNaN(newQty) && newQty !== variant.inventory?.quantity) {
          await authFetch(`/api/v1/vendor/products/${params.id}/variants/${variant.id}/inventory`, {
            method: "PATCH",
            body: JSON.stringify({ quantity: newQty }),
          });
        }
      }
    }

    setIsSaving(false);
    setMessage({ type: "success", text: "Product updated!" });
  }

  if (!product) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Edit Product</h1>

      <form onSubmit={handleSave} className="flex max-w-xl flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Product name</label>
          <input
            type="text"
            required
            minLength={2}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
          <select
            required
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Price</label>
          <input
            type="number"
            required
            min={0}
            step="0.01"
            value={form.basePrice}
            onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Stock by variant</label>
          <div className="flex flex-col gap-2">
            {product.variants.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2">
                <span className="text-sm">
                  {v.name} <span className="text-gray-400">({v.sku})</span>
                </span>
                <input
                  type="number"
                  min={0}
                  value={stockEdits[v.id] ?? "0"}
                  onChange={(e) => setStockEdits({ ...stockEdits, [v.id]: e.target.value })}
                  className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        {message && (
          <p className={message.type === "success" ? "text-sm text-green-600" : "text-sm text-red-600"}>
            {message.text}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/vendor/products")}
            className="rounded-md border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Back to products
          </button>
        </div>
      </form>
    </div>
  );
}
