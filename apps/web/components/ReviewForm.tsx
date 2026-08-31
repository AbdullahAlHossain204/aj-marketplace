"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/AuthContext";
import { Review } from "../lib/types";

export function ReviewForm({ productId }: { productId: string }) {
  const { user, authFetch } = useAuth();
  const router = useRouter();

  const [existingReview, setExistingReview] = useState<Review | null | undefined>(undefined); // undefined = still loading
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!user || user.role !== "CUSTOMER") {
      setExistingReview(null);
      return;
    }
    authFetch<Review | null>(`/api/v1/reviews/mine/${productId}`).then((res) => {
      if (res.success) {
        setExistingReview(res.data);
        if (res.data) {
          setRating(res.data.rating);
          setTitle(res.data.title ?? "");
          setComment(res.data.comment ?? "");
        }
      } else {
        setExistingReview(null);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, productId]);

  if (!user) {
    return (
      <p className="text-sm text-gray-500">
        <button onClick={() => router.push("/login")} className="text-brand-600 hover:underline">
          Log in
        </button>{" "}
        to write a review.
      </p>
    );
  }

  if (user.role !== "CUSTOMER") {
    return null; // only customer accounts leave reviews
  }

  if (existingReview === undefined) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setMessage(null);

    const body = JSON.stringify({ rating, title: title || undefined, comment: comment || undefined });
    const res = existingReview
      ? await authFetch<Review>(`/api/v1/reviews/${existingReview.id}`, { method: "PATCH", body })
      : await authFetch<Review>("/api/v1/reviews", { method: "POST", body: JSON.stringify({ productId, rating, title: title || undefined, comment: comment || undefined }) });

    setIsSubmitting(false);

    if (res.success && res.data) {
      setExistingReview(res.data);
      setMessage({ type: "success", text: "Thanks! Your review is submitted and pending moderation." });
    } else {
      setMessage({ type: "error", text: res.error?.message ?? "Could not submit your review." });
    }
  }

  async function handleDelete() {
    if (!existingReview) return;
    setIsSubmitting(true);
    const res = await authFetch(`/api/v1/reviews/${existingReview.id}`, { method: "DELETE" });
    setIsSubmitting(false);

    if (res.success) {
      setExistingReview(null);
      setRating(5);
      setTitle("");
      setComment("");
      setMessage({ type: "success", text: "Your review was deleted." });
    } else {
      setMessage({ type: "error", text: res.error?.message ?? "Could not delete your review." });
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <h3 className="mb-3 font-medium">{existingReview ? "Edit your review" : "Write a review"}</h3>

      {existingReview && (
        <p className="mb-3 text-xs text-gray-500">
          Status:{" "}
          <span
            className={
              existingReview.status === "APPROVED"
                ? "text-green-600"
                : existingReview.status === "REJECTED"
                ? "text-red-600"
                : "text-yellow-600"
            }
          >
            {existingReview.status}
          </span>
          {existingReview.isVerifiedPurchase && <span className="ml-2 text-green-600">Verified Purchase</span>}
        </p>
      )}

      <div className="mb-3">
        <label className="mb-1 block text-sm font-medium text-gray-700">Rating</label>
        <select
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} ★
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-sm font-medium text-gray-700">Title (optional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-sm font-medium text-gray-700">Comment (optional)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={2000}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {existingReview ? "Update Review" : "Submit Review"}
        </button>
        {existingReview && (
          <button
            onClick={handleDelete}
            disabled={isSubmitting}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </div>

      {message && (
        <p className={`mt-2 text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>{message.text}</p>
      )}
    </div>
  );
}
