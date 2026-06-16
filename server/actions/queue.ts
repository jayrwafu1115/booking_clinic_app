"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile, requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/server/audit/create-audit-log";

type QueueActionState = { message?: string; success?: boolean };

async function getQueueContext() {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) throw new Error("No clinic profile.");
  assertPermission(profile, "queue:manage");
  return { user, profile, clinicId: profile.clinic_id };
}

export async function addToQueueAction(_: QueueActionState, formData: FormData): Promise<QueueActionState> {
  try {
    const schema = z.object({
      patientName: z.string().trim().min(1).max(160),
      patientId: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
      doctorId: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
      serviceId: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
      notes: z.string().trim().optional().transform((v) => v || null),
    });

    const parsed = schema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { message: parsed.error.errors[0]?.message ?? "Invalid queue entry." };

    const { user, clinicId } = await getQueueContext();
    const supabase = await createSupabaseServerClient();

    // Get today's next queue number
    const today = new Date().toISOString().slice(0, 10);
    const { count } = await supabase
      .from("queue_entries")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("queue_date", today);

    const queueNumber = (count ?? 0) + 1;

    const { error } = await supabase.from("queue_entries").insert({
      clinic_id: clinicId,
      patient_name: parsed.data.patientName,
      patient_id: parsed.data.patientId,
      doctor_id: parsed.data.doctorId,
      service_id: parsed.data.serviceId,
      queue_number: queueNumber,
      status: "waiting",
      notes: parsed.data.notes,
      queue_date: today,
    });

    if (error) return { message: error.message };

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "queue.entry_added",
      entityType: "queue_entry",
      entityId: null,
      metadata: { queue_number: queueNumber, patient_name: parsed.data.patientName },
    });

    revalidatePath("/queue");
    return { success: true, message: `Queue #${queueNumber} added.` };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function updateQueueStatusAction(_: QueueActionState, formData: FormData): Promise<QueueActionState> {
  try {
    const schema = z.object({
      id: z.string().uuid(),
      status: z.enum(["waiting", "called", "serving", "done", "skipped"]),
    });

    const parsed = schema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { message: "Invalid status." };

    const { user, clinicId } = await getQueueContext();
    const supabase = await createSupabaseServerClient();

    const now = new Date().toISOString();
    const timestamps: Record<string, string | null> = {};
    if (parsed.data.status === "called")  timestamps.called_at = now;
    if (parsed.data.status === "serving") timestamps.served_at = now;
    if (parsed.data.status === "done" || parsed.data.status === "skipped") timestamps.done_at = now;

    const { error } = await supabase
      .from("queue_entries")
      .update({ status: parsed.data.status, ...timestamps, updated_at: now })
      .eq("clinic_id", clinicId)
      .eq("id", parsed.data.id);

    if (error) return { message: error.message };

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "queue.status_updated",
      entityType: "queue_entry",
      entityId: parsed.data.id,
      metadata: { status: parsed.data.status },
    });

    revalidatePath("/queue");
    return { success: true };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Something went wrong." };
  }
}
