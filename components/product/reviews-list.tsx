import { Star } from 'lucide-react';
import { formatDate } from '@/lib/utils/format';

export interface ReviewData {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: Date | string;
  user: { name: string };
}

export function ReviewsList({ reviews }: { reviews: ReviewData[] }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-ink-400">No reviews yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => (
        <div key={review.id} className="border-b border-ink-100 pb-4 last:border-0">
          <div className="flex items-center gap-2">
            <div className="flex" aria-label={`${review.rating} out of 5 stars`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < review.rating ? 'fill-warning text-warning' : 'text-ink-200'}`}
                />
              ))}
            </div>
            {review.verifiedPurchase && (
              <span className="text-xs font-medium text-success">Verified purchase</span>
            )}
          </div>
          {review.title && <p className="mt-1 font-medium text-ink-800">{review.title}</p>}
          <p className="mt-1 text-sm text-ink-600">{review.comment}</p>
          <p className="mt-1 text-xs text-ink-400">
            {review.user.name} · {formatDate(review.createdAt)}
          </p>
        </div>
      ))}
    </div>
  );
}
