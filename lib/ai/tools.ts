import { ACTIVE_APPOINTMENT_STATUSES } from "@/lib/constants/appointments";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addMinutesIso, getManilaParts, manilaLocalToUtcIso } from "@/lib/utils/manila-time";
import type { Appointment, AvailabilityRule, BlockedDate, Doctor, FaqItem, Patient, Service } from "@/types/database";

export type PatientInfo = {
  fullName: string;
  phone: string;
  email?: string | null;
};

export type AiAppointmentPayload = {
  patientId: string;
  serviceId: string;
  doctorId?: string | null;
  startAt: string;
  conversationId?: string;
  notes?: string | null;
};

export type AvailableSlot = {
  doctorId: string | null;
  doctorName: string | null;
  startAt: string;
  endAt: string;
};

function wordSet(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2)
  );
}

function scoreMatch(question: string, candidate: string) {
  const questionWords = wordSet(question);
  const candidateWords = wordSet(candidate);
  if (questionWords.size === 0 || candidateWords.size === 0) {
    return 0;
  }

  let matches = 0;
  questionWords.forEach((word) => {
    if (candidateWords.has(word)) {
      matches += 1;
    }
  });

  return matches / questionWords.size;
}

function timeLt(left: string, right: string) {
  return left.localeCompare(right) < 0;
}

function timeGte(left: string, right: string) {
  return left.localeCompare(right) >= 0;
}

function overlaps(start: string, end: string, otherStart: string, otherEnd: string) {
  return new Date(start) < new Date(otherEnd) && new Date(end) > new Date(otherStart);
}

export async function searchServices(clinicId: string, query: string) {
  const cleaned = query.trim().replace(/[,%]/g, "");
  const supabase = await createSupabaseServerClient();
  let request = supabase.from("services").select("*").eq("clinic_id", clinicId).eq("active", true).order("name").limit(10);

  if (cleaned) {
    request = request.or(`name.ilike.%${cleaned}%,description.ilike.%${cleaned}%,category.ilike.%${cleaned}%`);
  }

  const { data, error } = await request.returns<Service[]>();
  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function answerFromFAQ(clinicId: string, question: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("faq_items")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<FaqItem[]>();

  if (error) {
    throw new Error(error.message);
  }

  const best = (data ?? [])
    .map((faq) => ({
      faq,
      score: Math.max(scoreMatch(question, faq.question), scoreMatch(question, `${faq.question} ${faq.answer}`))
    }))
    .sort((left, right) => right.score - left.score)[0];

  if (!best || best.score < 0.55) {
    return null;
  }

  return { question: best.faq.question, answer: best.faq.answer, score: best.score };
}

export async function createPatientIfNeeded(clinicId: string, patientInfo: PatientInfo) {
  const supabase = await createSupabaseServerClient();
  const phone = patientInfo.phone.trim();
  const { data: existing, error: existingError } = await supabase
    .from("patients")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("phone", phone)
    .maybeSingle<Patient>();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from("patients")
    .insert({
      clinic_id: clinicId,
      full_name: patientInfo.fullName.trim(),
      phone,
      email: patientInfo.email?.trim() || null
    })
    .select("*")
    .single<Patient>();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create patient.");
  }

  return data;
}

