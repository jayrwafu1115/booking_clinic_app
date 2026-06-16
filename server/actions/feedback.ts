"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type FeedbackResult = { success: boolean; message?: string };

export async function submitFeedbackAction(
  feedbackId: string,
  rating: number,
  comment: string
): Promise<FeedbackResult> {
  if (!feedbackId || typeof feedbackId !== "string") return { success: false, message: "Invalid request." };
  if (rating < 1 || rating > 5) return { success: false, message: "Rating must be 1–5." };

  const supabase = createSupabaseAdminClient();

  // Verify the record exists and has not been submitted yet
  const { data: existing } = await supabase
    .from("patient_feedback")
    .select("id, submitted_at")
    .eq("id", feedbackId)
    .maybeSingle<{ id: string; submitted_at: string | null }>();

  if (!existing) return { success: false, message: "Feedback link not found." };
  if (existing.submitted_at) return { success: false, message: "Feedback already submitted." };

  const { error } = await supabase
    .from("patient_feedback")
    .update({
      rating,
      comment: comment.trim() || null,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", feedbackId);

  if (error) return { success: false, message: "Could not save feedback." };
  return { success: true };
}
