import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { canManageClinicSettings, canManageUsers, profileHasPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuditLog, Clinic, ClinicSettings, Profile, UserInvite } from "@/types/database";

export type ClinicSettingsData = {
  profile: Profile;
  clinic: Clinic;
  settings: ClinicSettings | null;
  canEdit: boolean;
};

export type UsersSettingsData = {
  profile: Profile;
  users: Profile[];
  invites: UserInvite[];
  canManage: boolean;
};

export async function getClinicSettingsData(): Promise<ClinicSettingsData | null> {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  if (!user || !profile?.clinic_id) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const [clinicResult, settingsResult] = await Promise.all([
    supabase.from("clinics").select("*").eq("id", profile.clinic_id).single<Clinic>(),
    supabase.from("clinic_settings").select("*").eq("clinic_id", profile.clinic_id).maybeSingle<ClinicSettings>()
  ]);

  if (clinicResult.error || !clinicResult.data) {
    throw new Error(clinicResult.error?.message ?? "Clinic not found.");
  }

  if (settingsResult.error) {
    throw new Error(settingsResult.error.message);
  }

  return {
    profile,
    clinic: clinicResult.data,
    settings: settingsResult.data,
    canEdit: canManageClinicSettings(profile)
  };
}

export async function getUsersSettingsData(): Promise<UsersSettingsData | null> {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  if (!user || !profile?.clinic_id) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const [usersResult, invitesResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("clinic_id", profile.clinic_id).order("created_at").returns<Profile[]>(),
    supabase.from("user_invites").select("*").eq("clinic_id", profile.clinic_id).order("created_at", { ascending: false }).returns<UserInvite[]>()
  ]);

  if (usersResult.error) {
    throw new Error(usersResult.error.message);
  }

  if (invitesResult.error && canManageUsers(profile)) {
    throw new Error(invitesResult.error.message);
  }

  return {
    profile,
    users: usersResult.data ?? [],
    invites: canManageUsers(profile) ? invitesResult.data ?? [] : [],
    canManage: canManageUsers(profile)
  };
}

export async function getAuditLogsData(): Promise<{ profile: Profile; logs: AuditLog[]; canView: boolean } | null> {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  if (!user || !profile?.clinic_id) {
    return null;
  }

  const canView = profileHasPermission(profile, "audit_logs:view");
  if (!canView) {
    return { profile, logs: [], canView };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("clinic_id", profile.clinic_id)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<AuditLog[]>();

  if (error) {
    throw new Error(error.message);
  }

  return { profile, logs: data ?? [], canView };
}
