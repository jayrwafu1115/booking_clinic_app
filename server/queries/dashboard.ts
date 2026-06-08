import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getManilaDayRange, getManilaMonthRange } from "@/lib/utils/manila-time";
import type { AppointmentWithRelations } from "@/types/database";

export type DashboardMetrics = {
  appointmentsToday: number;
  upcomingAppointments: number;
  totalPatients: number;
  revenueThisMonthCentavos: number;
  noShowRate: number;
  cancellationRate: number;
  todayAppointments: AppointmentWithRelations[];
};

function baseAppointmentSelect() {
  return `
    *,
    patients(id, full_name, phone, email),
    doctors(id, full_name, specialization),
    services(id, name, duration_minutes, price_centavos, color)
  `;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics | null> {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  if (!user || !profile?.clinic_id) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const today = getManilaDayRange();
  const month = getManilaMonthRange();
  const nowIso = new Date().toISOString();
  const upcomingEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    todayCountResult,
    upcomingCountResult,
    patientCountResult,
    monthAppointmentsResult,
    completedRevenueResult,
    todayAppointmentsResult
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", profile.clinic_id)
      .gte("start_at", today.start)
      .lt("start_at", today.end),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", profile.clinic_id)
      .gte("start_at", nowIso)
      .lt("start_at", upcomingEnd)
      .neq("status", "cancelled"),
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", profile.clinic_id),
    supabase
      .from("appointments")
      .select("status")
      .eq("clinic_id", profile.clinic_id)
      .gte("start_at", month.start)
      .lt("start_at", month.end)
      .returns<{ status: string }[]>(),
    supabase
      .from("appointments")
      .select("services(price_centavos)")
      .eq("clinic_id", profile.clinic_id)
      .eq("status", "completed")
      .gte("start_at", month.start)
      .lt("start_at", month.end)
      .returns<{ services: { price_centavos: number } | null }[]>(),
    supabase
      .from("appointments")
      .select(baseAppointmentSelect())
      .eq("clinic_id", profile.clinic_id)
      .gte("start_at", today.start)
      .lt("start_at", today.end)
      .order("start_at", { ascending: true })
      .limit(6)
      .returns<AppointmentWithRelations[]>()
  ]);

  const firstError =
    todayCountResult.error ??
    upcomingCountResult.error ??
    patientCountResult.error ??
    monthAppointmentsResult.error ??
    completedRevenueResult.error ??
    todayAppointmentsResult.error;

  if (firstError) {
    throw new Error(firstError.message);
  }

  const monthAppointments = monthAppointmentsResult.data ?? [];
  const denominator = monthAppointments.length || 1;
  const noShows = monthAppointments.filter((appointment) => appointment.status === "no_show").length;
  const cancellations = monthAppointments.filter((appointment) => appointment.status === "cancelled").length;
  const revenueThisMonthCentavos = (completedRevenueResult.data ?? []).reduce(
    (sum, row) => sum + (row.services?.price_centavos ?? 0),
    0
  );

  return {
    appointmentsToday: todayCountResult.count ?? 0,
    upcomingAppointments: upcomingCountResult.count ?? 0,
    totalPatients: patientCountResult.count ?? 0,
    revenueThisMonthCentavos,
    noShowRate: Math.round((noShows / denominator) * 1000) / 10,
    cancellationRate: Math.round((cancellations / denominator) * 1000) / 10,
    todayAppointments: todayAppointmentsResult.data ?? []
  };
}
