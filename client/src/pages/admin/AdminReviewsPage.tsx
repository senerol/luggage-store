import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { listReviews, AdminReview } from "@/api/admin";
import { extractErrorMessage } from "@/api/client";
import { formatDate } from "@/utils/format";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    listReviews().then(setReviews).catch((err) => setError(extractErrorMessage(err)));
  }
  useEffect(load, []);

  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!reviews) return <LoadingSpinner label="Loading reviews…" />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink-900">Reviews ({reviews.length})</h1>
      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-xl border border-ink-100 bg-white p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="font-medium text-ink-800">{r.storageLocation.name}</p>
              <span className="flex items-center gap-1 text-sm text-ink-600">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {r.rating}
              </span>
            </div>
            {r.comment && <p className="mt-1 text-sm text-ink-600">"{r.comment}"</p>}
            <p className="mt-1 text-xs text-ink-400">
              {r.customer.name} · {formatDate(r.createdAt)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
