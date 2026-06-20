"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentProfile, requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { ACTIVE_APPOINTMENT_STATUSES, STATUS_TRANSITIONS } from "@/lib/constants/appointments";
import { sendAppointmentEmailById } from "@/lib/notifications/send-appointment-email";
import { createFeedbackRequest } from "@/lib/notifications/feedback";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addMinutesIso, getManilaParts, parseAppointmentStart } from "@/lib/utils/manila-time";
import { appointmentRescheduleSchema, appointmentSchema, appointmentStatusSchema } from "@/lib/validations/core";
import { createAuditLog } from "@/server/audit/create-audit-log";
import type { Appointment, AppointmentStatus, AvailabilityRule, BlockedDate, Doctor, Patient, Service } from "@/types/database";

type AppointmentActionState = {
  message?: string;
  success?: boolean;
};

type ValidatedSlot = {
  patient: Patient;
  doctor: Doctor | null;
  service: Service;
  startAt: string;
  endAt: string;
};

async function getAppointmentActionContext() {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  if (!profile?.clinic_id) {
    throw new Error("A clinic profile is required.");
  }

  assertPermission(profile, "appointments:manage");

  return { user, profile, clinicId: profile.clinic_id };
}

function toState(error: unknown): AppointmentActionState {
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

function timeLt(left: string, right: string) {
  return left.localeCompare(right) < 0;
}

function timeGt(left: string, right: string) {
  return left.localeCompare(right) > 0;
}

function timesOverlap(start: string, end: string, blockStart: string, blockEnd: string) {
  return timeLt(start, blockEnd) && timeGt(end, blockStart);
}

async function validateAppointmentSlot({
  clinicId,
  patientId,
  doctorId,
  serviceId,
  startAt,
  excludeAppointmentId
}: {
  clinicId: string;
  patientId: string;
  doctorId: string | null;
  serviceId: string;
  startAt: string;
  excludeAppointmentId?: string;
}): Promise<ValidatedSlot> {
  const supabase = await createSupabaseServerClient();
  const [patientResult, serviceResult, doctorResult] = await Promise.all([
    supabase.from("patients").select("*").eq("clinic_id", clinicId).eq("id", patientId).single<Patient>(),
    supabase.from("services").select("*").eq("clinic_id", clinicId).eq("id", serviceId).eq("active", true).single<Service>(),
    doctorId
      ? supabase.from("doctors").select("*").eq("clinic_id", clinicId).eq("id", doctorId).eq("active", true).single<Doctor>()
      : Promise.resolve({ data: null, error: null })
  ]);

  if (patientResult.error || !patientResult.data) {
    throw new Error(patientResult.error?.message ?? "Patient must belong to this clinic.");
  }

  if (serviceResult.error || !serviceResult.data) {
    throw new Error(serviceResult.error?.message ?? "Service must be active and belong to this clinic.");
  }

  if (doctorResult.error) {
    throw new Error(doctorResult.error.message);
  }

  const endAt = addMinutesIso(startAt, serviceResult.data.duration_minutes);
  await validateAvailability({ clinicId, doctorId, startAt, endAt });
  await validateBlockedDates({ clinicId, doctorId, startAt, endAt });
  await validateDoctorConflict({ clinicId, doctorId, startAt, endAt, excludeAppointmentId });

  return {
    patient: patientResult.data,
    doctor: doctorResult.data,
    service: serviceResult.data,
    startAt,
    endAt
  };
}

async function validateAvailability({
  clinicId,
  doctorId,
  startAt,
  endAt
}: {
  clinicId: string;
  doctorId: string | null;
  startAt: string;
  endAt: string;
}) {
  const startParts = getManilaParts(startAt);
  const endParts = getManilaParts(endAt);

  if (startParts.date !== endParts.date) {
    throw new Error("Appointments must fit within one Manila calendar day.");
  }

  const supabase = await createSupabaseServerClient();
  let request = supabase.from("availability_rules").select("*").eq("clinic_id", clinicId).eq("day_of_week", startParts.dayOfWeek);

  if (doctorId) {
    request = request.or(`doctor_id.is.null,doctor_id.eq.${doctorId}`);
  } else {
    request = request.is("doctor_id", null);
  }

  const { data, error } = await request.returns<AvailabilityRule[]>();
  if (error) {
    throw new Error(error.message);
  }

  const rule = (doctorId ? data?.find((item) => item.doctor_id === doctorId) : null) ?? data?.find((item) => item.doctor_id === null);

  if (!rule) {
    return;
  }

  if (!rule.is_open || !rule.open_time || !rule.close_time) {
    throw new Error("The selected time is outside clinic availability.");
  }

  const openTime = rule.open_time.slice(0, 5);
  const closeTime = rule.close_time.slice(0, 5);

  if (timeLt(startParts.time, openTime) || timeGt(endParts.time, closeTime)) {
    throw new Error("The appointment must fit within configured open hours.");
  }

  if (rule.break_start && rule.break_end) {
    const breakStart = rule.break_start.slice(0, 5);
    const breakEnd = rule.break_end.slice(0, 5);
    if (timesOverlap(startParts.time, endParts.time, breakStart, breakEnd)) {
      throw new Error("The appointment overlaps a configured break.");
    }
  }
}

async function validateBlockedDates({
  clinicId,
  doctorId,
  startAt,
  endAt
}: {
  clinicId: string;
  doctorId: string | null;
  startAt: string;
  endAt: string;
}) {
  const supabase = await createSupabaseServerClient();
  let request = supabase.from("blocked_dates").select("*").eq("clinic_id", clinicId).lt("start_at", endAt).gt("end_at", startAt);

  if (doctorId) {
    request = request.or(`doctor_id.is.null,doctor_id.eq.${doctorId}`);
  } else {
    request = request.is("doctor_id", null);
  }

  const { data, error } = await request.limit(1).returns<BlockedDate[]>();
  if (error) {
    throw new Error(error.message);
  }

  if ((data ?? []).length > 0) {
    throw new Error("The selected time overlaps a blocked date.");
  }
}

async function validateDoctorConflict({
  clinicId,
  doctorId,
  startAt,
  endAt,
  excludeAppointmentId
}: {
  clinicId: string;
  doctorId: string | null;
  startAt: string;
  endAt: string;
  excludeAppointmentId?: string;
}) {
  if (!doctorId) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  let request = supabase
    .from("appointments")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("doctor_id", doctorId)
    .in("status", ACTIVE_APPOINTMENT_STATUSES)
    .lt("start_at", endAt)
    .gt("end_at", startAt);

  if (excludeAppointmentId) {
    request = request.neq("id", excludeAppointmentId);
  }

  const { data, error } = await request.limit(1).returns<{ id: string }[]>();
  if (error) {
    throw new Error(error.message);
  }

  if ((data ?? []).length > 0) {
    throw new Error("This doctor already has an overlapping active appointment.");
  }
}

export async function createAppointmentAction(_: AppointmentActionState, formData: FormData): Promise<AppointmentActionState> {
  try {
    const parsed = appointmentSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Please review the appointment form." };
    }

    const { user, clinicId } = await getAppointmentActionContext();
    const startAt = parseAppointmentStart(parsed.data.startAt);
    const slot = await validateAppointmentSlot({
      clinicId,
      patientId: parsed.data.patientId,
      doctorId: parsed.data.doctorId,
      serviceId: parsed.data.serviceId,
      startAt
    });

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        clinic_id: clinicId,
        patient_id: slot.patient.id,
        doctor_id: slot.doctor?.id ?? null,
        service_id: slot.service.id,
        status: "booked",
        source: parsed.data.source,
        start_at: slot.startAt,
        end_at: slot.endAt,
        notes: parsed.data.notes,
        created_by: user.id
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !data) {
      return { message: error?.message ?? "Could not create appointment." };
    }

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "appointment.created",
      entityType: "appointment",
      entityId: data.id,
      metadata: { patient: slot.patient.full_name, service: slot.service.name, start_at: slot.startAt }
    });

    await sendAppointmentEmailById(data.id, "booking_confirmation");

    revalidatePath("/appointments");
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    redirect(`/appointments/${data.id}`);
  } catch (error) {
    return toState(error);
  }
}

