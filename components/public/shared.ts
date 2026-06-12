import type { ClinicType } from "@/types/database";
import type { PublicClinicSite } from "@/server/queries/public";

export const CLINIC_TYPE_LABELS: Record<ClinicType, string> = {
  medical: "Medical Clinic",
  dental: "Dental Clinic",
  aesthetic: "Aesthetic Clinic",
  physiotherapy: "Physiotherapy Clinic",
  diagnostic: "Diagnostic Center",
  wellness: "Wellness Center",
  other: "Clinic"
};

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function formatAddress(clinic: PublicClinicSite["clinic"]) {
  return [
    clinic.address_line_1,
    clinic.address_line_2,
    clinic.barangay,
    clinic.city,
    clinic.province,
    clinic.postal_code
  ]
    .filter(Boolean)
    .join(", ");
}

/** "08:00:00" → "8:00 AM" */
export function formatTime(time: string | null) {
  if (!time) return "";
  const [hourRaw, minute] = time.split(":");
  const hour = Number(hourRaw);
  const period = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${minute} ${period}`;
}
