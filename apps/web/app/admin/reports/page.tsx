"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/AuthContext";
import { AdminReviewReport } from "../../../lib/types";

export default function AdminReportsPage() {
  const { authFetch } = useAuth();
  const [reports, setReports] = useState<AdminReviewReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("PENDING");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function load() {
    const res = await authFetch<AdminReviewReport[]>(`/api/v1/admin/reports?status=${filter}&limit=50`);
    if (res.success && res.data) setReports(res.data);
    else setError(res.error?.message ?? "Could not load reports");
  }

  async function triage(id: string, status: "RESOLVED" | "DISMISSED") {
    await authFetch(`/api/v1/admin/reports/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="PENDING">Pending</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
        </select>
      </div>

      <p className="mb-4 text-sm text-gray-500">
        Triaging a report doesn't automatically change the underlying review — moderate it separately on the Reviews
        page if the report is valid.
      </p>

      {error && <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">{error}</div>}

      {reports && reports.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">No reports here.</div>
      )}

      <div className="flex flex-col gap-4">
        {reports?.map((r) => (
          <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{r.review.product.name}</span>
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{r.reason}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Reported by {r.reporter.name} ({r.reporter.email})
            </p>
            {r.details && <p className="mt-2 text-sm text-gray-700">"{r.details}"</p>}

            <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm">
              <p className="text-xs text-gray-500">
                Reported review by {r.review.user.name} · ★ {r.review.rating} · status: {r.review.status}
              </p>
              {r.review.comment && <p className="mt-1">{r.review.comment}</p>}
            </div>

            {r.status === "PENDING" && (
              <div className="mt-3 flex gap-3">
                <button onClick={() => triage(r.id, "RESOLVED")} className="text-sm text-green-600 hover:underline">
                  Mark Resolved
                </button>
                <button onClick={() => triage(r.id, "DISMISSED")} className="text-sm text-gray-500 hover:underline">
                  Dismiss
                </button>
              </div>
            )}
            {r.status !== "PENDING" && <p className="mt-3 text-xs text-gray-400">Status: {r.status}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
