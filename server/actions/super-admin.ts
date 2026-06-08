"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/session";
import { setClinicStatusAdmin } from "@/server/queries/super-admin";

export async function setClinicStatusAction(
  clinicId: string,
  status: "active" | "inactive" | "suspended"
): Promise<{ success: boolean; error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin" || profile.status !== "active") {
    return { success: false, error: "Forbidden" };
  }

  const ok = await setClinicStatusAdmin(clinicId, status);
  if (!ok) return { success: false, error: "Failed to update clinic status" };

  revalidatePath("/admin/clinics");
  revalidatePath(`/admin/clinics/${clinicId}`);
  return { success: true };
}