export async function updateAppointmentAction(_: AppointmentActionState, formData: FormData): Promise<AppointmentActionState> {
  try {
    const parsed = appointmentSchema.required({ id: true }).safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Please review the appointment form." };
    }

    const { user, clinicId } = await getAppointmentActionContext();
    const startAt = parseAppointmentStart(parsed.data.startAt);
    const slot = await validateAppointmentSlot({
      clinicId,
      patientId: parsed.data.patientId,
      doctorId: parsed.data.doctorId,
      serviceId: parsed.data.serviceId,
      startAt,
      excludeAppointmentId: parsed.data.id
    });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("appointments")
      .update({
        patient_id: slot.patient.id,
        doctor_id: slot.doctor?.id ?? null,
        service_id: slot.service.id,
        source: parsed.data.source,
        start_at: slot.startAt,
        end_at: slot.endAt,
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
      action: "appointment.updated",
      entityType: "appointment",
      entityId: parsed.data.id,
      metadata: { patient: slot.patient.full_name, service: slot.service.name, start_at: slot.startAt }
    });

    revalidatePath("/appointments");
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    redirect(`/appointments/${parsed.data.id}`);
  } catch (error) {
    return toState(error);
  }
}

export async function rescheduleAppointmentAction(_: AppointmentActionState, formData: FormData): Promise<AppointmentActionState> {
  try {
    const parsed = appointmentRescheduleSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: "Choose a valid appointment time." };
    }

    const { user, clinicId } = await getAppointmentActionContext();
    const supabase = await createSupabaseServerClient();
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("id", parsed.data.id)
      .single<Appointment>();

    if (appointmentError || !appointment) {
      return { message: appointmentError?.message ?? "Appointment not found." };
    }

    const startAt = parseAppointmentStart(parsed.data.startAt);
    const slot = await validateAppointmentSlot({
      clinicId,
      patientId: appointment.patient_id,
      doctorId: appointment.doctor_id,
      serviceId: appointment.service_id,
      startAt,
      excludeAppointmentId: appointment.id
    });

    const { error } = await supabase
      .from("appointments")
      .update({
        start_at: slot.startAt,
        end_at: slot.endAt
      })
      .eq("clinic_id", clinicId)
      .eq("id", appointment.id);

    if (error) {
      return { message: error.message };
    }

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "appointment.rescheduled",
      entityType: "appointment",
      entityId: appointment.id,
      metadata: { start_at: slot.startAt, end_at: slot.endAt }
    });

    await sendAppointmentEmailById(appointment.id, "appointment_rescheduled");

    revalidatePath("/appointments");
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    return { success: true, message: "Appointment rescheduled." };
  } catch (error) {
    return toState(error);
  }
}

