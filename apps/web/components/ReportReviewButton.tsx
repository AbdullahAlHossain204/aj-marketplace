"use client";

import { useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { ReviewReportReason } from "../lib/types";

const REASONS: { value: ReviewReportReason; label: string }[] = [
  { value: "SPAM", label: "Spam" },
  { value: "ABUSIVE", label: "Abusive" },
  { value: "OFFENSIVE", label: "Offensive" },
  { value: "FAKE", label: "Fake / not genuine" },
  { value: "OTHER", label: "Other" },
];

export function ReportReviewButton({ reviewId }: { reviewId: string }) {
  const { user, authFetch } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<ReviewReportReason>("SPAM");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState("");

  if (!user || user.role !== "CUSTOMER") return null;

  if (status === "success") {
    return <span className="text-xs text-gray-500">Reported — thanks for flagging this.</span>;
  }

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="text-xs text-gray-400 hover:text-gray-600 hover:underline">
        Report
      </button>
    );
  }

  async function handleReport() {
    setIsSubmitting(true);
    setStatus("idle");

    const res = await authFetch(`/api/v1/reviews/${reviewId}/report`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });

    setIsSubmitting(false);

    if (res.success) {
      setStatus("success");
    } else {
      setStatus("error");
      setErrorText(res.error?.message ?? "Could not submit report.");
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value as ReviewReportReason)}
        className="rounded border border-gray-300 px-2 py-1"
      >
        {REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <button
        onClick={handleReport}
        disabled={isSubmitting}
        className="rounded bg-gray-100 px-2 py-1 font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
      >
        Submit report
      </button>
      <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
        Cancel
      </button>
      {status === "error" && <span className="text-red-600">{errorText}</span>}
    </div>
  );
}
