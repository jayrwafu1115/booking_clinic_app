"use client";

import { useActionState } from "react";
import { addToQueueAction } from "@/server/actions/queue";
import { Button } from "@/components/ui/button";
import type { Doctor, Patient, Service } from "@/types/database";

export function AddToQueueForm({
  patients,
  doctors,
  services,
}: {
  patients: Pick<Patient, "id" | "full_name">[];
  doctors: Pick<Doctor, "id" | "full_name">[];
  services: Pick<Service, "id" | "name">[];
}) {
  const [state, formAction] = useActionState(addToQueueAction, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Patient name *</label>
        <input type="text" name="patientName" required placeholder="Full name (walk-in or registered)"
          className="h-10 w-full rounded-xl border border-input px-3 text-sm" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Registered patient</label>
        <select name="patientId" className="h-10 w-full rounded-xl border border-input px-3 text-sm">
          <option value="">— Optional —</option>
          {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Doctor</label>
        <select name="doctorId" className="h-10 w-full rounded-xl border border-input px-3 text-sm">
          <option value="">— Any —</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Service</label>
        <select name="serviceId" className="h-10 w-full rounded-xl border border-input px-3 text-sm">
          <option value="">— Any —</option>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Notes</label>
        <input type="text" name="notes" placeholder="Optional notes…"
          className="h-10 w-full rounded-xl border border-input px-3 text-sm" />
      </div>
      {state.message && (
        <p className={`text-sm ${state.success ? "text-green-700" : "text-red-600"}`}>{state.message}</p>
      )}
      <Button type="submit" className="w-full">Add to queue</Button>
    </form>
  );
}
