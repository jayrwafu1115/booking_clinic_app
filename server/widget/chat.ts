import { z } from "zod";
import { buildBookingSystemPrompt } from "@/lib/ai/prompts";
import { getAiProvider } from "@/lib/ai/provider";
import { DEFAULT_AI_WELCOME_MESSAGE } from "@/lib/constants/ai";
import { ACTIVE_APPOINTMENT_STATUSES } from "@/lib/constants/appointments";
import { sendAppointmentEmailById } from "@/lib/notifications/send-appointment-email";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { addMinutesIso, getManilaParts, manilaLocalToUtcIso } from "@/lib/utils/manila-time";
import type {
  AiConversation,
  AiMessage,
  AiMessageRole,
  Appointment,
  AvailabilityRule,
  BlockedDate,
  Clinic,
  ClinicSettings,
  Doctor,
  FaqItem,
  Patient,
  Service
} from "@/types/database";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type PublicWidgetClinic = Pick<Clinic, "id" | "name" | "slug" | "logo_url" | "primary_color">;

export type PublicWidgetSettings = Pick<
  ClinicSettings,
  "ai_enabled" | "ai_widget_enabled" | "ai_provider" | "ai_model" | "ai_tone" | "ai_welcome_message" | "ai_booking_instructions"
>;

export type PublicWidgetService = Pick<
  Service,
  "id" | "name" | "description" | "category" | "duration_minutes" | "price_centavos" | "color" | "icon"
>;

export type PublicWidgetConfig = {
  clinic: PublicWidgetClinic;
  settings: PublicWidgetSettings;
  services: PublicWidgetService[];
};

type WidgetConversation = Pick<AiConversation, "id" | "clinic_id" | "status" | "patient_temp_id" | "metadata">;

export type WidgetQuickReply = {
  label: string;
  value: string;
  type: "message" | "service";
  serviceId?: string;
};

export type WidgetSlot = {
  doctorId: string | null;
  doctorName: string | null;
  serviceId: string;
  serviceName: string;
  startAt: string;
  endAt: string;
  label: string;
};

export type WidgetChatResponse = {
  conversationId: string;
  patientTempId: string | null;
  messages: Pick<AiMessage, "id" | "role" | "content" | "metadata" | "created_at">[];
  quickReplies: WidgetQuickReply[];
  services?: PublicWidgetService[];
  availableDates?: string[];
  slots?: WidgetSlot[];
  selectedServiceId?: string;
  selectedSlot?: WidgetSlot;
  needsPhoneLookup?: boolean;
  needsPatientDetails?: boolean;
  patientLookup?: { found: true; patientName: string; phone: string } | { found: false; phone: string };
  appointment?: {
    id: string;
    startAt: string;
    endAt: string;
    serviceName: string;
    doctorName: string | null;
    patientName: string;
  };
};

export class WidgetChatError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const optionalUuid = z.string().uuid().nullable().optional();
const patientTempIdSchema = z.string().trim().min(1).max(120).optional();

export const widgetClinicSlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const widgetChatRequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("start"),
    patientTempId: patientTempIdSchema
  }),
  z.object({
    type: z.literal("message"),
    conversationId: z.string().uuid().optional(),
    patientTempId: patientTempIdSchema,
    content: z.string().trim().min(1).max(1500)
  }),
  z.object({
    type: z.literal("select_service"),
    conversationId: z.string().uuid().optional(),
    patientTempId: patientTempIdSchema,
    serviceId: z.string().uuid()
  }),
  z.object({
    type: z.literal("select_date"),
    conversationId: z.string().uuid().optional(),
    patientTempId: patientTempIdSchema,
    serviceId: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  }),
  z.object({
    type: z.literal("select_slot"),
    conversationId: z.string().uuid().optional(),
    patientTempId: patientTempIdSchema,
    serviceId: z.string().uuid(),
    doctorId: optionalUuid,
    startAt: z.string().datetime({ offset: true })
  }),
  z.object({
    type: z.literal("lookup_patient"),
    conversationId: z.string().uuid().optional(),
    patientTempId: patientTempIdSchema,
    phone: z.string().trim().min(6).max(40)
  }),
  z.object({
    type: z.literal("confirm_booking"),
    conversationId: z.string().uuid().optional(),
    patientTempId: patientTempIdSchema,
    serviceId: z.string().uuid(),
    doctorId: optionalUuid,
    startAt: z.string().datetime({ offset: true }),
    patient: z.object({
      fullName: z.string().trim().min(2).max(160),
      phone: z.string().trim().min(6).max(40),
      email: z.string().trim().email().optional().or(z.literal("")).transform((value) => value || null),
      dateOfBirth: z.string().trim().nullish(),
      insuranceProvider: z.string().trim().max(120).nullish().transform((v) => v || null),
      notes: z.string().trim().max(500).nullish().transform((v) => v || null)
    })
  })
]);

