import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { profileHasPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AiConversation, AiConversationWithMessages, Clinic, ClinicSettings, FaqItem, Profile } from "@/types/database";

async function getAiContext() {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  if (!user || !profile?.clinic_id || !profileHasPermission(profile, "ai:view")) {
    return null;
  }

  return {
    user,
    profile,
    clinicId: profile.clinic_id,
    canManage: profileHasPermission(profile, "ai:manage")
  };
}

export async function getAiSettingsData(): Promise<{ profile: Profile; settings: ClinicSettings | null; canManage: boolean } | null> {
  const context = await getAiContext();
  if (!context) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clinic_settings")
    .select("*")
    .eq("clinic_id", context.clinicId)
    .maybeSingle<ClinicSettings>();

  if (error) {
    throw new Error(error.message);
  }

  return { profile: context.profile, settings: data, canManage: context.canManage };
}

export async function getFaqItemsData(): Promise<{ profile: Profile; items: FaqItem[]; canManage: boolean } | null> {
  const context = await getAiContext();
  if (!context) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("faq_items")
    .select("*")
    .eq("clinic_id", context.clinicId)
    .order("created_at", { ascending: false })
    .returns<FaqItem[]>();

  if (error) {
    throw new Error(error.message);
  }

  return { profile: context.profile, items: data ?? [], canManage: context.canManage };
}

export type AiConversationListItem = AiConversation & {
  patients: { id: string; full_name: string } | null;
};

export async function getAiConversationsData(params?: {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<{ profile: Profile; conversations: AiConversationListItem[]; canManage: boolean } | null> {
  const context = await getAiContext();
  if (!context) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("ai_conversations")
    .select("*, patients(id, full_name)")
    .eq("clinic_id", context.clinicId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (params?.dateFrom) {
    query = query.gte("created_at", `${params.dateFrom}T00:00:00+08:00`);
  }
  if (params?.dateTo) {
    query = query.lte("created_at", `${params.dateTo}T23:59:59+08:00`);
  }

  const { data, error } = await query.returns<AiConversationListItem[]>();

  if (error) {
    throw new Error(error.message);
  }

  let conversations = data ?? [];

  if (params?.search) {
    const q = params.search.toLowerCase();
    conversations = conversations.filter((c) =>
      c.patients?.full_name?.toLowerCase().includes(q) ||
      c.channel.toLowerCase().includes(q) ||
      c.status.toLowerCase().includes(q)
    );
  }

  return { profile: context.profile, conversations, canManage: context.canManage };
}

export async function getAiConversationData(id: string): Promise<{
  profile: Profile;
  conversation: AiConversationWithMessages;
  settings: ClinicSettings | null;
  canManage: boolean;
} | null> {
  const context = await getAiContext();
  if (!context) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const [conversationResult, settingsResult] = await Promise.all([
    supabase
      .from("ai_conversations")
      .select("*, patients(id, full_name, phone, email), ai_messages(*)")
      .eq("clinic_id", context.clinicId)
      .eq("id", id)
      .order("created_at", { referencedTable: "ai_messages", ascending: true })
      .single<AiConversationWithMessages>(),
    supabase.from("clinic_settings").select("*").eq("clinic_id", context.clinicId).maybeSingle<ClinicSettings>()
  ]);

  if (conversationResult.error || !conversationResult.data) {
    throw new Error(conversationResult.error?.message ?? "Conversation not found.");
  }

  if (settingsResult.error) {
    throw new Error(settingsResult.error.message);
  }

  return {
    profile: context.profile,
    conversation: conversationResult.data,
    settings: settingsResult.data,
    canManage: context.canManage
  };
}

export async function getAiWidgetEmbedData(): Promise<{
  profile: Profile;
  clinic: Pick<Clinic, "id" | "name" | "slug" | "logo_url" | "primary_color">;
  settings: ClinicSettings | null;
  canManage: boolean;
} | null> {
  const context = await getAiContext();
  if (!context) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const [clinicResult, settingsResult] = await Promise.all([
    supabase
      .from("clinics")
      .select("id, name, slug, logo_url, primary_color")
      .eq("id", context.clinicId)
      .single<Pick<Clinic, "id" | "name" | "slug" | "logo_url" | "primary_color">>(),
    supabase.from("clinic_settings").select("*").eq("clinic_id", context.clinicId).maybeSingle<ClinicSettings>()
  ]);

  if (clinicResult.error || !clinicResult.data) {
    throw new Error(clinicResult.error?.message ?? "Clinic not found.");
  }

  if (settingsResult.error) {
    throw new Error(settingsResult.error.message);
  }

  return {
    profile: context.profile,
    clinic: clinicResult.data,
    settings: settingsResult.data,
    canManage: context.canManage
  };
}
