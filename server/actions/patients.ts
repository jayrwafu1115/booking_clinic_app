"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile, requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { patientSchema } from "@/lib/validations/core";
import { createAuditLog } from "@/server/audit/create-audit-log";
import { getClinicPlanFeatures } from "@/server/queries/billing";
import type { Permission } from "@/lib/auth/permissions";

type DrawerActionState = {
  message?: string;
  success?: boolean;
};

async function getActionContext(permission: Permission) {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  if (!profile?.clinic_id) {
    throw new Error("A clinic profile is required.");
  }

  assertPermission(profile, permission);

  return { user, profile, clinicId: profile.clinic_id };
}

function toState(error: unknown): DrawerActionState {
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: "Something went wrong." };
}

export async function createPatientDrawerAction(
  _: DrawerActionState,
  formData: FormData
): Promise<DrawerActionState> {
  try {
    const parsed = patientSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Please review the patient form." };
    }

    const { user, clinicId } = await getActionContext("patients:manage");
    const supabase = await createSupabaseServerClient();

    const [planFeatures, { count: patientCount }] = await Promise.all([
      getClinicPlanFeatures(),
      supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId)
    ]);

    if (patientCount !== null && patientCount >= planFeatures.maxPatients) {
      return {
        message: `Your plan allows a maximum of ${planFeatures.maxPatients} patients. Upgrade to Pro to add more.`
      };
    }

    const { data, error } = await supabase
      .from("patients")
      .insert({
        clinic_id: clinicId,
        full_name: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        birth_date: parsed.data.birthDate,
        gender: parsed.data.gender,
        status: parsed.data.status,
        address_line_1: parsed.data.addressLine1,
        address_line_2: parsed.data.addressLine2,
        barangay: parsed.data.barangay,
        city: parsed.data.city,
        province: parsed.data.province,
        region: parsed.data.region,
        postal_code: parsed.data.postalCode,
        emergency_contact_name: parsed.data.emergencyContactName,
        emergency_contact_phone: parsed.data.emergencyContactPhone,
        notes: parsed.data.notes
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !data) {
      return { message: error?.message ?? "Could not create patient." };
    }

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "patient.created",
      entityType: "patient",
      entityId: data.id,
      metadata: { full_name: parsed.data.fullName, phone: parsed.data.phone, status: parsed.data.status }
    });

    revalidatePath("/patients");
    return { success: true, message: "Patient created successfully." };
  } catch (error) {
    return toState(error);
  }
}

export async function updatePatientDrawerAction(
  _: DrawerActionState,
  formData: FormData
): Promise<DrawerActionState> {
  try {
    const parsed = patientSchema.required({ id: true }).safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Please review the patient form." };
    }

    const { user, clinicId } = await getActionContext("patients:manage");
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("patients")
      .update({
        full_name: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        birth_date: parsed.data.birthDate,
        gender: parsed.data.gender,
        status: parsed.data.status,
        address_line_1: parsed.data.addressLine1,
        address_line_2: parsed.data.addressLine2,
        barangay: parsed.data.barangay,
        city: parsed.data.city,
        province: parsed.data.province,
        region: parsed.data.region,
        postal_code: parsed.data.postalCode,
        emergency_contact_name: parsed.data.emergencyContactName,
        emergency_contact_phone: parsed.data.emergencyContactPhone,
        notes: parsed.data.notes
      })
      .eq("clinic_id", clinicId)
      .eq("id", parsed.data.id);

    if (error) {
      return { message: error.message };
    }

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "patient.updated",
      entityType: "patient",
      entityId: parsed.data.id,
      metadata: { full_name: parsed.data.fullName, phone: parsed.data.phone, status: parsed.data.status }
    });

    revalidatePath("/patients");
    revalidatePath(`/patients/${parsed.data.id}`);
    return { success: true, message: "Changes saved." };
  } catch (error) {
    return toState(error);
  }
}
