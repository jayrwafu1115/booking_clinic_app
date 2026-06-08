import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PlatformMetrics = {
  total_clinics: number;
  active_clinics: number;
  inactive_clinics: number;
  suspended_clinics: number;
  trial_subscriptions: number;
  active_subscriptions: number;
  past_due_subscriptions: number;
  cancelled_subscriptions: number;
  total_users: number;
  total_appointments: number;
  total_ai_conversations: number;
  total_ai_messages: number;
};

export type AdminClinicRow = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  status: string;
  created_at: string;
  subscription_status: string;
  trial_ends_at: string | null;
  plan_name: string | null;
  user_count: number;
  appointment_count: number;
  ai_conversation_count: number;
};

export type AdminUserRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  clinic_id: string | null;
  clinic_name: string | null;
  created_at: string;
};

function isSuperAdmin(profile: { role: string; status: string } | null) {
  return profile?.role === "super_admin" && profile?.status === "active";
}

export async function getPlatformMetrics(): Promise<PlatformMetrics | null> {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  if (!user || !isSuperAdmin(profile)) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_platform_metrics");
  if (error || !data) return null;

  return data as PlatformMetrics;
}

export async function getAllClinicsAdmin(): Promise<AdminClinicRow[]> {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  if (!user || !isSuperAdmin(profile)) return [];

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("get_all_clinics_admin");
  return (data ?? []) as AdminClinicRow[];
}

export async function getAllUsersAdmin(): Promise<AdminUserRow[]> {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  if (!user || !isSuperAdmin(profile)) return [];

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, status, clinic_id, created_at, clinics(name)")
    .order("created_at", { ascending: false })
    .limit(500)
    .returns<
      {
        id: string;
        full_name: string;
        email: string;
        role: string;
        status: string;
        clinic_id: string | null;
        created_at: string;
        clinics: { name: string } | null;
      }[]
    >();

  return (data ?? []).map((row) => ({
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    role: row.role,
    status: row.status,
    clinic_id: row.clinic_id,
    clinic_name: row.clinics?.name ?? null,
    created_at: row.created_at
  }));
}

export type AdminAiUsageRow = {
  clinic_id: string;
  clinic_name: string;
  total_conversations: number;
  booked_conversations: number;
  handoff_conversations: number;
  total_messages: number;
};

export async function getAiUsageByClinic(): Promise<AdminAiUsageRow[]> {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  if (!user || !isSuperAdmin(profile)) return [];

  const supabase = await createSupabaseServerClient();

  const [convsResult, msgsResult] = await Promise.all([
    supabase
      .from("ai_conversations")
      .select("clinic_id, status, clinics(name)")
      .limit(10000)
      .returns<{ clinic_id: string; status: string; clinics: { name: string } | null }[]>(),
    supabase
      .from("ai_messages")
      .select("clinic_id", { count: "exact", head: false })
      .limit(1)
  ]);

  const convs = convsResult.data ?? [];
  const clinicMap = new Map<
    string,
    { clinic_name: string; total: number; booked: number; handoff: number }
  >();

  for (const conv of convs) {
    const existing = clinicMap.get(conv.clinic_id);
    const name = conv.clinics?.name ?? conv.clinic_id;
    if (existing) {
      existing.total += 1;
      if (conv.status === "booked") existing.booked += 1;
      if (conv.status === "handoff") existing.handoff += 1;
    } else {
      clinicMap.set(conv.clinic_id, {
        clinic_name: name,
        total: 1,
        booked: conv.status === "booked" ? 1 : 0,
        handoff: conv.status === "handoff" ? 1 : 0
      });
    }
  }

  // Fetch per-clinic message counts
  const msgRows = await supabase
    .from("ai_messages")
    .select("clinic_id")
    .limit(50000)
    .returns<{ clinic_id: string }[]>();

  const msgCount: Record<string, number> = {};
  for (const row of msgRows.data ?? []) {
    msgCount[row.clinic_id] = (msgCount[row.clinic_id] ?? 0) + 1;
  }

  return Array.from(clinicMap.entries())
    .map(([clinic_id, stats]) => ({
      clinic_id,
      clinic_name: stats.clinic_name,
      total_conversations: stats.total,
      booked_conversations: stats.booked,
      handoff_conversations: stats.handoff,
      total_messages: msgCount[clinic_id] ?? 0
    }))
    .sort((a, b) => b.total_conversations - a.total_conversations);
}

export async function getClinicDetailsAdmin(clinicId: string) {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  if (!user || !isSuperAdmin(profile)) return null;

  const supabase = await createSupabaseServerClient();

  const [clinicResult, subscriptionResult, settingsResult] = await Promise.all([
    supabase.from("clinics").select("*").eq("id", clinicId).single(),
    supabase
      .from("clinic_subscriptions")
      .select("*, subscription_plans(name, price_monthly_centavos)")
      .eq("clinic_id", clinicId)
      .maybeSingle(),
    supabase.from("clinic_settings").select("clinic_type, ai_enabled, ai_widget_enabled").eq("clinic_id", clinicId).maybeSingle()
  ]);

  return {
    clinic: clinicResult.data,
    subscription: subscriptionResult.data,
    settings: settingsResult.data
  };
}

export async function setClinicStatusAdmin(clinicId: string, status: "active" | "inactive" | "suspended"): Promise<boolean> {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  if (!user || !isSuperAdmin(profile)) return false;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("clinics").update({ status }).eq("id", clinicId);
  return !error;
}
