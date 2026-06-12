import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { profileHasPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ResolvedDateRange } from "@/lib/utils/date-ranges";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ServiceStat = {
  serviceId: string;
  serviceName: string;
  count: number;
  revenueCentavos: number;
};

export type DoctorStat = {
  doctorId: string;
  doctorName: string;
  total: number;
  completed: number;
};

export type AppointmentReportData = {
  total: number;
  completed: number;
  confirmed: number;
  cancelled: number;
  noShow: number;
  booked: number;
  revenueCentavos: number;
  aiSourced: number;
  widgetSourced: number;
  manualSourced: number;
  newPatients: number;
  totalPatients: number;
  topServices: ServiceStat[];
  doctorStats: DoctorStat[];
  statusBreakdown: { name: string; count: number; fill: string }[];
  sourceBreakdown: { name: string; count: number }[];
};

export type AiReportData = {
  totalConversations: number;
  openConversations: number;
  bookedConversations: number;
  handoffConversations: number;
  closedConversations: number;
  bookingsGenerated: number;
  handoffRate: number;
  aiConversionRate: number;
  avgMessagesPerConversation: number;
  topMessageSources: { source: string; count: number }[];
};

export type ClinicReportResult = {
  appointments: AppointmentReportData;
  ai: AiReportData;
  dateRange: ResolvedDateRange;
};

// ─── Internal RPC shape ───────────────────────────────────────────────────────

type AppointmentStats = {
  total: number;
  completed: number;
  confirmed: number;
  cancelled: number;
  no_show: number;
  booked: number;
  revenue_centavos: number;
  ai_sourced: number;
  widget_sourced: number;
  manual_sourced: number;
  status_breakdown: { status: string; count: number }[];
  source_breakdown: { source: string; count: number }[];
  top_services: { service_id: string; service_name: string; count: number; revenue_centavos: number }[];
  doctor_stats: { doctor_id: string; doctor_name: string; total: number; completed: number }[];
};

const STATUS_COLORS: Record<string, string> = {
  booked: "#2563eb",
  confirmed: "#16a34a",
  checked_in: "#7c3aed",
  in_progress: "#0891b2",
  completed: "#64748b",
  cancelled: "#dc2626",
  no_show: "#ea580c"
};

// ─── Query ────────────────────────────────────────────────────────────────────

export async function getClinicReports(dateRange: ResolvedDateRange): Promise<ClinicReportResult | null> {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  if (!user || !profile?.clinic_id || !profileHasPermission(profile, "appointments:view_all")) {
    return null;
  }

  const clinicId = profile.clinic_id;
  const supabase = await createSupabaseServerClient();

  // All six queries run in parallel — no sequential awaits.
  const [
    statsResult,
    newPatientsResult,
    totalPatientsResult,
    conversationsResult,
    msgCountResult,
    msgMetaResult
  ] = await Promise.all([
    // DB-side aggregation replaces the previous 5 000-row raw fetch.
    supabase.rpc("get_clinic_appointment_stats", {
      p_clinic_id: clinicId,
      p_start_at: dateRange.start,
      p_end_at: dateRange.end
    }),

    supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .gte("created_at", dateRange.start)
      .lt("created_at", dateRange.end),

    supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId),

    supabase
      .from("ai_conversations")
      .select("id, status, metadata")
      .eq("clinic_id", clinicId)
      .gte("created_at", dateRange.start)
      .lt("created_at", dateRange.end)
      .limit(2000)
      .returns<{ id: string; status: string; metadata: Record<string, unknown> }[]>(),

    // These two were previously sequential — now parallel.
    supabase
      .from("ai_messages")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .gte("created_at", dateRange.start)
      .lt("created_at", dateRange.end),

    supabase
      .from("ai_messages")
      .select("metadata")
      .eq("clinic_id", clinicId)
      .eq("role", "assistant")
      .gte("created_at", dateRange.start)
      .lt("created_at", dateRange.end)
      .limit(2000)
      .returns<{ metadata: Record<string, unknown> }[]>()
  ]);

  const stats = statsResult.data as AppointmentStats | null;
  if (!stats) return null;

  // ── Conversation stats ──────────────────────────────────────────────────────
  const conversations = conversationsResult.data ?? [];
  const byConvStatus = conversations.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalConversations = conversations.length;
  const bookedConversations = byConvStatus["booked"] ?? 0;
  const handoffConversations = byConvStatus["handoff"] ?? 0;

  const avgMessages =
    totalConversations > 0
      ? Math.round(((msgCountResult.count ?? 0) / totalConversations) * 10) / 10
      : 0;

  const sourceCount: Record<string, number> = {};
  for (const row of msgMetaResult.data ?? []) {
    const src = String(row.metadata?.source ?? "other");
    sourceCount[src] = (sourceCount[src] ?? 0) + 1;
  }

  const topMessageSources = Object.entries(sourceCount)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const handoffRate =
    totalConversations > 0 ? Math.round((handoffConversations / totalConversations) * 1000) / 10 : 0;
  const aiConversionRate =
    totalConversations > 0 ? Math.round((bookedConversations / totalConversations) * 1000) / 10 : 0;

  // ── Map RPC results to exported types ──────────────────────────────────────
  const statusBreakdown = (stats.status_breakdown ?? []).map(({ status, count }) => ({
    name: status.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
    count,
    fill: STATUS_COLORS[status] ?? "#94a3b8"
  }));

  const sourceBreakdown = (stats.source_breakdown ?? []).map(({ source, count }) => ({
    name: source.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
    count
  }));

  const topServices: ServiceStat[] = (stats.top_services ?? []).map((s) => ({
    serviceId: s.service_id,
    serviceName: s.service_name,
    count: s.count,
    revenueCentavos: s.revenue_centavos
  }));

  const doctorStats: DoctorStat[] = (stats.doctor_stats ?? []).map((d) => ({
    doctorId: d.doctor_id,
    doctorName: d.doctor_name,
    total: d.total,
    completed: d.completed
  }));

  return {
    appointments: {
      total: stats.total,
      completed: stats.completed,
      confirmed: stats.confirmed,
      cancelled: stats.cancelled,
      noShow: stats.no_show,
      booked: stats.booked,
      revenueCentavos: stats.revenue_centavos,
      aiSourced: stats.ai_sourced,
      widgetSourced: stats.widget_sourced,
      manualSourced: stats.manual_sourced,
      newPatients: newPatientsResult.count ?? 0,
      totalPatients: totalPatientsResult.count ?? 0,
      topServices,
      doctorStats,
      statusBreakdown,
      sourceBreakdown
    },
    ai: {
      totalConversations,
      openConversations: byConvStatus["open"] ?? 0,
      bookedConversations,
      handoffConversations,
      closedConversations: byConvStatus["closed"] ?? 0,
      bookingsGenerated: bookedConversations,
      handoffRate,
      aiConversionRate,
      avgMessagesPerConversation: avgMessages,
      topMessageSources
    },
    dateRange
  };
}
