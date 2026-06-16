"use server";

import { getCurrentProfile } from "@/lib/auth/session";
import { profileHasPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ClinicalNote } from "@/types/database";

export async function getNoteByAppointment(appointmentId: string): Promise<{
  note: ClinicalNote | null;
  canManage: boolean;
} | null> {
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) return null;

  const canView = profileHasPermission(profile, "notes:view");
  if (!canView) return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("clinical_notes")
    .select("*")
    .eq("clinic_id", profile.clinic_id)
    .eq("appointment_id", appointmentId)
    .maybeSingle<ClinicalNote>();

  return {
    note: data ?? null,
    canManage: profileHasPermission(profile, "notes:manage"),
  };
}
