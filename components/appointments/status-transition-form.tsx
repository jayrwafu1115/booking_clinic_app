"use client";

import { useActionState } from "react";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { STATUS_TRANSITIONS, APPOINTMENT_STATUS_META } from "@/lib/constants/appointments";
import { updateAppointmentStatusAction } from "@/server/actions/appointments";
import type { AppointmentStatus } from "@/types/database";

export function StatusTransitionForm({ appointmentId, status }: { appointmentId: string; status: AppointmentStatus }) {
  const [state, formAction] = useActionState(updateAppointmentStatusAction, {});
  const transitions = STATUS_TRANSITIONS[status];

  if (transitions.length === 0) {
    return <p className="text-sm text-slate-500">No further status transitions are available.</p>;
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={appointmentId} />
      <AuthStatus message={state.message} success={state.success} />
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <select
          name="status"
          defaultValue={transitions[0]}
          className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-100"
        >
          {transitions.map((nextStatus) => (
            <option key={nextStatus} value={nextStatus}>
              {APPOINTMENT_STATUS_META[nextStatus].label}
            </option>
          ))}
        </select>
        <SubmitButton className="w-full sm:w-auto">Update status</SubmitButton>
      </div>
      <textarea
        name="cancellationReason"
        rows={3}
        placeholder="Cancellation reason, required when cancelling"
        className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </form>
  );
}
