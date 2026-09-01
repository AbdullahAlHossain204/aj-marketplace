"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/AuthContext";
import { AdminCategory } from "../../../lib/types";

export default function AdminCategoriesPage() {
  const { authFetch } = useAuth();
  const [categories, setCategories] = useState<AdminCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const res = await authFetch<AdminCategory[]>("/api/v1/admin/categories");
    if (res.success && res.data) setCategories(res.data);
    else setError(res.error?.message ?? "Could not load categories");
  }

  async function handleCreate() {
    setFormError(null);
    const res = await authFetch("/api/v1/admin/categories", {
      method: "POST",
      body: JSON.stringify({ name, slug }),
    });
    if (res.success) {
      setName("");
      setSlug("");
      load();
    } else {
      setFormError(res.error?.message ?? "Could not create category");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category? It must have no active products.")) return;
    const res = await authFetch(`/api/v1/admin/categories/${id}`, { method: "DELETE" });
    if (!res.success) alert(res.error?.message ?? "Could not delete category");
    load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Categories</h1>

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Slug</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="lowercase-with-hyphens"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={!name || !slug}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          + Add Category
        </button>
        {formError && <span className="text-sm text-red-600">{formError}</span>}
      </div>

      {error && <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">{error}</div>}

      {categories && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.slug}</td>
                  <td className="px-4 py-3 text-gray-600">{c.parent?.name ?? "—"}</td>
                  <td className="px-4 py-3">{c._count.products}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