export async function updateAppointmentStatusAction(_: AppointmentActionState, formData: FormData): Promise<AppointmentActionState> {
  try {
    const parsed = appointmentStatusSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Choose a valid appointment status." };
    }

    const { user, clinicId } = await getAppointmentActionContext();
    const supabase = await createSupabaseServerClient();
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("id", parsed.data.id)
      .single<Appointment>();

    if (appointmentError || !appointment) {
      return { message: appointmentError?.message ?? "Appointment not found." };
    }

    const nextStatus = parsed.data.status as AppointmentStatus;
    if (!STATUS_TRANSITIONS[appointment.status].includes(nextStatus)) {
      return { message: `Cannot move ${appointment.status} to ${nextStatus}.` };
    }

    if (nextStatus === "cancelled" && !parsed.data.cancellationReason) {
      return { message: "Cancellation reason is required." };
    }

    const { error } = await supabase
      .from("appointments")
      .update({
        status: nextStatus,
        cancellation_reason: nextStatus === "cancelled" ? parsed.data.cancellationReason : appointment.cancellation_reason
      })
      .eq("clinic_id", clinicId)
      .eq("id", appointment.id);

    if (error) {
      return { message: error.message };
    }

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "appointment.status_changed",
      entityType: "appointment",
      entityId: appointment.id,
      metadata: { previous_status: appointment.status, next_status: nextStatus }
    });

    if (nextStatus === "confirmed") {
      await sendAppointmentEmailById(appointment.id, "appointment_confirmed");
    } else if (nextStatus === "cancelled") {
      await sendAppointmentEmailById(appointment.id, "appointment_cancelled", {
        cancellationReason: parsed.data.cancellationReason ?? null
      });
    } else if (nextStatus === "completed") {
      void createFeedbackRequest(appointment.id, clinicId).catch(() => {});
    }

    revalidatePath("/appointments");
    revalidatePath(`/appointments/${appointment.id}`);
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    return { success: true, message: "Appointment status updated." };
  } catch (error) {
    return toState(error);
  }
}

