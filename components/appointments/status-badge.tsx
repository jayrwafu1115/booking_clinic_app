import { APPOINTMENT_STATUS_META } from "@/lib/constants/appointments";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/types/database";

export function AppointmentStatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  const meta = APPOINTMENT_STATUS_META[status];
  return <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", meta.className, className)}>{meta.label}</span>;
}