type WidgetChatRequest = z.infer<typeof widgetChatRequestSchema>;

function normalizeSettings(settings: PublicWidgetSettings | null): PublicWidgetSettings {
  return {
    ai_enabled: settings?.ai_enabled ?? true,
    ai_widget_enabled: settings?.ai_widget_enabled ?? true,
    ai_provider: settings?.ai_provider ?? "openai",
    ai_model: settings?.ai_model ?? "gpt-4o-mini",
    ai_tone: settings?.ai_tone ?? "professional",
    ai_welcome_message: settings?.ai_welcome_message ?? DEFAULT_AI_WELCOME_MESSAGE,
    ai_booking_instructions: settings?.ai_booking_instructions ?? null
  };
}

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

function hasEmergencyIntent(content: string) {
  return /\b(emergency|chest pain|can't breathe|cannot breathe|severe bleeding|stroke|heart attack|unconscious)\b/i.test(content);
}

function hasPriceIntent(content: string) {
  return /\b(how much|price|cost|fee|rate|charge|magkano|presyo|bayad|libre|free)\b/i.test(content);
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

function addDays(dateString: string, days: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function formatManilaDateTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila"
  }).format(new Date(value));
}

function formatManilaTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeStyle: "short",
    timeZone: "Asia/Manila"
  }).format(new Date(value));
}

function formatManilaDateLong(manilaDate: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "full",
    timeZone: "Asia/Manila"
  }).format(new Date(`${manilaDate}T12:00:00+08:00`));
}

function serviceQuickReplies(services: PublicWidgetService[]) {
  return services.slice(0, 6).map((service) => ({
    label: service.name,
    value: service.name,
    type: "service" as const,
    serviceId: service.id
  }));
}

function makePatientTempId(value?: string) {
  return value?.trim() || crypto.randomUUID();
}

async function insertWidgetMessage(
  supabase: SupabaseAdminClient,
  conversationId: string,
  clinicId: string,
  role: AiMessageRole,
  content: string,
  metadata: Record<string, unknown> = {}
) {
  const { data, error } = await supabase
    .from("ai_messages")
    .insert({
      conversation_id: conversationId,
      clinic_id: clinicId,
      role,
      content,
      metadata
    })
    .select("id, role, content, metadata, created_at")
    .single<Pick<AiMessage, "id" | "role" | "content" | "metadata" | "created_at">>();

  if (error || !data) {
    throw new WidgetChatError(error?.message ?? "Could not store widget message.", 500);
  }

  return data;
}

async function createWidgetConversation(
  supabase: SupabaseAdminClient,
  config: PublicWidgetConfig,
  patientTempId: string,
  metadata: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({
      clinic_id: config.clinic.id,
      patient_temp_id: patientTempId,
      channel: "widget",
      status: "open",
      metadata: {
        clinic_slug: config.clinic.slug,
        booking_stage: "started",
        ...metadata
      }
    })
    .select("id, clinic_id, status, patient_temp_id, metadata")
    .single<WidgetConversation>();

  if (error || !data) {
    throw new WidgetChatError(error?.message ?? "Could not start widget conversation.", 500);
  }

  return data;
}

