"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile, requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/server/audit/create-audit-log";
import type { ClinicalNote } from "@/types/database";

type NoteActionState = { message?: string; success?: boolean };

const noteSchema = z.object({
  appointmentId: z.string().uuid(),
  patientId: z.string().uuid(),
  doctorId: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
  subjective: z.string().trim().optional().transform((v) => v || null),
  objective: z.string().trim().optional().transform((v) => v || null),
  assessment: z.string().trim().optional().transform((v) => v || null),
  plan: z.string().trim().optional().transform((v) => v || null),
});

export async function upsertClinicalNoteAction(_: NoteActionState, formData: FormData): Promise<NoteActionState> {
  try {
    const parsed = noteSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { message: parsed.error.errors[0]?.message ?? "Invalid note data." };

    const user = await requireUser();
    const profile = await getCurrentProfile();
    if (!profile?.clinic_id) return { message: "No clinic profile." };
    assertPermission(profile, "notes:manage");

    const supabase = await createSupabaseServerClient();

    // Prevent editing locked notes
    const { data: existing } = await supabase
      .from("clinical_notes")
      .select("id, is_locked")
      .eq("clinic_id", profile.clinic_id)
      .eq("appointment_id", parsed.data.appointmentId)
      .maybeSingle<Pick<ClinicalNote, "id" | "is_locked">>();

    if (existing?.is_locked) return { message: "This note is locked and cannot be edited." };

    const payload = {
      clinic_id: profile.clinic_id,
      appointment_id: parsed.data.appointmentId,
      patient_id: parsed.data.patientId,
      doctor_id: parsed.data.doctorId,
      subjective: parsed.data.subjective,
      objective: parsed.data.objective,
      assessment: parsed.data.assessment,
      plan: parsed.data.plan,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = existing
      ? await supabase
          .from("clinical_notes")
          .update(payload)
          .eq("clinic_id", profile.clinic_id)
          .eq("id", existing.id)
          .select("id")
          .single<{ id: string }>()
      : await supabase
          .from("clinical_notes")
          .insert(payload)
          .select("id")
          .single<{ id: string }>();

    if (error || !data) return { message: error?.message ?? "Could not save note." };

    await createAuditLog({
      clinicId: profile.clinic_id,
      actorId: user.id,
      action: existing ? "note.updated" : "note.created",
      entityType: "clinical_note",
      entityId: data.id,
      metadata: { appointment_id: parsed.data.appointmentId },
    });

    revalidatePath(`/appointments/${parsed.data.appointmentId}`);
    return { success: true, message: "Note saved." };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function lockClinicalNoteAction(_: NoteActionState, formData: FormData): Promise<NoteActionState> {
  try {
    const noteId = z.string().uuid().parse(formData.get("noteId"));
    const user = await requireUser();
    const profile = await getCurrentProfile();
    if (!profile?.clinic_id) return { message: "No clinic profile." };
    assertPermission(profile, "notes:manage");

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("clinical_notes")
      .update({ is_locked: true, locked_at: new Date().toISOString() })
      .eq("clinic_id", profile.clinic_id)
      .eq("id", noteId);

    if (error) return { message: error.message };

    await createAuditLog({
      clinicId: profile.clinic_id,
      actorId: user.id,
      action: "note.locked",
      entityType: "clinical_note",
      entityId: noteId,
      metadata: {},
    });

    revalidatePath("/appointments");
    return { success: true, message: "Note locked." };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Something went wrong." };
  }
}
