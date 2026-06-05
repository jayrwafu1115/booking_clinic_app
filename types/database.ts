export type UserRole = "super_admin" | "clinic_owner" | "receptionist" | "doctor" | "staff";
export type AssignableUserRole = Exclude<UserRole, "super_admin">;
export type ClinicType = "medical" | "dental" | "aesthetic" | "physiotherapy" | "diagnostic" | "wellness" | "other";

export type Clinic = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  barangay: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  postal_code: string | null;
  country: "Philippines";
  timezone: "Asia/Manila";
  logo_url: string | null;
  primary_color: string;
  status: "active" | "inactive" | "suspended";
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  clinic_id: string | null;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  status: "active" | "inactive";
  deactivated_at: string | null;
  deactivated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ClinicSettings = {
  id: string;
  clinic_id: string;
  clinic_type: ClinicType;
  prc_number: string | null;
  ptr_number: string | null;
  tin: string | null;
  philhealth_accreditation_no: string | null;
  default_language: string;
  default_currency: "PHP";
  timezone: "Asia/Manila";
  created_at: string;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  clinic_id: string | null;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type UserInvite = {
  id: string;
  clinic_id: string;
  email: string;
  role: AssignableUserRole;
  token: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  invited_by: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
};