async function getOrCreateConversation(
  supabase: SupabaseAdminClient,
  config: PublicWidgetConfig,
  request: Exclude<WidgetChatRequest, { type: "start" }>,
  metadata: Record<string, unknown>
) {
  if ("conversationId" in request && request.conversationId) {
    const { data, error } = await supabase
      .from("ai_conversations")
      .select("id, clinic_id, status, patient_temp_id, metadata")
      .eq("clinic_id", config.clinic.id)
      .eq("id", request.conversationId)
      .eq("channel", "widget")
      .single<WidgetConversation>();

    if (error || !data) {
      throw new WidgetChatError("Widget conversation was not found.", 404);
    }

    return data;
  }

  return createWidgetConversation(supabase, config, makePatientTempId(request.patientTempId), metadata);
}

async function answerFromPublicFAQ(supabase: SupabaseAdminClient, clinicId: string, question: string) {
  const { data, error } = await supabase
    .from("faq_items")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<FaqItem[]>();

  if (error) {
    throw new WidgetChatError(error.message, 500);
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

async function getPublicServices(supabase: SupabaseAdminClient, clinicId: string) {
  const { data, error } = await supabase
    .from("services")
    .select("id, name, description, category, duration_minutes, price_centavos, color, icon")
    .eq("clinic_id", clinicId)
    .eq("active", true)
    .eq("online_booking_enabled", true)
    .order("name")
    .limit(50)
    .returns<PublicWidgetService[]>();

  if (error) {
    throw new WidgetChatError(error.message, 500);
  }

  return data ?? [];
}

async function searchPublicServices(supabase: SupabaseAdminClient, clinicId: string, query: string) {
  const services = await getPublicServices(supabase, clinicId);
  const cleaned = query.trim();

  if (!cleaned) {
    return services.slice(0, 8);
  }

  return services
    .map((service) => ({
      service,
      score: Math.max(
        scoreMatch(cleaned, service.name),
        scoreMatch(cleaned, `${service.name} ${service.description ?? ""} ${service.category ?? ""}`)
      )
    }))
    .filter((item) => item.score > 0 || item.service.name.toLowerCase().includes(cleaned.toLowerCase()))
    .sort((left, right) => right.score - left.score || left.service.name.localeCompare(right.service.name))
    .slice(0, 8)
    .map((item) => item.service);
}

async function getPublicAvailableSlots(
  supabase: SupabaseAdminClient,
  clinicId: string,
  serviceId: string,
  doctorId: string | null | undefined,
  dateRange: { startDate: string; endDate: string },
  limit = 12
) {
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("id", serviceId)
    .eq("active", true)
    .eq("online_booking_enabled", true)
    .single<Service>();

  if (serviceError || !service) {
    throw new WidgetChatError("This service is not available for online booking.", 404);
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

  if (doctorsResult.error) throw new WidgetChatError(doctorsResult.error.message, 500);
  if (rulesResult.error) throw new WidgetChatError(rulesResult.error.message, 500);
  if (blockedResult.error) throw new WidgetChatError(blockedResult.error.message, 500);
  if (appointmentsResult.error) throw new WidgetChatError(appointmentsResult.error.message, 500);

  const doctors = doctorsResult.data ?? [];
  const resources = doctors.length > 0 ? doctors.map((doctor) => ({ id: doctor.id, name: doctor.full_name })) : [{ id: null, name: null }];
  const slots: WidgetSlot[] = [];
  let dayOffset = 0;

  while (addDays(dateRange.startDate, dayOffset) <= dateRange.endDate) {
    const localDate = addDays(dateRange.startDate, dayOffset);
    const day = getManilaParts(manilaLocalToUtcIso(`${localDate}T00:00`)).dayOfWeek;

    for (const resource of resources) {
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
          slots.push({
            doctorId: resource.id,
            doctorName: resource.name,
            serviceId: service.id,
            serviceName: service.name,
            startAt,
            endAt,
            label: `${formatManilaDateTime(startAt)}${resource.name ? ` with ${resource.name}` : ""}`
          });
        }

        const [hour, minute] = slotStartTime.split(":").map(Number);
        const next = new Date(Date.UTC(2020, 0, 1, hour, minute + interval));
        slotStartTime = `${String(next.getUTCHours()).padStart(2, "0")}:${String(next.getUTCMinutes()).padStart(2, "0")}`;
      }
    }

    dayOffset += 1;
  }

  return slots.sort((left, right) => left.startAt.localeCompare(right.startAt)).slice(0, limit);
}

async function createPatientIfNeeded(
  supabase: SupabaseAdminClient,
  clinicId: string,
  patientInfo: { fullName: string; phone: string; email: string | null; dateOfBirth?: string | null; insuranceProvider?: string | null }
) {
  const phone = patientInfo.phone.trim();
  const { data: existing, error: existingError } = await supabase
    .from("patients")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("phone", phone)
    .maybeSingle<Patient>();

  if (existingError) {
    throw new WidgetChatError(existingError.message, 500);
  }

  if (existing) {
    const updates: Record<string, unknown> = {};
    if (patientInfo.email && !existing.email) updates.email = patientInfo.email;
    if (patientInfo.dateOfBirth && !existing.birth_date) updates.birth_date = patientInfo.dateOfBirth;
    if (Object.keys(updates).length > 0) {
      const { data: updated } = await supabase
        .from("patients")
        .update(updates)
        .eq("id", existing.id)
        .eq("clinic_id", clinicId)
        .select("*")
        .single<Patient>();
      if (updated) return updated;
    }
    return existing;
  }

  const { data, error } = await supabase
    .from("patients")
    .insert({
      clinic_id: clinicId,
      full_name: patientInfo.fullName.trim(),
      phone,
      email: patientInfo.email,
      birth_date: patientInfo.dateOfBirth ?? null
    })
    .select("*")
    .single<Patient>();

  if (error || !data) {
    throw new WidgetChatError(error?.message ?? "Could not create patient record.", 500);
  }

  return data;
}

async function updateConversationMetadata(
  supabase: SupabaseAdminClient,
  conversation: WidgetConversation,
  nextMetadata: Record<string, unknown>
) {
  const { error } = await supabase
    .from("ai_conversations")
    .update({
      metadata: {
        ...conversation.metadata,
        ...nextMetadata
      }
    })
    .eq("clinic_id", conversation.clinic_id)
    .eq("id", conversation.id);

  if (error) {
    throw new WidgetChatError(error.message, 500);
  }
}

async function createWidgetAppointment(
  supabase: SupabaseAdminClient,
  config: PublicWidgetConfig,
  conversation: WidgetConversation,
  request: Extract<WidgetChatRequest, { type: "confirm_booking" }>
) {
  const selectedDate = getManilaParts(request.startAt).date;
  const slots = await getPublicAvailableSlots(supabase, config.clinic.id, request.serviceId, request.doctorId, {
    startDate: selectedDate,
    endDate: selectedDate
  });
  const matchingSlot = slots.find((slot) => slot.startAt === request.startAt && (request.doctorId ? slot.doctorId === request.doctorId : true));

  if (!matchingSlot) {
    throw new WidgetChatError("That slot is no longer available. Please choose another time.", 409);
  }

  const patient = await createPatientIfNeeded(supabase, config.clinic.id, request.patient);

  const noteParts: string[] = [];
  if (request.patient.insuranceProvider) noteParts.push(`Insurance: ${request.patient.insuranceProvider}`);
  if (request.patient.notes) noteParts.push(request.patient.notes);
  noteParts.push(`Booked via widget. Conversation: ${conversation.id}`);

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      clinic_id: config.clinic.id,
      patient_id: patient.id,
      doctor_id: matchingSlot.doctorId,
      service_id: request.serviceId,
      status: "booked",
      source: "widget",
      start_at: matchingSlot.startAt,
      end_at: matchingSlot.endAt,
      notes: noteParts.join("\n")
    })
    .select("*")
    .single<Appointment>();

  if (error || !appointment) {
    throw new WidgetChatError(error?.message ?? "Could not create appointment.", 500);
  }

  const { error: conversationError } = await supabase
    .from("ai_conversations")
    .update({
      status: "booked",
      patient_id: patient.id,
      metadata: {
        ...conversation.metadata,
        booking_stage: "booked",
        appointment_id: appointment.id,
        service_id: request.serviceId,
        start_at: matchingSlot.startAt,
        doctor_id: matchingSlot.doctorId
      }
    })
    .eq("clinic_id", config.clinic.id)
    .eq("id", conversation.id);

  if (conversationError) {
    throw new WidgetChatError(conversationError.message, 500);
  }

  return { appointment, patient, slot: matchingSlot };
}

