"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../../../lib/AuthContext";
import { VendorStore } from "../../../lib/types";

export default function VendorStorePage() {
  const { authFetch } = useAuth();
  const [store, setStore] = useState<VendorStore | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "" });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authFetch<VendorStore>("/api/v1/vendor/store").then((res) => {
      if (res.success && res.data) {
        setStore(res.data);
        setForm({ name: res.data.name, slug: res.data.slug, description: res.data.description ?? "" });
      } else {
        setNotFound(true);
      }
      setIsLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const res = await authFetch<VendorStore>("/api/v1/vendor/store", {
      method: "POST",
      body: JSON.stringify({
        name: form.name,
        slug: form.slug || slugify(form.name),
        description: form.description || undefined,
      }),
    });
    setIsSaving(false);
    if (res.success && res.data) {
      setStore(res.data);
      setNotFound(false);
      setMessage({ type: "success", text: "Store created!" });
    } else {
      setMessage({ type: "error", text: res.error?.message ?? "Could not create store" });
    }
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const res = await authFetch<VendorStore>("/api/v1/vendor/store", {
      method: "PATCH",
      body: JSON.stringify({ name: form.name, description: form.description || undefined }),
    });
    setIsSaving(false);
    if (res.success && res.data) {
      setStore(res.data);
      setMessage({ type: "success", text: "Store updated!" });
    } else {
      setMessage({ type: "error", text: res.error?.message ?? "Could not update store" });
    }
  }

  if (isLoading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Store Settings</h1>

      {notFound && (
        <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          You haven&apos;t created a store yet. Set one up below to start listing products.
        </div>
      )}

      <form
        onSubmit={notFound ? handleCreate : handleUpdate}
        className="flex max-w-xl flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Store name</label>
          <input
            type="text"
            required
            minLength={2}
            value={form.name}
            onChange={(e) => {
              const name = e.target.value;
              setForm((f) => ({ ...f, name, slug: notFound ? slugify(name) : f.slug }));
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>

        {notFound && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Store URL</label>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <span>/store/</span>
              <input
                type="text"
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {!notFound && store && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Store URL</label>
            <p className="text-sm text-gray-500">/store/{store.slug} (cannot be changed)</p>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>

        {message && (
          <p className={message.type === "success" ? "text-sm text-green-600" : "text-sm text-red-600"}>
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : notFound ? "Create store" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