export async function createRecurringAppointmentsAction(
  _: AppointmentActionState,
  formData: FormData
): Promise<AppointmentActionState> {
  try {
    const schema = z.object({
      patientId: z.string().uuid(),
      doctorId: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
      serviceId: z.string().uuid(),
      startAt: z.string().min(1),
      frequency: z.enum(["daily", "weekly", "biweekly", "monthly"]),
      sessionCount: z.coerce.number().int().min(2).max(52),
      notes: z.string().trim().optional().transform((v) => v || null),
    });

    const parsed = schema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { message: parsed.error.errors[0]?.message ?? "Invalid recurrence data." };

    const { user, clinicId } = await getAppointmentActionContext();
    const firstStartAt = parseAppointmentStart(parsed.data.startAt);

    const slot = await validateAppointmentSlot({
      clinicId,
      patientId: parsed.data.patientId,
      doctorId: parsed.data.doctorId,
      serviceId: parsed.data.serviceId,
      startAt: firstStartAt,
    });

    const supabase = await createSupabaseServerClient();

    // Create the recurrence group record
    const { data: recurrence, error: recErr } = await supabase
      .from("appointment_recurrences")
      .insert({
        clinic_id: clinicId,
        patient_id: slot.patient.id,
        doctor_id: slot.doctor?.id ?? null,
        service_id: slot.service.id,
        frequency: parsed.data.frequency,
        session_count: parsed.data.sessionCount,
        start_at: slot.startAt,
        created_by: user.id,
      })
      .select("id")
      .single<{ id: string }>();

    if (recErr || !recurrence) return { message: recErr?.message ?? "Could not create recurrence." };

    // Generate all appointment datetimes
    const startDate = new Date(slot.startAt);
    const appts: { start: string; end: string }[] = [];

    for (let i = 0; i < parsed.data.sessionCount; i++) {
      const d = new Date(startDate);
      if (parsed.data.frequency === "daily")    d.setDate(d.getDate() + i);
      if (parsed.data.frequency === "weekly")   d.setDate(d.getDate() + i * 7);
      if (parsed.data.frequency === "biweekly") d.setDate(d.getDate() + i * 14);
      if (parsed.data.frequency === "monthly")  d.setMonth(d.getMonth() + i);
      const s = d.toISOString();
      appts.push({ start: s, end: addMinutesIso(s, slot.service.duration_minutes) });
    }

    const { error: insertErr } = await supabase.from("appointments").insert(
      appts.map((a) => ({
        clinic_id: clinicId,
        patient_id: slot.patient.id,
        doctor_id: slot.doctor?.id ?? null,
        service_id: slot.service.id,
        recurrence_id: recurrence.id,
        status: "booked" as const,
        source: "manual" as const,
        start_at: a.start,
        end_at: a.end,
        notes: parsed.data.notes,
        created_by: user.id,
      }))
    );

    if (insertErr) return { message: insertErr.message };

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "appointment.recurring_created",
      entityType: "appointment_recurrence",
      entityId: recurrence.id,
      metadata: {
        patient: slot.patient.full_name,
        service: slot.service.name,
        frequency: parsed.data.frequency,
        session_count: parsed.data.sessionCount,
      },
    });

    revalidatePath("/appointments");
    revalidatePath("/calendar");
    return { success: true, message: `${parsed.data.sessionCount} recurring appointments created.` };
  } catch (error) {
    return toState(error);
  }
}

export async function createAppointmentDrawerAction(
  _: AppointmentActionState,
  formData: FormData
): Promise<AppointmentActionState> {
  try {
    const parsed = appointmentSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Please review the appointment form." };
    }

    const { user, clinicId } = await getAppointmentActionContext();
    const startAt = parseAppointmentStart(parsed.data.startAt);
    const slot = await validateAppointmentSlot({
      clinicId,
      patientId: parsed.data.patientId,
      doctorId: parsed.data.doctorId,
      serviceId: parsed.data.serviceId,
      startAt
    });

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        clinic_id: clinicId,
        patient_id: slot.patient.id,
        doctor_id: slot.doctor?.id ?? null,
        service_id: slot.service.id,
        status: "booked",
        source: parsed.data.source,
        start_at: slot.startAt,
        end_at: slot.endAt,
        notes: parsed.data.notes,
        created_by: user.id
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !data) {
      return { message: error?.message ?? "Could not create appointment." };
    }

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "appointment.created",
      entityType: "appointment",
      entityId: data.id,
      metadata: { patient: slot.patient.full_name, service: slot.service.name, start_at: slot.startAt }
    });

    await sendAppointmentEmailById(data.id, "booking_confirmation");

    revalidatePath("/appointments");
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    return { success: true, message: "Appointment created." };
  } catch (error) {
    return toState(error);
  }
}

export async function updateAppointmentDrawerAction(
  _: AppointmentActionState,
  formData: FormData
): Promise<AppointmentActionState> {
  try {
    const parsed = appointmentSchema.required({ id: true }).safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Please review the appointment form." };
    }

    const { user, clinicId } = await getAppointmentActionContext();
    const startAt = parseAppointmentStart(parsed.data.startAt);
    const slot = await validateAppointmentSlot({
      clinicId,
      patientId: parsed.data.patientId,
      doctorId: parsed.data.doctorId,
      serviceId: parsed.data.serviceId,
      startAt,
      excludeAppointmentId: parsed.data.id
    });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("appointments")
      .update({
        patient_id: slot.patient.id,
        doctor_id: slot.doctor?.id ?? null,
        service_id: slot.service.id,
        source: parsed.data.source,
        start_at: slot.startAt,
        end_at: slot.endAt,
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
      action: "appointment.updated",
      entityType: "appointment",
      entityId: parsed.data.id,
      metadata: { patient: slot.patient.full_name, service: slot.service.name, start_at: slot.startAt }
    });

    revalidatePath("/appointments");
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    return { success: true, message: "Appointment updated." };
  } catch (error) {
    return toState(error);
  }
}