export async function getPublicWidgetConfig(clinicSlug: string): Promise<PublicWidgetConfig | null> {
  const parsed = widgetClinicSlugSchema.safeParse(clinicSlug);
  if (!parsed.success) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data: clinic, error: clinicError } = await supabase
    .from("clinics")
    .select("id, name, slug, logo_url, primary_color, status")
    .eq("slug", parsed.data)
    .maybeSingle<PublicWidgetClinic & Pick<Clinic, "status">>();

  if (clinicError) {
    throw new WidgetChatError(clinicError.message, 500);
  }

  if (!clinic || clinic.status !== "active") {
    return null;
  }

  const { data: subscription } = await supabase
    .from("clinic_subscriptions")
    .select("status, plan:subscription_plans(ai_enabled)")
    .eq("clinic_id", clinic.id)
    .maybeSingle<{ status: string; plan: { ai_enabled: boolean } | null }>();

  const planHasAi = subscription?.plan?.ai_enabled ?? false;

  if (!planHasAi) {
    return null;
  }

  const [settingsResult, services] = await Promise.all([
    supabase
      .from("clinic_settings")
      .select("ai_enabled, ai_widget_enabled, ai_provider, ai_model, ai_tone, ai_welcome_message, ai_booking_instructions")
      .eq("clinic_id", clinic.id)
      .maybeSingle<PublicWidgetSettings>(),
    getPublicServices(supabase, clinic.id)
  ]);

  if (settingsResult.error) {
    throw new WidgetChatError(settingsResult.error.message, 500);
  }

  return {
    clinic: {
      id: clinic.id,
      name: clinic.name,
      slug: clinic.slug,
      logo_url: clinic.logo_url,
      primary_color: clinic.primary_color
    },
    settings: normalizeSettings(settingsResult.data),
    services
  };
}

