import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Props = { params: Promise<{ token: string }> };

type AppointmentRow = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  patients: { full_name: string } | null;
  services: { name: string } | null;
  clinics: { name: string } | null;
};

export async function GET(_req: Request, { params }: Props) {
  const { token } = await params;

  const supabase = createSupabaseAdminClient();

  // Look up the doctor by ical_token
  const { data: doctor } = await supabase
    .from("doctors")
    .select("id, full_name, clinic_id, ical_token")
    .eq("ical_token", token)
    .maybeSingle<{ id: string; full_name: string; clinic_id: string; ical_token: string }>();

  if (!doctor) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Fetch upcoming + recent appointments for this doctor
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, start_at, end_at, status, patients(full_name), services(name), clinics(name)")
    .eq("clinic_id", doctor.clinic_id)
    .eq("doctor_id", doctor.id)
    .gte("start_at", since)
    .not("status", "in", '("cancelled","no_show")')
    .order("start_at", { ascending: true })
    .limit(500)
    .returns<AppointmentRow[]>();

  const appts = appointments ?? [];
  const clinicName = appts[0]?.clinics?.name ?? "Book Clinic PH";

  const ical = buildIcal({
    calendarName: `${doctor.full_name} — ${clinicName}`,
    appointments: appts,
  });

  return new NextResponse(ical, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="appointments.ics"`,
      "Cache-Control": "no-store",
    },
  });
}

function icalDate(iso: string): string {
  // Convert to UTC compact format: 20250615T090000Z
  return iso.replace(/[-:]/g, "").replace(/\.\d+/, "").replace(" ", "T");
}

function icalEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function buildIcal(opts: {
  calendarName: string;
  appointments: AppointmentRow[];
}): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Book Clinic PH//Appointments//EN",
    `X-WR-CALNAME:${icalEscape(opts.calendarName)}`,
    "X-WR-TIMEZONE:Asia/Manila",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const appt of opts.appointments) {
    const summary = [appt.services?.name, appt.patients?.full_name]
      .filter(Boolean)
      .join(" — ");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${appt.id}@bookclinicph`,
      `DTSTAMP:${icalDate(new Date().toISOString())}`,
      `DTSTART:${icalDate(appt.start_at)}`,
      `DTEND:${icalDate(appt.end_at)}`,
      `SUMMARY:${icalEscape(summary)}`,
      `STATUS:${appt.status === "completed" ? "COMPLETED" : "CONFIRMED"}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
