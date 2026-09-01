"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/AuthContext";
import { AdminCoupon, formatPrice } from "../../../lib/types";

export default function AdminPromotionsPage() {
  const { authFetch } = useAuth();
  const [coupons, setCoupons] = useState<AdminCoupon[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState(10);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const res = await authFetch<AdminCoupon[]>("/api/v1/admin/promotions");
    if (res.success && res.data) setCoupons(res.data);
    else setError(res.error?.message ?? "Could not load promotions");
  }

  async function handleCreate() {
    setFormError(null);
    const res = await authFetch("/api/v1/admin/promotions", {
      method: "POST",
      body: JSON.stringify({ code: code.toUpperCase(), discountType, discountValue }),
    });
    if (res.success) {
      setCode("");
      setDiscountValue(10);
      load();
    } else {
      setFormError(res.error?.message ?? "Could not create coupon");
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this coupon?")) return;
    await authFetch(`/api/v1/admin/promotions/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Promotions</h1>
      <p className="mb-6 text-sm text-gray-500">
        Coupons are managed here, but redemption isn't wired into checkout yet — that's a deferred, separate
        checkout-flow change.
      </p>

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm uppercase"
            placeholder="WELCOME10"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Type</label>
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as "PERCENTAGE" | "FIXED")}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed amount</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Value {discountType === "PERCENTAGE" ? "(%)" : "(smallest unit)"}
          </label>
          <input
            type="number"
            value={discountValue}
            onChange={(e) => setDiscountValue(Number(e.target.value))}
            className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={!code}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          + Add Coupon
        </button>
        {formError && <span className="text-sm text-red-600">{formError}</span>}
      </div>

      {error && <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">{error}</div>}

      {coupons && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Used</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-mono font-medium">{c.code}</td>
                  <td className="px-4 py-3">
                    {c.discountType === "PERCENTAGE" ? `${c.discountValue}%` : formatPrice(c.discountValue, "BDT")}
                  </td>
                  <td className="px-4 py-3">
                    {c.usedCount}
                    {c.usageLimit ? ` / ${c.usageLimit}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        c.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.isActive && (
                      <button onClick={() => handleDeactivate(c.id)} className="text-red-600 hover:underline">
                        Deactivate
                      </button>
                    )}
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
