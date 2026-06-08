"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { DEFAULT_AI_WELCOME_MESSAGE, getModelsForProvider } from "@/lib/constants/ai";
import { getAiProvider } from "@/lib/ai/provider";
import { buildBookingSystemPrompt } from "@/lib/ai/prompts";
import { answerFromFAQ, handoffToStaff, searchServices, getAvailableSlots } from "@/lib/ai/tools";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  aiSettingsSchema,
  createConversationSchema,
  faqItemDeleteSchema,
  faqItemSchema,
  handoffConversationSchema,
  sendAiMessageSchema
} from "@/lib/validations/settings";
import type { AiMessage, ClinicSettings } from "@/types/database";

type AiActionState = {
  message?: string;
  success?: boolean;
};

async function getAiActionContext(manage = true) {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  if (!profile?.clinic_id) {
    throw new Error("A clinic profile is required.");
  }

  assertPermission(profile, manage ? "ai:manage" : "ai:view");

  return { user, profile, clinicId: profile.clinic_id };
}

function toState(error: unknown): AiActionState {
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

function hasEmergencyIntent(content: string) {
  return /\b(emergency|chest pain|can't breathe|cannot breathe|severe bleeding|stroke|heart attack|unconscious)\b/i.test(content);
}

async function getSettings(clinicId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("clinic_settings").select("*").eq("clinic_id", clinicId).maybeSingle<ClinicSettings>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function insertMessage(conversationId: string, clinicId: string, role: AiMessage["role"], content: string, metadata: Record<string, unknown> = {}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("ai_messages").insert({
    conversation_id: conversationId,
    clinic_id: clinicId,
    role,
    content,
    metadata
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateAiSettingsAction(_: AiActionState, formData: FormData): Promise<AiActionState> {
  try {
    const parsed = aiSettingsSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Please review AI settings." };
    }

    const { clinicId } = await getAiActionContext(true);
    const models = getModelsForProvider(parsed.data.aiProvider);

    if (!(models as readonly string[]).includes(parsed.data.aiModel)) {
      return { message: "Selected model is not valid for the selected provider." };
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("clinic_settings").upsert(
      {
        clinic_id: clinicId,
        ai_enabled: parsed.data.aiEnabled,
        ai_provider: parsed.data.aiProvider,
        ai_model: parsed.data.aiModel,
        ai_tone: parsed.data.aiTone,
        ai_welcome_message: parsed.data.aiWelcomeMessage,
        ai_booking_instructions: parsed.data.aiBookingInstructions,
        ai_widget_enabled: parsed.data.aiWidgetEnabled
      },
      { onConflict: "clinic_id" }
    );

    if (error) {
      return { message: error.message };
    }

    revalidatePath("/ai/settings");
    return { success: true, message: "AI settings saved." };
  } catch (error) {
    return toState(error);
  }
}

export async function createFaqItemAction(_: AiActionState, formData: FormData): Promise<AiActionState> {
  try {
    const parsed = faqItemSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Please review the FAQ item." };
    }

    const { clinicId } = await getAiActionContext(true);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("faq_items").insert({
      clinic_id: clinicId,
      question: parsed.data.question,
      answer: parsed.data.answer,
      active: parsed.data.active
    });

    if (error) {
      return { message: error.message };
    }

    revalidatePath("/ai/faq");
    return { success: true, message: "FAQ item created." };
  } catch (error) {
    return toState(error);
  }
}

export async function updateFaqItemAction(_: AiActionState, formData: FormData): Promise<AiActionState> {
  try {
    const parsed = faqItemSchema.required({ id: true }).safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Please review the FAQ item." };
    }

    const { clinicId } = await getAiActionContext(true);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("faq_items")
      .update({
        question: parsed.data.question,
        answer: parsed.data.answer,
        active: parsed.data.active
      })
      .eq("clinic_id", clinicId)
      .eq("id", parsed.data.id);

    if (error) {
      return { message: error.message };
    }

    revalidatePath("/ai/faq");
    return { success: true, message: "FAQ item updated." };
  } catch (error) {
    return toState(error);
  }
}

export async function deleteFaqItemAction(_: AiActionState, formData: FormData): Promise<AiActionState> {
  try {
    const parsed = faqItemDeleteSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: "Choose a valid FAQ item." };
    }

    const { clinicId } = await getAiActionContext(true);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("faq_items").delete().eq("clinic_id", clinicId).eq("id", parsed.data.id);

    if (error) {
      return { message: error.message };
    }

    revalidatePath("/ai/faq");
    return { success: true, message: "FAQ item deleted." };
  } catch (error) {
    return toState(error);
  }
}

export async function createAiConversationAction(_: AiActionState, formData: FormData): Promise<AiActionState> {
  try {
    const parsed = createConversationSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: "Choose a valid conversation channel." };
    }

    const { clinicId } = await getAiActionContext(false);
    const settings = await getSettings(clinicId);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("ai_conversations")
      .insert({
        clinic_id: clinicId,
        channel: parsed.data.channel,
        status: "open",
        metadata: {}
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !data) {
      return { message: error?.message ?? "Could not create conversation." };
    }

    await insertMessage(
      data.id,
      clinicId,
      "assistant",
      settings?.ai_welcome_message ?? DEFAULT_AI_WELCOME_MESSAGE,
      { source: "welcome_message" }
    );

    revalidatePath("/ai/conversations");
    redirect(`/ai/conversations/${data.id}`);
  } catch (error) {
    return toState(error);
  }
}

export async function sendAiMessageAction(_: AiActionState, formData: FormData): Promise<AiActionState> {
  try {
    const parsed = sendAiMessageSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Enter a message." };
    }

    const { clinicId } = await getAiActionContext(false);
    const settings = await getSettings(clinicId);

    if (settings && !settings.ai_enabled) {
      return { message: "AI assistant is disabled for this clinic." };
    }

    const supabase = await createSupabaseServerClient();
    const { data: conversation, error: conversationError } = await supabase
      .from("ai_conversations")
      .select("id, clinic_id")
      .eq("clinic_id", clinicId)
      .eq("id", parsed.data.conversationId)
      .single<{ id: string; clinic_id: string }>();

    if (conversationError || !conversation) {
      return { message: conversationError?.message ?? "Conversation not found." };
    }

    await insertMessage(conversation.id, clinicId, "user", parsed.data.content);

    let assistantContent: string;
    let metadata: Record<string, unknown> = {};

    if (hasEmergencyIntent(parsed.data.content)) {
      assistantContent =
        "This may be an emergency. Please contact local emergency services immediately or go to the nearest emergency room. I cannot provide medical diagnosis or emergency treatment advice.";
      metadata = { source: "emergency_safety_rule" };
    } else {
      const faqAnswer = await answerFromFAQ(clinicId, parsed.data.content);

      if (faqAnswer) {
        assistantContent = faqAnswer.answer;
        metadata = { source: "faq", faq_question: faqAnswer.question, score: faqAnswer.score };
      } else {
        const services = await searchServices(clinicId, parsed.data.content);
        const slots =
          services[0]
            ? await getAvailableSlots(clinicId, services[0].id, null, {
                startDate: new Date().toISOString().slice(0, 10),
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
              })
            : [];
        const recentMessagesResult = await supabase
          .from("ai_messages")
          .select("role, content")
          .eq("conversation_id", conversation.id)
          .eq("clinic_id", clinicId)
          .order("created_at", { ascending: true })
          .limit(20)
          .returns<{ role: "user" | "assistant" | "system" | "tool"; content: string }[]>();

        if (recentMessagesResult.error) {
          throw new Error(recentMessagesResult.error.message);
        }

        const provider = getAiProvider(settings?.ai_provider ?? "openai");
        const contextMessage = [
          services.length > 0 ? `Possible matching services: ${services.map((service) => `${service.name} (${service.duration_minutes} min)`).join(", ")}` : "",
          slots.length > 0 ? `Earliest available slots: ${slots.slice(0, 5).map((slot) => `${slot.startAt}${slot.doctorName ? ` with ${slot.doctorName}` : ""}`).join(", ")}` : ""
        ]
          .filter(Boolean)
          .join("\n");
        const response = await provider.generateReply({
          model: settings?.ai_model ?? "gpt-4o",
          systemPrompt: buildBookingSystemPrompt(settings),
          messages: [
            ...(contextMessage ? [{ role: "system" as const, content: contextMessage }] : []),
            ...(recentMessagesResult.data ?? []).map((message) => ({
              role: message.role === "tool" ? ("assistant" as const) : message.role,
              content: message.content
            }))
          ]
        });

        assistantContent = response.content;
        metadata = { source: provider.name, matched_services: services.map((service) => service.id), suggested_slots: slots.slice(0, 5) };
      }
    }

    await insertMessage(conversation.id, clinicId, "assistant", assistantContent, metadata);
    revalidatePath(`/ai/conversations/${conversation.id}`);
    return { success: true, message: "Message sent." };
  } catch (error) {
    return toState(error);
  }
}

export async function handoffConversationAction(_: AiActionState, formData: FormData): Promise<AiActionState> {
  try {
    const parsed = handoffConversationSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Enter a handoff reason." };
    }

    await getAiActionContext(false);
    await handoffToStaff(parsed.data.conversationId, parsed.data.reason);
    revalidatePath(`/ai/conversations/${parsed.data.conversationId}`);
    revalidatePath("/ai/conversations");
    return { success: true, message: "Conversation handed off to staff." };
  } catch (error) {
    return toState(error);
  }
}
