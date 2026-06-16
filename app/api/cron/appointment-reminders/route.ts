import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendAppointmentEmailById } from "@/lib/notifications/send-appointment-email";

// Triggered by Vercel Cron Jobs once per hour (defined in vercel.json).
// Vercel automatically sends: Authorization: Bearer <CRON_SECRET>
// Set CRON_SECRET in the Vercel project environment variables to secure this endpoint.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createSupabaseAdminClient();

  // Target window: appointments starting 23–25 hours from now (catches hourly cron runs).
  const now = Date.now();
  const windowStart = new Date(now + 23 * 60 * 60 * 1000).toISOString();
  const windowEnd   = new Date(now + 25 * 60 * 60 * 1000).toISOString();

  const { data: appointments, error: apptError } = await supabase
    .from("appointments")
    .select("id")
    .in("status", ["booked", "confirmed"])
    .gte("start_at", windowStart)
    .lte("start_at", windowEnd)
    .returns<{ id: string }[]>();

  if (apptError) {
    console.error("[cron/reminders] Query failed:", apptError.message);
    return NextResponse.json({ error: apptError.message }, { status: 500 });
  }

  if (!appointments?.length) {
    return NextResponse.json({ sent: 0, skipped: 0, message: "No appointments in reminder window." });
  }

  const ids = appointments.map((a) => a.id);

  // Skip appointments that already have a sent reminder notification.
  const { data: existing } = await supabase
    .from("appointment_notifications")
    .select("appointment_id")
    .in("appointment_id", ids)
    .eq("notification_type", "appointment_reminder")
    .eq("status", "sent")
    .returns<{ appointment_id: string }[]>();

  const alreadySent = new Set((existing ?? []).map((r) => r.appointment_id));
  const pending = ids.filter((id) => !alreadySent.has(id));

  let sent = 0;
  for (const id of pending) {
    await sendAppointmentEmailById(id, "appointment_reminder");
    sent++;
  }

  console.log(`[cron/reminders] Sent ${sent} reminders, skipped ${ids.length - pending.length} already sent.`);
  return NextResponse.json({ sent, skipped: ids.length - pending.length });
}
