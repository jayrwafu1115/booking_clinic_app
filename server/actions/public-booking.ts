"use server";

import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { addMinutesIso } from "@/lib/utils/manila-time";
import type { Patient } from "@/types/database";

type BookingResult = { success: boolean; message: string; appointmentId?: string };

const bookingSchema = z.object({
  clinicSlug: z.string().trim().min(1),
  serviceId:  z.string().uuid(),
  doctorId:   z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
  date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time:       z.string().regex(/^\d{2}:\d{2}$/),
  fullName:   z.string().trim().min(2).max(160),
  phone:      z.string().trim().min(5).max(40),
  email:      z.string().trim().email().optional().or(z.literal("")).transform((v) => v || null),
  notes:      z.string().trim().optional().transform((v) => v || null),
});

export async function bookAppointmentPublicAction(formData: FormData): Promise<BookingResult> {
  const parsed = bookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, message: parsed.error.errors[0]?.message ?? "Invalid booking data." };
  }

  const supabase = createSupabaseAdminClient();

  // Get clinic
  const { data: clinic } = await supabase
    .from("clinics")
    .select("id")
    .eq("slug", parsed.data.clinicSlug)
    .eq("status", "active")
    .maybeSingle<{ id: string }>();

  if (!clinic) return { success: false, message: "Clinic not found." };

  // Get service duration
  const { data: service } = await supabase
    .from("services")
    .select("duration_minutes, name")
    .eq("clinic_id", clinic.id)
    .eq("id", parsed.data.serviceId)
    .eq("active", true)
    .maybeSingle<{ duration_minutes: number; name: string }>();

  if (!service) return { success: false, message: "Service not available." };

  // Find or create patient by phone
  const { data: existingPatient } = await supabase
    .from("patients")
    .select("id")
    .eq("clinic_id", clinic.id)
    .eq("phone", parsed.data.phone)
    .maybeSingle<{ id: string }>();

  let patientId = existingPatient?.id ?? null;

  if (!patientId) {
    const { data: newPatient, error: patientError } = await supabase
      .from("patients")
      .insert({
        clinic_id: clinic.id,
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        email: parsed.data.email,
      })
      .select("id")
      .single<{ id: string }>();

    if (patientError || !newPatient) {
      return { success: false, message: "Could not register patient." };
    }
    patientId = newPatient.id;
  }

  const startAt = new Date(`${parsed.data.date}T${parsed.data.time}:00+08:00`).toISOString();
  const endAt   = addMinutesIso(startAt, service.duration_minutes);

  // Check for conflicts
  const { data: conflicts } = await supabase
    .from("appointments")
    .select("id")
    .eq("clinic_id", clinic.id)
    .in("status", ["booked", "confirmed", "checked_in", "in_progress"])
    .lt("start_at", endAt)
    .gt("end_at", startAt)
    .limit(1);

  if ((conflicts ?? []).length > 0) {
    return { success: false, message: "This time slot is no longer available. Please choose another." };
  }

  const { data: appt, error: apptError } = await supabase
    .from("appointments")
    .insert({
      clinic_id:  clinic.id,
      patient_id: patientId,
      doctor_id:  parsed.data.doctorId,
      service_id: parsed.data.serviceId,
      status:     "booked",
      source:     "widget",
      start_at:   startAt,
      end_at:     endAt,
      notes:      parsed.data.notes,
    })
    .select("id")
    .single<{ id: string }>();

  if (apptError || !appt) {
    return { success: false, message: apptError?.message ?? "Could not create appointment." };
  }

  return { success: true, message: `Your appointment for ${service.name} has been booked!`, appointmentId: appt.id };
}
