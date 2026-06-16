"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitFeedbackAction } from "@/server/actions/feedback";

export function FeedbackForm({ feedbackId }: { feedbackId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) { setError("Please select a star rating."); return; }
    setError("");
    startTransition(async () => {
      const result = await submitFeedbackAction(feedbackId, rating, comment);
      if (result.success) setSubmitted(true);
      else setError(result.message ?? "Something went wrong.");
    });
  }

  if (submitted) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 text-center">
        <p className="text-lg font-bold text-emerald-600">Thank you! ⭐</p>
        <p className="mt-1 text-sm text-slate-500">Your feedback has been recorded.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-5">
      {/* Star rating */}
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">Your rating</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="rounded p-1 transition-colors"
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  star <= (hover || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "fill-slate-100 text-slate-300"
                }`}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="mt-1 text-xs text-slate-500">
            {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700" htmlFor="feedback-comment">
          Comment <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <Textarea
          id="feedback-comment"
          placeholder="Tell us more about your experience..."
          value={comment}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
          rows={3}
          maxLength={500}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={isPending || !rating} className="w-full">
        {isPending ? "Submitting..." : "Submit Feedback"}
      </Button>
    </form>
  );
}
