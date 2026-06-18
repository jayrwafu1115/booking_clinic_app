"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile, requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { doctorSchema } from "@/lib/validations/core";
import { createAuditLog } from "@/server/audit/create-audit-log";
import { getClinicPlanFeatures } from "@/server/queries/billing";
import type { Permission } from "@/lib/auth/permissions";

type DrawerActionState = { message?: string; success?: boolean };

async function getActionContext(permission: Permission) {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) throw new Error("A clinic profile is required.");
  assertPermission(profile, permission);
  return { user, profile, clinicId: profile.clinic_id };
}

function toState(error: unknown): DrawerActionState {
  return { message: error instanceof Error ? error.message : "Something went wrong." };
}

export async function createDoctorDrawerAction(
  _: DrawerActionState,
  formData: FormData
): Promise<DrawerActionState> {
  try {
    const parsed = doctorSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Please review the doctor form." };
    }

    const { user, clinicId } = await getActionContext("doctors:manage");
    const supabase = await createSupabaseServerClient();

    const [planFeatures, { count: doctorCount }] = await Promise.all([
      getClinicPlanFeatures(),
      supabase
        .from("doctors")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .eq("active", true)
    ]);

    if (doctorCount !== null && doctorCount >= planFeatures.maxDoctors) {
      return {
        message: `Your plan allows a maximum of ${planFeatures.maxDoctors} doctors. Upgrade your plan to add more doctors.`
      };
    }

    if (parsed.data.profileId) {
      const { count, error: profileError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .eq("id", parsed.data.profileId)
        .eq("role", "doctor");

      if (profileError || count !== 1) {
        return { message: profileError?.message ?? "Doctor profile must belong to this clinic." };
      }
    }

    const { data, error } = await supabase
      .from("doctors")
      .insert({
        clinic_id: clinicId,
        profile_id: parsed.data.profileId,
        full_name: parsed.data.fullName,
        specialization: parsed.data.specialization,
        license_no: parsed.data.licenseNo,
        email: parsed.data.email,
        phone: parsed.data.phone,
        avatar_url: parsed.data.avatarUrl,
        active: parsed.data.active
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !data) return { message: error?.message ?? "Could not create doctor." };

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "doctor.created",
      entityType: "doctor",
      entityId: data.id,
      metadata: { full_name: parsed.data.fullName }
    });

    revalidatePath("/doctors");
    return { success: true, message: "Doctor created successfully." };
  } catch (error) {
    return toState(error);
  }
}

export async function updateDoctorDrawerAction(
  _: DrawerActionState,
  formData: FormData
): Promise<DrawerActionState> {
  try {
    const parsed = doctorSchema.required({ id: true }).safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Please review the doctor form." };
    }

    const { user, clinicId } = await getActionContext("doctors:manage");
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("doctors")
      .update({
        profile_id: parsed.data.profileId,
        full_name: parsed.data.fullName,
        specialization: parsed.data.specialization,
        license_no: parsed.data.licenseNo,
        email: parsed.data.email,
        phone: parsed.data.phone,
        avatar_url: parsed.data.avatarUrl,
        active: parsed.data.active
      })
      .eq("clinic_id", clinicId)
      .eq("id", parsed.data.id);

    if (error) return { message: error.message };

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "doctor.updated",
      entityType: "doctor",
      entityId: parsed.data.id,
      metadata: { full_name: parsed.data.fullName }
    });

    revalidatePath("/doctors");
    return { success: true, message: "Changes saved." };
  } catch (error) {
    return toState(error);
  }
}
