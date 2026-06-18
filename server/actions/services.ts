"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile, requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { serviceSchema } from "@/lib/validations/core";
import { createAuditLog } from "@/server/audit/create-audit-log";
import { getClinicPlanFeatures } from "@/server/queries/billing";
import type { Permission } from "@/lib/auth/permissions";

type DrawerActionState = { message?: string; success?: boolean };

async function getActionContext(permission: Permission) {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) throw new Error("A clinic profile is required.");
  assertPermission(profile, permission);
  return { user, profile, clinicId: profile.clinic_id };
}

function toState(error: unknown): DrawerActionState {
  return { message: error instanceof Error ? error.message : "Something went wrong." };
}

export async function createServiceDrawerAction(
  _: DrawerActionState,
  formData: FormData
): Promise<DrawerActionState> {
  try {
    const parsed = serviceSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Please review the service form." };
    }

    const { user, clinicId } = await getActionContext("services:manage");
    const supabase = await createSupabaseServerClient();

    const [planFeatures, { count: serviceCount }] = await Promise.all([
      getClinicPlanFeatures(),
      supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .eq("active", true)
    ]);

    if (serviceCount !== null && serviceCount >= planFeatures.maxServices) {
      return {
        message: `Your plan allows a maximum of ${planFeatures.maxServices} services. Upgrade to Pro to add more.`
      };
    }

    const { data, error } = await supabase
      .from("services")
      .insert({
        clinic_id: clinicId,
        name: parsed.data.name,
        description: parsed.data.description,
        category: parsed.data.category,
        duration_minutes: parsed.data.durationMinutes,
        price_centavos: parsed.data.pricePesos,
        color: parsed.data.color,
        icon: parsed.data.icon,
        image_url: parsed.data.imageUrl,
        online_booking_enabled: parsed.data.onlineBookingEnabled,
        active: parsed.data.active
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !data) return { message: error?.message ?? "Could not create service." };

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "service.created",
      entityType: "service",
      entityId: data.id,
      metadata: { name: parsed.data.name, price_centavos: parsed.data.pricePesos }
    });

    revalidatePath("/services");
    return { success: true, message: "Service created successfully." };
  } catch (error) {
    return toState(error);
  }
}

export async function updateServiceDrawerAction(
  _: DrawerActionState,
  formData: FormData
): Promise<DrawerActionState> {
  try {
    const parsed = serviceSchema.required({ id: true }).safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: parsed.error.errors[0]?.message ?? "Please review the service form." };
    }

    const { user, clinicId } = await getActionContext("services:manage");
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("services")
      .update({
        name: parsed.data.name,
        description: parsed.data.description,
        category: parsed.data.category,
        duration_minutes: parsed.data.durationMinutes,
        price_centavos: parsed.data.pricePesos,
        color: parsed.data.color,
        icon: parsed.data.icon,
        image_url: parsed.data.imageUrl,
        online_booking_enabled: parsed.data.onlineBookingEnabled,
        active: parsed.data.active
      })
      .eq("clinic_id", clinicId)
      .eq("id", parsed.data.id);

    if (error) return { message: error.message };

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: "service.updated",
      entityType: "service",
      entityId: parsed.data.id,
      metadata: { name: parsed.data.name, price_centavos: parsed.data.pricePesos }
    });

    revalidatePath("/services");
    return { success: true, message: "Changes saved." };
  } catch (error) {
    return toState(error);
  }
}
