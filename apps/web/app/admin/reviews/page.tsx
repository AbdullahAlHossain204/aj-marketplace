"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/AuthContext";
import { AdminReviewForModeration } from "../../../lib/types";

export default function AdminReviewsPage() {
  const { authFetch } = useAuth();
  const [reviews, setReviews] = useState<AdminReviewForModeration[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("PENDING");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function load() {
    const res = await authFetch<AdminReviewForModeration[]>(`/api/v1/admin/reviews?status=${filter}&limit=50`);
    if (res.success && res.data) setReviews(res.data);
    else setError(res.error?.message ?? "Could not load reviews");
  }

  async function moderate(id: string, status: "APPROVED" | "REJECTED") {
    await authFetch(`/api/v1/admin/reviews/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reviews</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {error && <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">{error}</div>}

      {reviews && reviews.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">No reviews here.</div>
      )}

      <div className="flex flex-col gap-4">
        {reviews?.map((r) => (
          <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{r.product.name}</span>
              <span className="text-sm text-gray-500">★ {r.rating}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              by {r.user.name} ({r.user.email}) {r.isVerifiedPurchase && <span className="text-green-600">· Verified Purchase</span>}
            </p>
            {r.title && <p className="mt-2 font-medium">{r.title}</p>}
            {r.comment && <p className="mt-1 text-sm text-gray-700">{r.comment}</p>}
            {r.status === "PENDING" && (
              <div className="mt-3 flex gap-3">
                <button onClick={() => moderate(r.id, "APPROVED")} className="text-sm text-green-600 hover:underline">
                  Approve
                </button>
                <button onClick={() => moderate(r.id, "REJECTED")} className="text-sm text-red-600 hover:underline">
                  Reject
                </button>
              </div>
            )}
            {r.status !== "PENDING" && (
              <p className="mt-3 text-xs text-gray-400">Status: {r.status}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
