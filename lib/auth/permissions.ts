import type { AssignableUserRole, Profile, UserRole } from "@/types/database";

export type Permission =
  | "clinic_settings:view"
  | "clinic_settings:update"
  | "team:view"
  | "team:invite"
  | "team:update_role"
  | "team:deactivate"
  | "billing:view"
  | "audit_logs:view"
  | "appointments:view_all"
  | "appointments:view_assigned"
  | "appointments:manage"
  | "patients:view_related"
  | "patients:view"
  | "patients:manage"
  | "doctors:view"
  | "doctors:manage"
  | "services:view"
  | "services:manage"
  | "availability:view"
  | "availability:manage"
  | "ai:view"
  | "ai:manage";

const rolePermissions: Record<UserRole, Permission[]> = {
  super_admin: [
    "clinic_settings:view",
    "clinic_settings:update",
    "team:view",
    "team:invite",
    "team:update_role",
    "team:deactivate",
    "billing:view",
    "audit_logs:view",
    "appointments:view_all",
    "appointments:view_assigned",
    "appointments:manage",
    "patients:view_related",
    "patients:view",
    "patients:manage",
    "doctors:view",
    "doctors:manage",
    "services:view",
    "services:manage",
    "availability:view",
    "availability:manage",
    "ai:view",
    "ai:manage"
  ],
  clinic_owner: [
    "clinic_settings:view",
    "clinic_settings:update",
    "team:view",
    "team:invite",
    "team:update_role",
    "team:deactivate",
    "billing:view",
    "audit_logs:view",
    "appointments:view_all",
    "appointments:manage",
    "patients:view_related",
    "patients:view",
    "patients:manage",
    "doctors:view",
    "doctors:manage",
    "services:view",
    "services:manage",
    "availability:view",
    "availability:manage",
    "ai:view",
    "ai:manage"
  ],
  receptionist: [
    "clinic_settings:view",
    "appointments:view_all",
    "appointments:manage",
    "patients:view_related",
    "patients:view",
    "patients:manage",
    "doctors:view",
    "services:view",
    "availability:view",
    "ai:view"
  ],
  doctor: ["appointments:view_assigned", "patients:view_related", "patients:view", "doctors:view", "services:view", "availability:view", "ai:view"],
  staff: ["clinic_settings:view", "appointments:view_all", "patients:view", "doctors:view", "services:view", "availability:view", "ai:view"]
};

export const assignableRoles: AssignableUserRole[] = ["clinic_owner", "receptionist", "doctor", "staff"];

export function isAssignableRole(role: string): role is AssignableUserRole {
  return assignableRoles.includes(role as AssignableUserRole);
}

export function hasPermission(role: UserRole | null | undefined, permission: Permission) {
  if (!role) {
    return false;
  }

  return rolePermissions[role]?.includes(permission) ?? false;
}

export function profileHasPermission(profile: Pick<Profile, "role" | "status"> | null | undefined, permission: Permission) {
  if (!profile || profile.status !== "active") {
    return false;
  }

  return hasPermission(profile.role, permission);
}

export function canManageClinicSettings(profile: Pick<Profile, "role" | "status"> | null | undefined) {
  return profileHasPermission(profile, "clinic_settings:update");
}

export function canManageUsers(profile: Pick<Profile, "role" | "status"> | null | undefined) {
  return (
    profileHasPermission(profile, "team:invite") &&
    profileHasPermission(profile, "team:update_role") &&
    profileHasPermission(profile, "team:deactivate")
  );
}

export function assertPermission(profile: Pick<Profile, "role" | "status"> | null | undefined, permission: Permission) {
  if (!profileHasPermission(profile, permission)) {
    throw new Error("You do not have permission to perform this action.");
  }
}
