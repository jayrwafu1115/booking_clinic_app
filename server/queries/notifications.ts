import { getCurrentProfile } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type NotificationItem = {
  id: string;
  notification_type: string;
  channel: string;
  recipient: string;
  status: "pending" | "sent" | "failed";
  created_at: string;
  patient_name: string | null;
  appointment_start: string | null;
};

export async function getRecentNotifications(): Promise<NotificationItem[]> {
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) return [];

  const supabase = await createSupabaseServerClient();

  type Row = {
    id: string;
    notification_type: string;
    channel: string;
    recipient: string;
    status: "pending" | "sent" | "failed";
    created_at: string;
    appointments: {
      start_at: string;
      patients: { full_name: string } | null;
    } | null;
  };

  const { data } = await supabase
    .from("appointment_notifications")
    .select("id, notification_type, channel, recipient, status, created_at, appointments(start_at, patients(full_name))")
    .eq("clinic_id", profile.clinic_id)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<Row[]>();

  return (data ?? []).map((r) => ({
    id: r.id,
    notification_type: r.notification_type,
    channel: r.channel,
    recipient: r.recipient,
    status: r.status,
    created_at: r.created_at,
    patient_name: r.appointments?.patients?.full_name ?? null,
    appointment_start: r.appointments?.start_at ?? null,
  }));
}
