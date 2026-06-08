"use client";

import { useActionState, useState } from "react";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormField } from "@/components/core/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createServiceAction, updateServiceAction } from "@/server/actions/core";
import type { Service } from "@/types/database";

export function ServiceForm({ service }: { service?: Service | null }) {
  const action = service ? updateServiceAction : createServiceAction;
  const [state, formAction] = useActionState(action, {});
  const [color, setColor] = useState(service?.color ?? "#2563EB");

  return (
    <form action={formAction} className="space-y-5">
      {service ? <input type="hidden" name="id" value={service.id} /> : null}
      <AuthStatus message={state.message} success={state.success} />
      <Card>
        <CardHeader>
          <CardTitle>Service Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField label="Name">
            <Input name="name" defaultValue={service?.name ?? ""} required />
          </FormField>
          <FormField label="Category">
            <Input name="category" defaultValue={service?.category ?? ""} placeholder="Dental, Medical, Aesthetic..." />
          </FormField>
          <FormField label="Duration minutes">
            <Input name="durationMinutes" type="number" min={1} defaultValue={service?.duration_minutes ?? 30} required />
          </FormField>
          <FormField label="Price (PHP)">
            <Input name="pricePesos" type="number" min={0} step="0.01" defaultValue={service ? (service.price_centavos / 100).toFixed(2) : "0.00"} />
          </FormField>
          <FormField label="Color">
            <div className="flex gap-3">
              <Input className="w-16 p-1" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
              <Input name="color" value={color} onChange={(event) => setColor(event.target.value)} required />
            </div>
          </FormField>
          <FormField label="Icon">
            <Input name="icon" defaultValue={service?.icon ?? ""} placeholder="stethoscope, tooth, sparkle..." />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Description">
              <textarea
                name="description"
                defaultValue={service?.description ?? ""}
                rows={4}
                className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </FormField>
          </div>
          <label className="flex h-11 items-center gap-3 rounded-xl border border-border px-3 text-sm font-medium text-slate-700">
            <input
              name="onlineBookingEnabled"
              type="checkbox"
              defaultChecked={service?.online_booking_enabled ?? true}
              className="rounded border-slate-300 text-blue-600"
            />
            Online booking enabled
          </label>
          <label className="flex h-11 items-center gap-3 rounded-xl border border-border px-3 text-sm font-medium text-slate-700">
            <input name="active" type="checkbox" defaultChecked={service?.active ?? true} className="rounded border-slate-300 text-blue-600" />
            Active
          </label>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <SubmitButton className="w-full sm:w-auto">{service ? "Save service" : "Create service"}</SubmitButton>
      </div>
    </form>
  );
}
