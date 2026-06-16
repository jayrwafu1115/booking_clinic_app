"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile, requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/server/audit/create-audit-log";

type PackageActionState = { message?: string; success?: boolean };

const packageSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().optional().transform((v) => v || null),
  sessionCount: z.coerce.number().int().positive().max(500),
  pricePesos: z.coerce.number().min(0).transform((v) => Math.round(v * 100)),
  validityDays: z.coerce.number().int().positive().default(365),
  active: z.enum(["on"]).optional().transform((v) => v === "on"),
});

const sellSchema = z.object({
  packageId: z.string().uuid(),
  patientId: z.string().uuid(),
  paidAmountPesos: z.coerce.number().min(0).transform((v) => Math.round(v * 100)),
  paymentMethod: z.enum(["cash", "gcash", "card", "bank_transfer", "philhealth", "hmo"]).optional().or(z.literal("")).transform((v) => v || null),
  notes: z.string().trim().optional().transform((v) => v || null),
});

async function getPkgContext() {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) throw new Error("No clinic profile.");
  assertPermission(profile, "packages:manage");
  return { user, profile, clinicId: profile.clinic_id };
}

export async function upsertPackageAction(_: PackageActionState, formData: FormData): Promise<PackageActionState> {
  try {
    const parsed = packageSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { message: parsed.error.errors[0]?.message ?? "Invalid package data." };

    const { user, clinicId } = await getPkgContext();
    const supabase = await createSupabaseServerClient();

    const payload = {
      clinic_id: clinicId,
      name: parsed.data.name,
      description: parsed.data.description,
      session_count: parsed.data.sessionCount,
      price_centavos: parsed.data.pricePesos,
      validity_days: parsed.data.validityDays,
      active: parsed.data.active,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = parsed.data.id
      ? await supabase.from("treatment_packages").update(payload).eq("clinic_id", clinicId).eq("id", parsed.data.id).select("id").single<{ id: string }>()
      : await supabase.from("treatment_packages").insert(payload).select("id").single<{ id: string }>();

    if (error || !data) return { message: error?.message ?? "Could not save package." };

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: parsed.data.id ? "package.updated" : "package.created",
      entityType: "treatment_package",
      entityId: data.id,
      metadata: { name: parsed.data.name },
    });

    revalidatePath("/packages");
    return { success: true, message: "Package saved." };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function sellPackageAction(_: PackageActionState, formData: FormData): Promise<PackageActionState> {
  try {
    const parsed = sellSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { message: parsed.error.errors[0]?.message ?? "Invalid data." };

    const { user, clinicId } = await getPkgContext();
    const supabase = await createSupabaseServerClient();

    const { data: pkg } = await supabase
      .from("treatment_packages")
      .select("session_count, validity_days")
      .eq("clinic_id", clinicId)
      .eq("id", parsed.data.packageId)
      .eq("active", true)
      .single<{ session_count: number; validity_days: number }>();

    if (!pkg) return { message: "Package not found or inactive." };

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + pkg.validity_days);

    const { data, error } = await supabase
      .from("patient_packages")
      .insert({
        clinic_id: clinicId,
        patient_id: parsed.data.patientId,
        package_id: parsed.data.packageId,
        expires_at: expiresAt.toISOString(),
        sessions_total: pkg.session_count,
        sessions_used: 0,
        status: "active",
        paid_amount_centavos: parsed.data.paidAmountPesos,
        payment_method: parsed.data.paymentMethod,
        notes: parsed.data.notes,
        created_by: user.id,
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !data) return { message: error?.message ?? "Could not sell package." };

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "patient_package.sold",
      entityType: "patient_package",
      entityId: data.id,
      metadata: { patient_id: parsed.data.patientId, package_id: parsed.data.packageId },
    });

    revalidatePath("/packages");
    return { success: true, message: "Package sold to patient." };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function redeemSessionAction(_: PackageActionState, formData: FormData): Promise<PackageActionState> {
  try {
    const schema = z.object({
      patientPackageId: z.string().uuid(),
      appointmentId: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
    });
    const parsed = schema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { message: "Invalid redemption data." };

    const { user, clinicId } = await getPkgContext();
    const supabase = await createSupabaseServerClient();

    const { data: pp } = await supabase
      .from("patient_packages")
      .select("sessions_total, sessions_used, status")
      .eq("clinic_id", clinicId)
      .eq("id", parsed.data.patientPackageId)
      .single<{ sessions_total: number; sessions_used: number; status: string }>();

    if (!pp) return { message: "Patient package not found." };
    if (pp.status !== "active") return { message: "This package is not active." };
    if (pp.sessions_used >= pp.sessions_total) return { message: "All sessions have been used." };

    const newUsed = pp.sessions_used + 1;
    const newStatus = newUsed >= pp.sessions_total ? "exhausted" : "active";

    await supabase
      .from("patient_packages")
      .update({ sessions_used: newUsed, status: newStatus, updated_at: new Date().toISOString() })
      .eq("clinic_id", clinicId)
      .eq("id", parsed.data.patientPackageId);

    await supabase.from("package_redemptions").insert({
      clinic_id: clinicId,
      patient_package_id: parsed.data.patientPackageId,
      appointment_id: parsed.data.appointmentId,
      created_by: user.id,
    });

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "package_session.redeemed",
      entityType: "patient_package",
      entityId: parsed.data.patientPackageId,
      metadata: { sessions_used: newUsed, sessions_total: pp.sessions_total },
    });

    revalidatePath("/packages");
    return { success: true, message: `Session redeemed. ${pp.sessions_total - newUsed} remaining.` };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Something went wrong." };
  }
}
