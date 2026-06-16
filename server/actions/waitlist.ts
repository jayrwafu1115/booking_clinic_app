"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentProfile, requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/server/audit/create-audit-log";

type WaitlistState = { message?: string; success?: boolean };

const joinWaitlistSchema = z.object({
  service_id: z.string().uuid().optional(),
  doctor_id: z.string().uuid().optional(),
  patient_name: z.string().min(2, "Name is required"),
  patient_phone: z.string().min(7, "Phone number is required"),
  patient_email: z.string().email().optional().or(z.literal("")),
  preferred_date: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export async function joinWaitlistAction(
  _: WaitlistState,
  formData: FormData
): Promise<WaitlistState> {
  try {
    const user = await requireUser();
    const profile = await getCurrentProfile();
    if (!profile?.clinic_id) return { message: "Clinic profile required." };

    const parsed = joinWaitlistSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Invalid input." };
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("appointment_waitlist")
      .insert({
        clinic_id: profile.clinic_id,
        service_id: parsed.data.service_id || null,
        doctor_id: parsed.data.doctor_id || null,
        patient_name: parsed.data.patient_name,
        patient_phone: parsed.data.patient_phone,
        patient_email: parsed.data.patient_email || null,
        preferred_date: parsed.data.preferred_date || null,
        notes: parsed.data.notes || null,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single<{ id: string }>();

    if (error) return { message: error.message };

    await createAuditLog({
      clinicId: profile.clinic_id,
      actorId: user.id,
      action: "waitlist.joined",
      entityType: "appointment_waitlist",
      entityId: data.id,
      metadata: { patient_name: parsed.data.patient_name },
    });

    revalidatePath("/appointments");
    return { success: true, message: "Added to waitlist." };
  } catch {
    return { message: "Something went wrong." };
  }
}

export async function notifyWaitlistEntryAction(
  _: WaitlistState,
  formData: FormData
): Promise<WaitlistState> {
  try {
    const user = await requireUser();
    const profile = await getCurrentProfile();
    if (!profile?.clinic_id) return { message: "Clinic profile required." };

    const entryId = formData.get("id");
    if (!entryId || typeof entryId !== "string") return { message: "Invalid entry." };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("appointment_waitlist")
      .update({ status: "notified", notified_at: new Date().toISOString() })
      .eq("id", entryId)
      .eq("clinic_id", profile.clinic_id);

    if (error) return { message: error.message };

    await createAuditLog({
      clinicId: profile.clinic_id,
      actorId: user.id,
      action: "waitlist.notified",
      entityType: "appointment_waitlist",
      entityId: entryId,
    });

    revalidatePath("/appointments");
    return { success: true, message: "Patient notified." };
  } catch {
    return { message: "Something went wrong." };
  }
}

export async function removeWaitlistEntryAction(
  _: WaitlistState,
  formData: FormData
): Promise<WaitlistState> {
  try {
    const user = await requireUser();
    const profile = await getCurrentProfile();
    if (!profile?.clinic_id) return { message: "Clinic profile required." };

    const entryId = formData.get("id");
    if (!entryId || typeof entryId !== "string") return { message: "Invalid entry." };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("appointment_waitlist")
      .delete()
      .eq("id", entryId)
      .eq("clinic_id", profile.clinic_id);

    if (error) return { message: error.message };

    await createAuditLog({
      clinicId: profile.clinic_id,
      actorId: user.id,
      action: "waitlist.removed",
      entityType: "appointment_waitlist",
      entityId: entryId,
    });

    revalidatePath("/appointments");
    return { success: true };
  } catch {
    return { message: "Something went wrong." };
  }
}
