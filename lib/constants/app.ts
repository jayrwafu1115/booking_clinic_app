export const APP_NAME = "ClinicFlow AI PH";
export const DEFAULT_TIMEZONE = "Asia/Manila";
export const DEFAULT_COUNTRY = "Philippines";
export const DEFAULT_CURRENCY = "PHP";
export const FREE_TRIAL_DAYS = Number(process.env.FREE_TRIAL_DAYS ?? 14);

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
