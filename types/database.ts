export type UserRole = "super_admin" | "clinic_owner" | "receptionist" | "doctor" | "staff";

export type Clinic = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  country: "Philippines";
  timezone: "Asia/Manila";
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
  created_at: string;
  updated_at: string;
};
