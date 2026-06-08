"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile, requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { getPhHolidays } from "@/lib/constants/ph-holidays";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { seedPhHolidaysSchema } from "@/lib/validations/settings";
import { createAuditLog } from "@/server/audit/create-audit-log";

type NotificationsActionState = {
  message?: string;
  success?: boolean;
  seeded?: number;
};

function toState(error: unknown): NotificationsActionState {
  if (error instanceof Error) return { message: error.message };
  return { message: "Something went wrong." };
}

// Imports Philippines national holidays for the given year into blocked_dates.
// Skips dates that already exist as holidays (matched by date + clinic_id + is_holiday).
// Clinic owners can edit or delete the imported entries afterwards.
export async function seedPhilippinesHolidaysAction(
  _: NotificationsActionState,
  formData: FormData
): Promise<NotificationsActionState> {
  try {
    const parsed = seedPhHolidaysSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Choose a valid year." };
    }

    const user = await requireUser();
    const profile = await getCurrentProfile();

    if (!profile?.clinic_id) {
      return { message: "A clinic profile is required." };
    }

    assertPermission(profile, "clinic_settings:update");

    const year = parsed.data.year;
    const holidays = getPhHolidays(year);

    if (holidays.length === 0) {
      return { message: `No holiday data available for ${year}.` };
    }

    const clinicId = profile.clinic_id;
    const supabase = await createSupabaseServerClient();

    // Find dates that are already seeded to avoid duplicates
    const startDate = `${year}-01-01T00:00:00+08:00`;
    const endDate = `${year}-12-31T23:59:59+08:00`;

    const { data: existing } = await supabase
      .from("blocked_dates")
      .select("start_at")
      .eq("clinic_id", clinicId)
      .eq("is_holiday", true)
      .gte("start_at", startDate)
      .lte("start_at", endDate);

    const existingDates = new Set((existing ?? []).map((row) => row.start_at.slice(0, 10)));

    const toInsert = holidays
      .filter((h) => !existingDates.has(h.date))
      .map((h) => ({
        clinic_id: clinicId,
        title: h.name,
        reason: h.type === "regular" ? "Regular Holiday" : h.type === "special_non_working" ? "Special Non-Working Day" : "Special Working Day",
        start_at: `${h.date}T00:00:00+08:00`,
        end_at: `${h.date}T23:59:59+08:00`,
        all_day: true,
        is_holiday: true
      }));

    if (toInsert.length === 0) {
      return { success: true, message: `Philippines holidays for ${year} are already imported.`, seeded: 0 };
    }

    const { error } = await supabase.from("blocked_dates").insert(toInsert);

    if (error) {
      return { message: error.message };
    }

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "blocked_dates.holidays_seeded",
      entityType: "blocked_dates",
      entityId: clinicId,
      metadata: { year, seeded: toInsert.length }
    });

    revalidatePath("/availability/blocked-dates");
    revalidatePath("/settings/audit-logs");
    return { success: true, message: `Imported ${toInsert.length} Philippines national holidays for ${year}.`, seeded: toInsert.length };
  } catch (error) {
    return toState(error);
  }
}