export async function handleWidgetChat(
  clinicSlug: string,
  payload: unknown,
  metadata: Record<string, unknown> = {}
): Promise<WidgetChatResponse> {
  const request = widgetChatRequestSchema.parse(payload);
  const config = await getPublicWidgetConfig(clinicSlug);

  if (!config) {
    throw new WidgetChatError("Clinic widget was not found.", 404);
  }

  if (!config.settings.ai_enabled || !config.settings.ai_widget_enabled) {
    throw new WidgetChatError("This booking widget is currently unavailable.", 403);
  }

  const supabase = createSupabaseAdminClient();

  if (request.type === "start") {
    const conversation = await createWidgetConversation(supabase, config, makePatientTempId(request.patientTempId), metadata);
    const message = await insertWidgetMessage(supabase, conversation.id, config.clinic.id, "assistant", config.settings.ai_welcome_message, {
      source: "welcome_message"
    });

    return {
      conversationId: conversation.id,
      patientTempId: conversation.patient_temp_id,
      messages: [message],
      quickReplies: serviceQuickReplies(config.services),
      services: config.services
    };
  }

  const conversation = await getOrCreateConversation(supabase, config, request, metadata);

  if (conversation.status === "booked") {
    const message = await insertWidgetMessage(
      supabase,
      conversation.id,
      config.clinic.id,
      "assistant",
      "This conversation already has a booked appointment. Please contact the clinic directly if you need to make changes.",
      { source: "booking_closed" }
    );

    return {
      conversationId: conversation.id,
      patientTempId: conversation.patient_temp_id,
      messages: [message],
      quickReplies: []
    };
  }

  if (request.type === "message") {
    const userMessage = await insertWidgetMessage(supabase, conversation.id, config.clinic.id, "user", request.content);
    let assistantContent: string;
    let assistantMetadata: Record<string, unknown> = {};
    let quickReplies = serviceQuickReplies(config.services);
    let matchedServices: PublicWidgetService[] = [];

    if (hasEmergencyIntent(request.content)) {
      assistantContent =
        "This may be an emergency. Please contact local emergency services immediately or go to the nearest emergency room. I cannot provide medical diagnosis or emergency treatment advice.";
      assistantMetadata = { source: "emergency_safety_rule" };
      quickReplies = [];
    } else {
      const faqAnswer = await answerFromPublicFAQ(supabase, config.clinic.id, request.content);

      if (faqAnswer) {
        assistantContent = faqAnswer.answer;
        assistantMetadata = { source: "faq", faq_question: faqAnswer.question, score: faqAnswer.score };
      } else {
        matchedServices = await searchPublicServices(supabase, config.clinic.id, request.content);

        const priceIntent = hasPriceIntent(request.content);

        if (priceIntent && matchedServices.length === 0) {
          // Generic "how much?" with no specific service — show all service prices
          const allPrices = config.services
            .map((service) => {
              const price =
                service.price_centavos != null
                  ? `PHP ${(service.price_centavos / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
                  : "price upon request";
              return `• ${service.name}: ${price} (${service.duration_minutes} mins)`;
            })
            .join("\n");
          assistantContent = `Here are our service prices:\n\n${allPrices}\n\nWould you like to book any of these services?`;
          assistantMetadata = { source: "price_info_all" };
          quickReplies = serviceQuickReplies(config.services);
        } else if (matchedServices.length > 0 && priceIntent) {
          const priceList = matchedServices
            .map((service) => {
              const price =
                service.price_centavos != null
                  ? `PHP ${(service.price_centavos / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
                  : "price upon request";
              return `• ${service.name}: ${price} (${service.duration_minutes} mins)`;
            })
            .join("\n");
          assistantContent = `Here are the prices:\n\n${priceList}\n\nWould you like to book any of these services?`;
          assistantMetadata = { source: "price_info", matched_services: matchedServices.map((service) => service.id) };
          quickReplies = serviceQuickReplies(matchedServices);
        } else if (matchedServices.length > 0) {
          assistantContent = "I found these services for online booking. Which one would you like to schedule?";
          assistantMetadata = { source: "service_search", matched_services: matchedServices.map((service) => service.id) };
          quickReplies = serviceQuickReplies(matchedServices);
        } else {
          const recentMessagesResult = await supabase
            .from("ai_messages")
            .select("role, content")
            .eq("conversation_id", conversation.id)
            .eq("clinic_id", config.clinic.id)
            .order("created_at", { ascending: true })
            .limit(20)
            .returns<{ role: AiMessageRole; content: string }[]>();

          if (recentMessagesResult.error) {
            throw new WidgetChatError(recentMessagesResult.error.message, 500);
          }

          try {
            const provider = getAiProvider(config.settings.ai_provider);
            const serviceContext = config.services
              .slice(0, 12)
              .map((service) => {
                const price = service.price_centavos != null
                  ? ` – PHP ${(service.price_centavos / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
                  : "";
                return `${service.name} (${service.duration_minutes} mins${price})`;
              })
              .join(", ");
            const response = await provider.generateReply({
              model: config.settings.ai_model,
              systemPrompt: buildBookingSystemPrompt(config.settings),
              messages: [
                {
                  role: "system",
                  content: `Public widget context. Clinic: ${config.clinic.name}. Online-booking-enabled services: ${serviceContext || "none configured"}.${matchedServices.length > 0 ? ` The patient's query matched these services: ${matchedServices.map((s) => s.name).join(", ")}.` : ""}`
                },
                ...(recentMessagesResult.data ?? []).map((message) => ({
                  role: message.role === "tool" ? ("assistant" as const) : message.role,
                  content: message.content
                }))
              ]
            });

            assistantContent = response.content;
            assistantMetadata = { source: provider.name };
          } catch (error) {
            assistantContent =
              "I can help with clinic FAQs and appointment booking. Please choose a service below, or type the service you want to schedule.";
            assistantMetadata = { source: "provider_fallback", error: error instanceof Error ? error.message : "Provider unavailable" };
          }
        }
      }
    }

    const assistantMessage = await insertWidgetMessage(supabase, conversation.id, config.clinic.id, "assistant", assistantContent, assistantMetadata);

    return {
      conversationId: conversation.id,
      patientTempId: conversation.patient_temp_id,
      messages: [userMessage, assistantMessage],
      quickReplies,
      services: matchedServices.length > 0 ? matchedServices : config.services
    };
  }

  if (request.type === "select_service") {
    const service = config.services.find((item) => item.id === request.serviceId);
    if (!service) {
      throw new WidgetChatError("This service is not available for online booking.", 404);
    }

    await updateConversationMetadata(supabase, conversation, {
      booking_stage: "service_selected",
      service_id: service.id
    });
    const userMessage = await insertWidgetMessage(supabase, conversation.id, config.clinic.id, "user", `I would like to book ${service.name}.`, {
      source: "quick_reply",
      service_id: service.id
    });
    const today = getManilaParts(new Date().toISOString()).date;
    const allSlots = await getPublicAvailableSlots(supabase, config.clinic.id, service.id, null, {
      startDate: today,
      endDate: addDays(today, 14)
    }, 200);
    const availableDates = [...new Set(allSlots.map((slot) => getManilaParts(slot.startAt).date))];
    const assistantContent =
      availableDates.length > 0
        ? `Please select a date for your ${service.name} appointment.`
        : `I could not find an available ${service.name} slot in the next two weeks. Please contact the clinic for assistance.`;
    const assistantMessage = await insertWidgetMessage(supabase, conversation.id, config.clinic.id, "assistant", assistantContent, {
      source: "available_dates",
      service_id: service.id,
      available_dates: availableDates
    });

    return {
      conversationId: conversation.id,
      patientTempId: conversation.patient_temp_id,
      messages: [userMessage, assistantMessage],
      quickReplies: [],
      availableDates,
      selectedServiceId: service.id
    };
  }

  if (request.type === "select_date") {
    const service = config.services.find((item) => item.id === request.serviceId);
    if (!service) {
      throw new WidgetChatError("This service is not available for online booking.", 404);
    }

    const formattedDate = formatManilaDateLong(request.date);
    const userMessage = await insertWidgetMessage(
      supabase, conversation.id, config.clinic.id, "user",
      `I'd like to book on ${formattedDate}.`,
      { source: "date_selection", date: request.date, service_id: request.serviceId }
    );

    const daySlots = await getPublicAvailableSlots(supabase, config.clinic.id, request.serviceId, null, {
      startDate: request.date,
      endDate: request.date
    }, 30);

    if (daySlots.length === 0) {
      const today = getManilaParts(new Date().toISOString()).date;
      const allSlots = await getPublicAvailableSlots(supabase, config.clinic.id, request.serviceId, null, {
        startDate: today,
        endDate: addDays(today, 14)
      }, 200);
      const availableDates = [...new Set(allSlots.map((slot) => getManilaParts(slot.startAt).date))];
      const assistantMessage = await insertWidgetMessage(
        supabase, conversation.id, config.clinic.id, "assistant",
        `No available slots on ${formattedDate}. Please choose another date.`,
        { source: "no_slots_on_date", date: request.date }
      );
      return {
        conversationId: conversation.id,
        patientTempId: conversation.patient_temp_id,
        messages: [userMessage, assistantMessage],
        quickReplies: [],
        availableDates,
        selectedServiceId: request.serviceId
      };
    }

    const timeSlots = daySlots.map((slot) => ({
      ...slot,
      label: `${formatManilaTime(slot.startAt)}${slot.doctorName ? ` with ${slot.doctorName}` : ""}`
    }));
    const assistantMessage = await insertWidgetMessage(
      supabase, conversation.id, config.clinic.id, "assistant",
      `Available times on ${formattedDate}. Please choose one.`,
      { source: "available_slots", service_id: request.serviceId, date: request.date, slots: timeSlots }
    );

    return {
      conversationId: conversation.id,
      patientTempId: conversation.patient_temp_id,
      messages: [userMessage, assistantMessage],
      quickReplies: [],
      slots: timeSlots,
      selectedServiceId: request.serviceId
    };
  }

  if (request.type === "select_slot") {
    const selectedDate = getManilaParts(request.startAt).date;
    const slots = await getPublicAvailableSlots(supabase, config.clinic.id, request.serviceId, request.doctorId, {
      startDate: selectedDate,
      endDate: selectedDate
    });
    const selectedSlot = slots.find((slot) => slot.startAt === request.startAt && (request.doctorId ? slot.doctorId === request.doctorId : true));

    if (!selectedSlot) {
      throw new WidgetChatError("That slot is no longer available. Please choose another time.", 409);
    }

    await updateConversationMetadata(supabase, conversation, {
      booking_stage: "slot_selected",
      service_id: request.serviceId,
      doctor_id: selectedSlot.doctorId,
      start_at: selectedSlot.startAt,
      end_at: selectedSlot.endAt
    });
    const userMessage = await insertWidgetMessage(supabase, conversation.id, config.clinic.id, "user", `I choose ${selectedSlot.label}.`, {
      source: "slot_selection",
      slot: selectedSlot
    });
    const assistantMessage = await insertWidgetMessage(
      supabase,
      conversation.id,
      config.clinic.id,
      "assistant",
      `Great. To confirm ${selectedSlot.serviceName} on ${formatManilaDateTime(selectedSlot.startAt)}, please share the patient's full name and phone number. Email is optional.`,
      { source: "patient_details_request", slot: selectedSlot }
    );

    return {
      conversationId: conversation.id,
      patientTempId: conversation.patient_temp_id,
      messages: [userMessage, assistantMessage],
      quickReplies: [],
      selectedServiceId: request.serviceId,
      selectedSlot,
      needsPhoneLookup: true
    };
  }

  if (request.type === "lookup_patient") {
    const phone = request.phone.trim();
    await updateConversationMetadata(supabase, conversation, { lookup_phone: phone });

    const { data: existing } = await supabase
      .from("patients")
      .select("id, full_name")
      .eq("clinic_id", config.clinic.id)
      .eq("phone", phone)
      .maybeSingle<Pick<Patient, "id" | "full_name">>();

    const userMessage = await insertWidgetMessage(
      supabase, conversation.id, config.clinic.id, "user",
      `My phone number is ${phone}.`,
      { source: "phone_lookup" }
    );

    let assistantContent: string;
    let patientLookup: WidgetChatResponse["patientLookup"];

    if (existing) {
      assistantContent = `Welcome back, ${existing.full_name}! Tap below to confirm your appointment.`;
      patientLookup = { found: true, patientName: existing.full_name, phone };
    } else {
      assistantContent = "Looks like you're new here. Please complete your details to confirm the booking.";
      patientLookup = { found: false, phone };
    }

    const assistantMessage = await insertWidgetMessage(
      supabase, conversation.id, config.clinic.id, "assistant",
      assistantContent,
      { source: "patient_lookup", patient_found: Boolean(existing) }
    );

    return {
      conversationId: conversation.id,
      patientTempId: conversation.patient_temp_id,
      messages: [userMessage, assistantMessage],
      quickReplies: [],
      needsPatientDetails: true,
      patientLookup
    };
  }

  const conversationForBooking = conversation;
  const userMessage = await insertWidgetMessage(
    supabase,
    conversationForBooking.id,
    config.clinic.id,
    "user",
    `Please confirm this booking for ${request.patient.fullName}.`,
    {
      source: "booking_confirmation",
      service_id: request.serviceId,
      start_at: request.startAt,
      patient_phone: request.patient.phone
    }
  );
  const { appointment, patient, slot } = await createWidgetAppointment(supabase, config, conversationForBooking, request);

  // Send booking confirmation email (non-blocking; patient email is optional)
  await sendAppointmentEmailById(appointment.id, "booking_confirmation");

  const assistantMessage = await insertWidgetMessage(
    supabase,
    conversationForBooking.id,
    config.clinic.id,
    "assistant",
    `You're booked. ${slot.serviceName} is scheduled for ${formatManilaDateTime(slot.startAt)}${slot.doctorName ? ` with ${slot.doctorName}` : ""}.`,
    {
      source: "appointment_created",
      appointment_id: appointment.id,
      patient_id: patient.id
    }
  );

  return {
    conversationId: conversationForBooking.id,
    patientTempId: conversationForBooking.patient_temp_id,
    messages: [userMessage, assistantMessage],
    quickReplies: [],
    appointment: {
      id: appointment.id,
      startAt: appointment.start_at,
      endAt: appointment.end_at,
      serviceName: slot.serviceName,
      doctorName: slot.doctorName,
      patientName: patient.full_name
    }
  };
}
