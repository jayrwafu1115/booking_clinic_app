"use client";

import { useActionState } from "react";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormField } from "@/components/core/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createBlockedDateAction } from "@/server/actions/core";
import type { Doctor } from "@/types/database";

export function BlockedDateForm({ doctors, canManage }: { doctors: Doctor[]; canManage: boolean }) {
  const [state, formAction] = useActionState(createBlockedDateAction, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Blocked Date</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <AuthStatus message={state.message} success={state.success} />
          </div>
          <fieldset disabled={!canManage} className="contents disabled:opacity-70">
            <FormField label="Doctor">
              <select
                name="doctorId"
                defaultValue=""
                className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-100"
              >
                <option value="">Clinic-wide closure</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.full_name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Title">
              <Input name="title" placeholder="Holiday, staff training, doctor leave..." required />
            </FormField>
            <FormField label="Start">
              <Input name="startAt" type="datetime-local" required />
            </FormField>
            <FormField label="End">
              <Input name="endAt" type="datetime-local" required />
            </FormField>
            <label className="flex h-11 items-center gap-3 rounded-xl border border-border px-3 text-sm font-medium text-slate-700">
              <input name="allDay" type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600" />
              All day
            </label>
            <div className="md:col-span-2">
              <FormField label="Reason">
                <textarea
                  name="reason"
                  rows={3}
                  className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </FormField>
            </div>
          </fieldset>
          {canManage ? (
            <div className="md:col-span-2 md:justify-self-end">
              <SubmitButton className="w-full sm:w-auto">Create blocked date</SubmitButton>
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