export async function getAvailableSlots(
  clinicId: string,
  serviceId: string,
  doctorId: string | null | undefined,
  dateRange: { startDate: string; endDate: string }
) {
  const supabase = await createSupabaseServerClient();
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("id", serviceId)
    .eq("active", true)
    .single<Service>();

  if (serviceError || !service) {
    throw new Error(serviceError?.message ?? "Service not found.");
  }

  const doctorsRequest = doctorId
    ? supabase.from("doctors").select("*").eq("clinic_id", clinicId).eq("id", doctorId).eq("active", true)
    : supabase.from("doctors").select("*").eq("clinic_id", clinicId).eq("active", true).order("full_name");
  const [doctorsResult, rulesResult, blockedResult, appointmentsResult] = await Promise.all([
    doctorsRequest.returns<Doctor[]>(),
    supabase.from("availability_rules").select("*").eq("clinic_id", clinicId).returns<AvailabilityRule[]>(),
    supabase
      .from("blocked_dates")
      .select("*")
      .eq("clinic_id", clinicId)
      .gte("end_at", manilaLocalToUtcIso(`${dateRange.startDate}T00:00`))
      .lte("start_at", manilaLocalToUtcIso(`${dateRange.endDate}T23:59`))
      .returns<BlockedDate[]>(),
    supabase
      .from("appointments")
      .select("*")
      .eq("clinic_id", clinicId)
      .in("status", ACTIVE_APPOINTMENT_STATUSES)
      .gte("end_at", manilaLocalToUtcIso(`${dateRange.startDate}T00:00`))
      .lte("start_at", manilaLocalToUtcIso(`${dateRange.endDate}T23:59`))
      .returns<Appointment[]>()
  ]);

  if (doctorsResult.error) throw new Error(doctorsResult.error.message);
  if (rulesResult.error) throw new Error(rulesResult.error.message);
  if (blockedResult.error) throw new Error(blockedResult.error.message);
  if (appointmentsResult.error) throw new Error(appointmentsResult.error.message);

  const doctors = doctorsResult.data ?? [];
  const resources = doctors.length > 0 ? doctors.map((doctor) => ({ id: doctor.id, name: doctor.full_name })) : [{ id: null, name: null }];
  const slots: AvailableSlot[] = [];
  const startDate = new Date(`${dateRange.startDate}T00:00:00+08:00`);
  const endDate = new Date(`${dateRange.endDate}T00:00:00+08:00`);

  for (let cursor = new Date(startDate); cursor <= endDate; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const localDate = cursor.toISOString().slice(0, 10);

    for (const resource of resources) {
      const day = getManilaParts(manilaLocalToUtcIso(`${localDate}T00:00`)).dayOfWeek;
      const rule =
        (resource.id ? rulesResult.data?.find((item) => item.doctor_id === resource.id && item.day_of_week === day) : null) ??
        rulesResult.data?.find((item) => item.doctor_id === null && item.day_of_week === day);

      if (!rule?.is_open || !rule.open_time || !rule.close_time) {
        continue;
      }

      const interval = rule.slot_interval_minutes || 30;
      let slotStartTime = rule.open_time.slice(0, 5);
      const closeTime = rule.close_time.slice(0, 5);

      while (timeLt(slotStartTime, closeTime)) {
        const startAt = manilaLocalToUtcIso(`${localDate}T${slotStartTime}`);
        const endAt = addMinutesIso(startAt, service.duration_minutes);
        const endParts = getManilaParts(endAt);

        if (endParts.date !== localDate || timeLt(closeTime, endParts.time)) {
          break;
        }

        const overlapsBreak =
          rule.break_start &&
          rule.break_end &&
          slotStartTime < rule.break_end.slice(0, 5) &&
          endParts.time > rule.break_start.slice(0, 5);
        const overlapsBlocked = (blockedResult.data ?? []).some((blocked) => {
          const appliesToResource = blocked.doctor_id === null || blocked.doctor_id === resource.id;
          return appliesToResource && overlaps(startAt, endAt, blocked.start_at, blocked.end_at);
        });
        const overlapsAppointment = (appointmentsResult.data ?? []).some((appointment) => {
          const appliesToResource = resource.id ? appointment.doctor_id === resource.id : appointment.doctor_id === null;
          return appliesToResource && overlaps(startAt, endAt, appointment.start_at, appointment.end_at);
        });

        if (!overlapsBreak && !overlapsBlocked && !overlapsAppointment && timeGte(startAt, new Date().toISOString())) {
          slots.push({ doctorId: resource.id, doctorName: resource.name, startAt, endAt });
        }

        const [hour, minute] = slotStartTime.split(":").map(Number);
        const next = new Date(Date.UTC(2020, 0, 1, hour, minute + interval));
        slotStartTime = `${String(next.getUTCHours()).padStart(2, "0")}:${String(next.getUTCMinutes()).padStart(2, "0")}`;
      }
    }
  }

  return slots.sort((left, right) => left.startAt.localeCompare(right.startAt)).slice(0, 20);
}

export async function createAppointmentFromAI(clinicId: string, payload: AiAppointmentPayload) {
  const slots = await getAvailableSlots(clinicId, payload.serviceId, payload.doctorId, {
    startDate: getManilaParts(payload.startAt).date,
    endDate: getManilaParts(payload.startAt).date
  });
  const matchingSlot = slots.find((slot) => slot.startAt === payload.startAt && (payload.doctorId ? slot.doctorId === payload.doctorId : true));

  if (!matchingSlot) {
    throw new Error("Selected slot is no longer available.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      clinic_id: clinicId,
      patient_id: payload.patientId,
      doctor_id: matchingSlot.doctorId,
      service_id: payload.serviceId,
      source: "ai",
      status: "booked",
      start_at: matchingSlot.startAt,
      end_at: matchingSlot.endAt,
      notes: payload.notes ?? "Created by AI booking assistant."
    })
    .select("*")
    .single<Appointment>();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create AI appointment.");
  }

  if (payload.conversationId) {
    await supabase
      .from("ai_conversations")
      .update({ status: "booked", patient_id: payload.patientId })
      .eq("clinic_id", clinicId)
      .eq("id", payload.conversationId);
  }

  return data;
}

export async function handoffToStaff(conversationId: string, reason: string) {
  const supabase = await createSupabaseServerClient();
  const { data: conversation, error: conversationError } = await supabase
    .from("ai_conversations")
    .select("*")
    .eq("id", conversationId)
    .single<{ clinic_id: string; metadata: Record<string, unknown> }>();

  if (conversationError || !conversation) {
    throw new Error(conversationError?.message ?? "Conversation not found.");
  }

  const { error } = await supabase
    .from("ai_conversations")
    .update({
      status: "handoff",
      metadata: {
        ...conversation.metadata,
        handoff_reason: reason,
        handed_off_at: new Date().toISOString()
      }
    })
    .eq("id", conversationId);

  if (error) {
    throw new Error(error.message);
  }
}
