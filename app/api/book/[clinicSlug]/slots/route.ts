import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AvailabilityRule, BlockedDate } from "@/types/database";

export const runtime = "nodejs";

// Returns available time slots for a clinic/doctor on a given date
export async function GET(req: NextRequest, { params }: { params: Promise<{ clinicSlug: string }> }) {
  const { clinicSlug } = await params;
  const { searchParams } = req.nextUrl;
  const date      = searchParams.get("date");      // YYYY-MM-DD
  const doctorId  = searchParams.get("doctorId");  // optional uuid
  const serviceId = searchParams.get("serviceId"); // uuid — for duration

  if (!date || !serviceId) {
    return NextResponse.json({ slots: [] }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // Get clinic
  const { data: clinic } = await supabase
    .from("clinics")
    .select("id")
    .eq("slug", clinicSlug)
    .eq("status", "active")
    .maybeSingle<{ id: string }>();

  if (!clinic) return NextResponse.json({ slots: [] });

  // Get service duration
  const { data: service } = await supabase
    .from("services")
    .select("duration_minutes")
    .eq("clinic_id", clinic.id)
    .eq("id", serviceId)
    .maybeSingle<{ duration_minutes: number }>();

  if (!service) return NextResponse.json({ slots: [] });

  // Get day of week for date (0=Sun, 6=Sat in Manila)
  const [yr, mo, dy] = date.split("-").map(Number);
  const dateObj = new Date(Date.UTC(yr, mo - 1, dy, 0, 0, 0));
  const dayOfWeek = new Date(`${date}T00:00:00+08:00`).getDay();

  // Get availability rule
  let ruleQuery = supabase
    .from("availability_rules")
    .select("*")
    .eq("clinic_id", clinic.id)
    .eq("day_of_week", dayOfWeek);

  if (doctorId) {
    ruleQuery = ruleQuery.or(`doctor_id.is.null,doctor_id.eq.${doctorId}`);
  } else {
    ruleQuery = ruleQuery.is("doctor_id", null);
  }

  const { data: rules } = await ruleQuery.returns<AvailabilityRule[]>();
  const rule = (doctorId ? rules?.find((r) => r.doctor_id === doctorId) : null) ?? rules?.find((r) => !r.doctor_id);

  if (!rule || !rule.is_open || !rule.open_time || !rule.close_time) {
    return NextResponse.json({ slots: [] });
  }

  // Check blocked dates
  const dayStartUtc = `${date}T00:00:00+08:00`;
  const dayEndUtc   = `${date}T23:59:59+08:00`;

  const { data: blocked } = await supabase
    .from("blocked_dates")
    .select("start_at, end_at")
    .eq("clinic_id", clinic.id)
    .lt("start_at", dayEndUtc)
    .gt("end_at", dayStartUtc)
    .returns<BlockedDate[]>();

  if ((blocked ?? []).length > 0) return NextResponse.json({ slots: [] });

  // Existing appointments for conflict checking
  const { data: existingAppts } = await supabase
    .from("appointments")
    .select("start_at, end_at")
    .eq("clinic_id", clinic.id)
    .in("status", ["booked", "confirmed", "checked_in", "in_progress"])
    .gte("start_at", dayStartUtc)
    .lte("end_at", dayEndUtc)
    .returns<{ start_at: string; end_at: string }[]>();

  // Generate slots
  const [openH, openM] = rule.open_time.slice(0, 5).split(":").map(Number);
  const [closeH, closeM] = rule.close_time.slice(0, 5).split(":").map(Number);
  const interval = rule.slot_interval_minutes;
  const duration = service.duration_minutes;

  const breakStart = rule.break_start?.slice(0, 5);
  const breakEnd   = rule.break_end?.slice(0, 5);

  const slots: string[] = [];
  let cur = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;

  while (cur + duration <= closeMin) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    const slotTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const slotEndMin = cur + duration;
    const slotEndTime = `${String(Math.floor(slotEndMin / 60)).padStart(2, "0")}:${String(slotEndMin % 60).padStart(2, "0")}`;

    // Check break overlap
    let inBreak = false;
    if (breakStart && breakEnd) {
      const bsMin = parseInt(breakStart.split(":")[0]) * 60 + parseInt(breakStart.split(":")[1]);
      const beMin = parseInt(breakEnd.split(":")[0]) * 60 + parseInt(breakEnd.split(":")[1]);
      if (cur < beMin && slotEndMin > bsMin) inBreak = true;
    }

    // Check existing appointment conflicts
    const slotUtcStart = new Date(`${date}T${slotTime}:00+08:00`).toISOString();
    const slotUtcEnd   = new Date(`${date}T${slotEndTime}:00+08:00`).toISOString();
    const hasConflict = (existingAppts ?? []).some(
      (a) => a.start_at < slotUtcEnd && a.end_at > slotUtcStart
    );

    if (!inBreak && !hasConflict) {
      slots.push(slotTime);
    }

    cur += interval;
  }

  return NextResponse.json({ slots });
}
