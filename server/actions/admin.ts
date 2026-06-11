"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/server/audit/create-audit-log";

type AdminActionState = { message?: string; success?: boolean };

async function requireSuperAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin" || profile.status !== "active") {
    throw new Error("Super admin access required.");
  }
  return profile;
}

const updateSubscriptionSchema = z.object({
  clinicId: z.string().uuid(),
  planId: z.string().uuid().nullable(),
  status: z.enum(["trial", "active", "past_due", "cancelled", "suspended"]),
  trialEndsAt: z.string().optional().transform((v) => v || null),
  periodStart: z.string().optional().transform((v) => v || null),
  periodEnd: z.string().optional().transform((v) => v || null),
});

export async function updateClinicSubscriptionAction(
  _: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const actor = await requireSuperAdmin();

    const raw = {
      clinicId: formData.get("clinicId"),
      planId: formData.get("planId") || null,
      status: formData.get("status"),
      trialEndsAt: formData.get("trialEndsAt"),
      periodStart: formData.get("periodStart"),
      periodEnd: formData.get("periodEnd"),
    };

    const parsed = updateSubscriptionSchema.safeParse(raw);
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Invalid input." };
    }

    const { clinicId, planId, status, trialEndsAt, periodStart, periodEnd } = parsed.data;
    const supabase = await createSupabaseServerClient();

    const { data: existing } = await supabase
      .from("clinic_subscriptions")
      .select("id")
      .eq("clinic_id", clinicId)
      .maybeSingle<{ id: string }>();

    const payload = {
      clinic_id: clinicId,
      plan_id: planId,
      status,
      trial_ends_at: trialEndsAt,
      current_period_start: periodStart,
      current_period_end: periodEnd,
    };

    const { error } = existing
      ? await supabase.from("clinic_subscriptions").update(payload).eq("clinic_id", clinicId)
      : await supabase.from("clinic_subscriptions").insert(payload);

    if (error) return { message: error.message };

    await createAuditLog({
      clinicId,
      actorId: actor.id,
      action: "subscription.updated",
      entityType: "clinic_subscription",
      metadata: { status, plan_id: planId, updated_by: actor.full_name }
    });

    revalidatePath("/admin/subscriptions");
    return { success: true, message: `Subscription updated to ${status}.` };
  } catch (err) {
    return { message: err instanceof Error ? err.message : "Failed to update subscription." };
  }
}

export async function deleteClinicAction(
  _: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const actor = await requireSuperAdmin();
    const clinicId = z.string().uuid().parse(formData.get("id"));

    const admin = createSupabaseAdminClient();

    // Collect auth user IDs before cascade-deleting the clinic.
    const { data: profileRows } = await admin
      .from("profiles")
      .select("id")
      .eq("clinic_id", clinicId)
      .returns<{ id: string }[]>();

    // Deleting the clinic cascades to profiles, appointments, etc.
    const { error: deleteError } = await admin
      .from("clinics")
      .delete()
      .eq("id", clinicId);

    if (deleteError) return { message: deleteError.message };

    // Remove auth users that belonged to this clinic.
    for (const row of profileRows ?? []) {
      await admin.auth.admin.deleteUser(row.id);
    }

    await createAuditLog({
      clinicId,
      actorId: actor.id,
      action: "clinic.deleted",
      entityType: "clinic",
      entityId: clinicId,
      metadata: { deleted_by: actor.full_name, user_count: (profileRows ?? []).length }
    });

    revalidatePath("/admin/clinics");
  } catch (err) {
    return { message: err instanceof Error ? err.message : "Failed to delete clinic." };
  }

  redirect("/admin/clinics");
}
