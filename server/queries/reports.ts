import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { profileHasPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ResolvedDateRange } from "@/lib/utils/date-ranges";

// ─── Clinic Reports ───────────────────────────────────────────────────────────

type AppointmentRow = {
  id: string;
  status: string;
  source: string;
  patient_id: string;
  doctor_id: string | null;
  service_id: string | null;
  start_at: string;
  services: { name: string; price_centavos: number } | null;
  doctors: { full_name: string } | null;
};

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

const STATUS_COLORS: Record<string, string> = {
  booked: "#2563eb",
  confirmed: "#16a34a",
  checked_in: "#7c3aed",
  in_progress: "#0891b2",
  completed: "#64748b",
  cancelled: "#dc2626",
  no_show: "#ea580c"
};

export async function getClinicReports(dateRange: ResolvedDateRange): Promise<ClinicReportResult | null> {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  if (!user || !profile?.clinic_id || !profileHasPermission(profile, "appointments:view_all")) {
    return null;
  }

  const clinicId = profile.clinic_id;
  const supabase = await createSupabaseServerClient();

  // Fetch all appointments in the date range with service + doctor info
  const [appointmentsResult, newPatientsResult, totalPatientsResult, conversationsResult] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, status, source, patient_id, doctor_id, service_id, start_at, services(name, price_centavos), doctors(full_name)")
      .eq("clinic_id", clinicId)
      .gte("start_at", dateRange.start)
      .lt("start_at", dateRange.end)
      .order("start_at", { ascending: true })
      .limit(5000)
      .returns<AppointmentRow[]>(),

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
      .returns<{ id: string; status: string; metadata: Record<string, unknown> }[]>()
  ]);

  const rows = appointmentsResult.data ?? [];

  // Status counts
  const byStatus = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  const completed = byStatus["completed"] ?? 0;
  const cancelled = byStatus["cancelled"] ?? 0;
  const noShow = byStatus["no_show"] ?? 0;
  const confirmed = byStatus["confirmed"] ?? 0;
  const booked = byStatus["booked"] ?? 0;

  // Revenue from completed appointments
  const revenueCentavos = rows
    .filter((row) => row.status === "completed" && row.services)
    .reduce((sum, row) => sum + (row.services?.price_centavos ?? 0), 0);

  // Source breakdown
  const bySource = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.source] = (acc[row.source] ?? 0) + 1;
    return acc;
  }, {});

  const aiSourced = (bySource["ai"] ?? 0) + (bySource["widget"] ?? 0);
  const widgetSourced = bySource["widget"] ?? 0;
  const manualSourced = bySource["manual"] ?? 0;

  // Top services
  const serviceMap = new Map<string, ServiceStat>();
  for (const row of rows) {
    if (!row.service_id || !row.services) continue;
    const existing = serviceMap.get(row.service_id);
    if (existing) {
      existing.count += 1;
      if (row.status === "completed") existing.revenueCentavos += row.services.price_centavos;
    } else {
      serviceMap.set(row.service_id, {
        serviceId: row.service_id,
        serviceName: row.services.name,
        count: 1,
        revenueCentavos: row.status === "completed" ? row.services.price_centavos : 0
      });
    }
  }
  const topServices = Array.from(serviceMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Doctor stats
  const doctorMap = new Map<string, DoctorStat>();
  for (const row of rows) {
    if (!row.doctor_id || !row.doctors) continue;
    const existing = doctorMap.get(row.doctor_id);
    if (existing) {
      existing.total += 1;
      if (row.status === "completed") existing.completed += 1;
    } else {
      doctorMap.set(row.doctor_id, {
        doctorId: row.doctor_id,
        doctorName: row.doctors.full_name,
        total: 1,
        completed: row.status === "completed" ? 1 : 0
      });
    }
  }
  const doctorStats = Array.from(doctorMap.values()).sort((a, b) => b.total - a.total);

  // Status breakdown for chart
  const statusBreakdown = Object.entries(byStatus)
    .map(([status, count]) => ({
      name: status.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
      count,
      fill: STATUS_COLORS[status] ?? "#94a3b8"
    }))
    .sort((a, b) => b.count - a.count);

  // Source breakdown for display
  const sourceBreakdown = Object.entries(bySource)
    .map(([source, count]) => ({
      name: source.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
      count
    }))
    .sort((a, b) => b.count - a.count);

  // AI conversation stats
  const conversations = conversationsResult.data ?? [];
  const byConvStatus = conversations.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  const bookedConversations = byConvStatus["booked"] ?? 0;
  const handoffConversations = byConvStatus["handoff"] ?? 0;
  const totalConversations = conversations.length;

  // Average messages per conversation — fetch from a count query
  let avgMessages = 0;
  if (totalConversations > 0) {
    const { count } = await supabase
      .from("ai_messages")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .gte("created_at", dateRange.start)
      .lt("created_at", dateRange.end);
    avgMessages = Math.round(((count ?? 0) / totalConversations) * 10) / 10;
  }

  // Top message sources (from metadata)
  const msgSourceCount: Record<string, number> = {};
  for (const conv of conversations) {
    const src = String((conv.metadata as Record<string, unknown>)?.booking_stage ?? "unknown");
    msgSourceCount[src] = (msgSourceCount[src] ?? 0) + 1;
  }

  // Fetch ai_messages metadata sources for this clinic+period to classify responses
  const { data: msgMetaRows } = await supabase
    .from("ai_messages")
    .select("metadata")
    .eq("clinic_id", clinicId)
    .eq("role", "assistant")
    .gte("created_at", dateRange.start)
    .lt("created_at", dateRange.end)
    .limit(2000)
    .returns<{ metadata: Record<string, unknown> }[]>();

  const sourceCount: Record<string, number> = {};
  for (const row of msgMetaRows ?? []) {
    const src = String(row.metadata?.source ?? "other");
    sourceCount[src] = (sourceCount[src] ?? 0) + 1;
  }

  const topMessageSources = Object.entries(sourceCount)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const handoffRate = totalConversations > 0 ? Math.round((handoffConversations / totalConversations) * 1000) / 10 : 0;
  const aiConversionRate = totalConversations > 0 ? Math.round((bookedConversations / totalConversations) * 1000) / 10 : 0;

  return {
    appointments: {
      total: rows.length,
      completed,
      confirmed,
      cancelled,
      noShow,
      booked,
      revenueCentavos,
      aiSourced,
      widgetSourced,
      manualSourced,
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
