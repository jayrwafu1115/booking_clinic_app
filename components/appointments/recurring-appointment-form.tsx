"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { createRecurringAppointmentsAction } from "@/server/actions/appointments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Doctor, Patient, Service } from "@/types/database";

const FREQUENCIES = [
  { value: "daily",    label: "Daily" },
  { value: "weekly",   label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly",  label: "Monthly" },
];

export function RecurringAppointmentForm({
  patients,
  doctors,
  services,
}: {
  patients: Patient[];
  doctors: Doctor[];
  services: Service[];
}) {
  const [state, formAction] = useActionState(createRecurringAppointmentsAction, {});

  return (
    <form action={formAction} className="space-y-5">
      {state.message && (
        <div className={`rounded-xl px-4 py-3 text-sm ${state.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {state.message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Recurring Appointment
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Patient *</label>
            <select name="patientId" required className="h-11 w-full rounded-xl border border-input px-3 text-sm">
              <option value="">Select patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name} · {p.phone}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Doctor</label>
            <select name="doctorId" className="h-11 w-full rounded-xl border border-input px-3 text-sm">
              <option value="">No doctor assigned</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.full_name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Service *</label>
            <select name="serviceId" required className="h-11 w-full rounded-xl border border-input px-3 text-sm">
              <option value="">Select service</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name} · {s.duration_minutes} min</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">First appointment *</label>
            <input type="datetime-local" name="startAt" required className="h-11 w-full rounded-xl border border-input px-3 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Repeat *</label>
            <select name="frequency" defaultValue="weekly" className="h-11 w-full rounded-xl border border-input px-3 text-sm">
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Number of sessions *</label>
            <input type="number" name="sessionCount" min={2} max={52} defaultValue={4}
              className="h-11 w-full rounded-xl border border-input px-3 text-sm" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <textarea name="notes" rows={2}
              className="w-full rounded-xl border border-input px-3 py-2 text-sm" />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Create recurring series
      </Button>
    </form>
  );
}
