export const APP_NAME = "Book Clinic PH";
export const DEFAULT_TIMEZONE = "Asia/Manila";
export const DEFAULT_COUNTRY = "Philippines";
export const DEFAULT_CURRENCY = "PHP";

export const FREE_TIER_MAX_PATIENTS = 10;
export const FREE_TIER_MAX_DOCTORS = 1;
export const FREE_TIER_MAX_SERVICES = 2;

export const CLINIC_TYPES = [
  "medical",
  "dental",
  "aesthetic",
  "physiotherapy",
  "diagnostic",
  "wellness",
  "other"
] as const;

export const USER_ROLES = ["super_admin", "clinic_owner", "receptionist", "doctor", "staff"] as const;
export const ASSIGNABLE_USER_ROLES = ["clinic_owner", "receptionist", "doctor", "staff"] as const;
