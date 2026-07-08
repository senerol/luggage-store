import { useState } from "react";
import { Star } from "lucide-react";
import toast from "react-hot-toast";
import { submitReview } from "@/api/storage";
import { extractErrorMessage } from "@/api/client";

export function ReviewForm({
  storageLocationId,
  bookingId,
  onSubmitted,
}: {
  storageLocationId: string;
  bookingId: string;
  onSubmitted?: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await submitReview(storageLocationId, { bookingId, rating, comment: comment || undefined });
      toast.success("Thanks for your review!");
      setDone(true);
      onSubmitted?.();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) return <p className="text-sm text-brand-700">Your review has been submitted. Thanks!</p>;

  return (
    <div className="rounded-xl border border-ink-100 p-4">
      <p className="mb-2 text-sm font-medium text-ink-800">How was your storage experience?</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)}>
            <Star className={`h-6 w-6 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-ink-200"}`} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment"
        rows={2}
        className="mt-3 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
      />
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </div>
  );
}
