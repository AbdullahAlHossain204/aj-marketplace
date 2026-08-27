"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/AuthContext";
import { Address } from "../../../lib/types";

const emptyForm = {
  label: "",
  recipientName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "Bangladesh",
  isDefault: false,
};

export default function AddressesPage() {
  const { user, isLoading: authLoading, authFetch } = useAuth();
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  async function loadAddresses() {
    const res = await authFetch<Address[]>("/api/v1/addresses");
    if (res.success && res.data) setAddresses(res.data);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    const res = await authFetch("/api/v1/addresses", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        addressLine2: form.addressLine2 || undefined,
        state: form.state || undefined,
        postalCode: form.postalCode || undefined,
        label: form.label || undefined,
      }),
    });
    setIsSaving(false);
    if (res.success) {
      setForm(emptyForm);
      setShowForm(false);
      loadAddresses();
    } else {
      setError(res.error?.message ?? "Could not save address");
    }
  }

  async function handleDelete(id: string) {
    await authFetch(`/api/v1/addresses/${id}`, { method: "DELETE" });
    loadAddresses();
  }

  async function handleSetDefault(id: string) {
    await authFetch(`/api/v1/addresses/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isDefault: true }),
    });
    loadAddresses();
  }

  if (authLoading || addresses === null) {
    return <main className="mx-auto max-w-2xl px-4 py-8 text-gray-500">Loading addresses...</main>;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">My Account</h1>

      <div className="mb-6 flex gap-4 border-b border-gray-200 text-sm">
        <Link href="/account" className="pb-2 text-gray-600 hover:text-brand-600">
          Profile
        </Link>
        <span className="border-b-2 border-brand-600 pb-2 font-medium text-brand-600">Addresses</span>
      </div>

      <div className="flex flex-col gap-4">
        {addresses.map((addr) => (
          <div key={addr.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                {addr.label && <span className="text-xs font-medium text-gray-500">{addr.label}</span>}
                {addr.isDefault && (
                  <span className="ml-2 rounded bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                    Default
                  </span>
                )}
                <p className="mt-1 font-medium">{addr.recipientName}</p>
                <p className="text-sm text-gray-600">{addr.phone}</p>
                <p className="text-sm text-gray-600">
                  {addr.addressLine1}
                  {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}, {addr.city}
                  {addr.state ? `, ${addr.state}` : ""} {addr.postalCode ?? ""}, {addr.country}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 text-sm">
                {!addr.isDefault && (
                  <button onClick={() => handleSetDefault(addr.id)} className="text-brand-600 hover:underline">
                    Set default
                  </button>
                )}
                <button onClick={() => handleDelete(addr.id)} className="text-red-600 hover:underline">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}

        {addresses.length === 0 && !showForm && (
          <p className="text-gray-500">You haven&apos;t added any addresses yet.</p>
        )}
      </div>

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mt-4 rounded-md border border-brand-600 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
        >
          + Add address
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Label (e.g. Home)"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            <input
              placeholder="Recipient name"
              required
              value={form.recipientName}
              onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <input
            placeholder="Phone"
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <input
            placeholder="Address line 1"
            required
            value={form.addressLine1}
            onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <input
            placeholder="Address line 2 (optional)"
            value={form.addressLine2}
            onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <div className="grid grid-cols-3 gap-3">
            <input
              placeholder="City"
              required
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            <input
              placeholder="State"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            <input
              placeholder="Postal code"
              value={form.postalCode}
              onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            />
            Set as default address
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save address"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
