import type { AppointmentStatus, AppointmentSource } from "@/types/database";

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "booked",
  "confirmed",
  "checked_in",
  "in_progress",
  "completed",
  "cancelled",
  "no_show"
];

export const APPOINTMENT_SOURCES: AppointmentSource[] = ["manual", "widget", "ai", "phone", "walk_in"];

export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "booked",
  "confirmed",
  "checked_in",
  "in_progress",
  "completed",
  "no_show"
];

export const STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  booked: ["confirmed", "cancelled", "no_show"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["in_progress"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
  no_show: []
};

export const APPOINTMENT_STATUS_META: Record<AppointmentStatus, { label: string; color: string; className: string }> = {
  booked: { label: "Booked", color: "#2563EB", className: "bg-blue-50 text-blue-700" },
  confirmed: { label: "Confirmed", color: "#16A34A", className: "bg-green-50 text-green-700" },
  checked_in: { label: "Checked in", color: "#7C3AED", className: "bg-violet-50 text-violet-700" },
  in_progress: { label: "In progress", color: "#0891B2", className: "bg-cyan-50 text-cyan-700" },
  completed: { label: "Completed", color: "#64748B", className: "bg-slate-100 text-slate-600" },
  cancelled: { label: "Cancelled", color: "#DC2626", className: "bg-red-50 text-red-700" },
  no_show: { label: "No show", color: "#EA580C", className: "bg-orange-50 text-orange-700" }
};
