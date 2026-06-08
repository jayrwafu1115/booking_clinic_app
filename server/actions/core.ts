"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  availabilityRuleFormSchema,
  blockedDateDeleteSchema,
  blockedDateSchema,
  doctorDeactivateSchema,
  doctorSchema,
  patientDeleteSchema,
  patientSchema,
  serviceDeactivateSchema,
  serviceSchema
} from "@/lib/validations/core";
import { createAuditLog } from "@/server/audit/create-audit-log";
import type { Permission } from "@/lib/auth/permissions";

type CoreActionState = {
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

function toState(error: unknown): CoreActionState {
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  ) {
    throw error;
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: "Something went wrong." };
}

function manilaLocalToUtcIso(value: string) {
  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - 8, minute)).toISOString();
}

function availabilityPayloadFromForm(formData: FormData) {
  return {
    doctorId: String(formData.get("doctorId") ?? ""),
    rules: Array.from({ length: 7 }, (_, index) => ({
      dayOfWeek: formData.get(`rules.${index}.dayOfWeek`),
      isOpen: formData.get(`rules.${index}.isOpen`) ?? undefined,
      openTime: String(formData.get(`rules.${index}.openTime`) ?? ""),
      closeTime: String(formData.get(`rules.${index}.closeTime`) ?? ""),
      breakStart: String(formData.get(`rules.${index}.breakStart`) ?? ""),
      breakEnd: String(formData.get(`rules.${index}.breakEnd`) ?? ""),
      slotIntervalMinutes: formData.get(`rules.${index}.slotIntervalMinutes`) ?? 30
    }))
  };
}

export async function createPatientAction(_: CoreActionState, formData: FormData): Promise<CoreActionState> {
  try {
    const parsed = patientSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Please review the patient form." };
    }

    const { user, clinicId } = await getActionContext("patients:manage");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("patients")
      .insert({
        clinic_id: clinicId,
        full_name: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        birth_date: parsed.data.birthDate,
        gender: parsed.data.gender,
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
      metadata: { full_name: parsed.data.fullName, phone: parsed.data.phone }
    });

    revalidatePath("/patients");
    redirect(`/patients/${data.id}`);
  } catch (error) {
    return toState(error);
  }
}

export async function updatePatientAction(_: CoreActionState, formData: FormData): Promise<CoreActionState> {
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
      metadata: { full_name: parsed.data.fullName, phone: parsed.data.phone }
    });

    revalidatePath("/patients");
    revalidatePath(`/patients/${parsed.data.id}`);
    redirect(`/patients/${parsed.data.id}`);
  } catch (error) {
    return toState(error);
  }
}

export async function deletePatientAction(_: CoreActionState, formData: FormData): Promise<CoreActionState> {
  try {
    const parsed = patientDeleteSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: "Choose a valid patient." };
    }

    const { user, clinicId } = await getActionContext("patients:manage");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("patients").delete().eq("clinic_id", clinicId).eq("id", parsed.data.id);

    if (error) {
      return { message: error.message };
    }

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "patient.deleted",
      entityType: "patient",
      entityId: parsed.data.id
    });

    revalidatePath("/patients");
    redirect("/patients");
  } catch (error) {
    return toState(error);
  }
}

export async function createDoctorAction(_: CoreActionState, formData: FormData): Promise<CoreActionState> {
  try {
    const parsed = doctorSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Please review the doctor form." };
    }

    const { user, clinicId } = await getActionContext("doctors:manage");
    const supabase = await createSupabaseServerClient();

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

    if (error || !data) {
      return { message: error?.message ?? "Could not create doctor." };
    }

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "doctor.created",
      entityType: "doctor",
      entityId: data.id,
      metadata: { full_name: parsed.data.fullName }
    });

    revalidatePath("/doctors");
    redirect("/doctors");
  } catch (error) {
    return toState(error);
  }
}

export async function updateDoctorAction(_: CoreActionState, formData: FormData): Promise<CoreActionState> {
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

    if (error) {
      return { message: error.message };
    }

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "doctor.updated",
      entityType: "doctor",
      entityId: parsed.data.id,
      metadata: { full_name: parsed.data.fullName }
    });

    revalidatePath("/doctors");
    redirect("/doctors");
  } catch (error) {
    return toState(error);
  }
}

export async function deactivateDoctorAction(_: CoreActionState, formData: FormData): Promise<CoreActionState> {
  try {
    const parsed = doctorDeactivateSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: "Choose a valid doctor." };
    }

    const { user, clinicId } = await getActionContext("doctors:manage");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("doctors").update({ active: false }).eq("clinic_id", clinicId).eq("id", parsed.data.id);

    if (error) {
      return { message: error.message };
    }

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "doctor.deactivated",
      entityType: "doctor",
      entityId: parsed.data.id
    });

    revalidatePath("/doctors");
    return { success: true, message: "Doctor deactivated." };
  } catch (error) {
    return toState(error);
  }
}

export async function createServiceAction(_: CoreActionState, formData: FormData): Promise<CoreActionState> {
  try {
    const parsed = serviceSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Please review the service form." };
    }

    const { user, clinicId } = await getActionContext("services:manage");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("services")
      .insert({
        clinic_id: clinicId,
        name: parsed.data.name,
        description: parsed.data.description,
        category: parsed.data.category,
        duration_minutes: parsed.data.durationMinutes,
        price_centavos: parsed.data.pricePesos,
        color: parsed.data.color,
        icon: parsed.data.icon,
        online_booking_enabled: parsed.data.onlineBookingEnabled,
        active: parsed.data.active
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !data) {
      return { message: error?.message ?? "Could not create service." };
    }

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "service.created",
      entityType: "service",
      entityId: data.id,
      metadata: { name: parsed.data.name, price_centavos: parsed.data.pricePesos }
    });

    revalidatePath("/services");
    redirect("/services");
  } catch (error) {
    return toState(error);
  }
}

export async function updateServiceAction(_: CoreActionState, formData: FormData): Promise<CoreActionState> {
  try {
    const parsed = serviceSchema.required({ id: true }).safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Please review the service form." };
    }

    const { user, clinicId } = await getActionContext("services:manage");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("services")
      .update({
        name: parsed.data.name,
        description: parsed.data.description,
        category: parsed.data.category,
        duration_minutes: parsed.data.durationMinutes,
        price_centavos: parsed.data.pricePesos,
        color: parsed.data.color,
        icon: parsed.data.icon,
        online_booking_enabled: parsed.data.onlineBookingEnabled,
        active: parsed.data.active
      })
      .eq("clinic_id", clinicId)
      .eq("id", parsed.data.id);

    if (error) {
      return { message: error.message };
    }

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "service.updated",
      entityType: "service",
      entityId: parsed.data.id,
      metadata: { name: parsed.data.name, price_centavos: parsed.data.pricePesos }
    });

    revalidatePath("/services");
    redirect("/services");
  } catch (error) {
    return toState(error);
  }
}

export async function deactivateServiceAction(_: CoreActionState, formData: FormData): Promise<CoreActionState> {
  try {
    const parsed = serviceDeactivateSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: "Choose a valid service." };
    }

    const { user, clinicId } = await getActionContext("services:manage");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("services").update({ active: false }).eq("clinic_id", clinicId).eq("id", parsed.data.id);

    if (error) {
      return { message: error.message };
    }

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "service.deactivated",
      entityType: "service",
      entityId: parsed.data.id
    });

    revalidatePath("/services");
    return { success: true, message: "Service deactivated." };
  } catch (error) {
    return toState(error);
  }
}

export async function saveAvailabilityRulesAction(_: CoreActionState, formData: FormData): Promise<CoreActionState> {
  try {
    const parsed = availabilityRuleFormSchema.safeParse(availabilityPayloadFromForm(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Please review availability rules." };
    }

    const { user, clinicId } = await getActionContext("availability:manage");
    const supabase = await createSupabaseServerClient();
    const deleteRequest = supabase.from("availability_rules").delete().eq("clinic_id", clinicId);

    if (parsed.data.doctorId) {
      deleteRequest.eq("doctor_id", parsed.data.doctorId);
    } else {
      deleteRequest.is("doctor_id", null);
    }

    const { error: deleteError } = await deleteRequest;
    if (deleteError) {
      return { message: deleteError.message };
    }

    const rows = parsed.data.rules.map((rule) => ({
      clinic_id: clinicId,
      doctor_id: parsed.data.doctorId,
      day_of_week: rule.dayOfWeek,
      is_open: rule.isOpen,
      open_time: rule.isOpen ? rule.openTime : null,
      close_time: rule.isOpen ? rule.closeTime : null,
      break_start: rule.isOpen ? rule.breakStart : null,
      break_end: rule.isOpen ? rule.breakEnd : null,
      slot_interval_minutes: rule.slotIntervalMinutes
    }));

    const { error: insertError } = await supabase.from("availability_rules").insert(rows);
    if (insertError) {
      return { message: insertError.message };
    }

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "availability.updated",
      entityType: "availability_rules",
      metadata: { doctor_id: parsed.data.doctorId, rules: rows.length }
    });

    revalidatePath("/availability");
    return { success: true, message: "Availability saved." };
  } catch (error) {
    return toState(error);
  }
}

export async function createBlockedDateAction(_: CoreActionState, formData: FormData): Promise<CoreActionState> {
  try {
    const parsed = blockedDateSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Please review the blocked date form." };
    }

    const { user, clinicId } = await getActionContext("availability:manage");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("blocked_dates")
      .insert({
        clinic_id: clinicId,
        doctor_id: parsed.data.doctorId,
        title: parsed.data.title,
        reason: parsed.data.reason,
        start_at: manilaLocalToUtcIso(parsed.data.startAt),
        end_at: manilaLocalToUtcIso(parsed.data.endAt),
        all_day: parsed.data.allDay
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !data) {
      return { message: error?.message ?? "Could not create blocked date." };
    }

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "blocked_date.created",
      entityType: "blocked_date",
      entityId: data.id,
      metadata: { title: parsed.data.title, doctor_id: parsed.data.doctorId }
    });

    revalidatePath("/availability");
    revalidatePath("/availability/blocked-dates");
    return { success: true, message: "Blocked date created." };
  } catch (error) {
    return toState(error);
  }
}

export async function deleteBlockedDateAction(_: CoreActionState, formData: FormData): Promise<CoreActionState> {
  try {
    const parsed = blockedDateDeleteSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: "Choose a valid blocked date." };
    }

    const { user, clinicId } = await getActionContext("availability:manage");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("blocked_dates").delete().eq("clinic_id", clinicId).eq("id", parsed.data.id);

    if (error) {
      return { message: error.message };
    }

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "blocked_date.deleted",
      entityType: "blocked_date",
      entityId: parsed.data.id
    });

    revalidatePath("/availability");
    revalidatePath("/availability/blocked-dates");
    return { success: true, message: "Blocked date removed." };
  } catch (error) {
    return toState(error);
  }
}
