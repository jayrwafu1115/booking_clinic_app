"use client";

import { useActionState } from "react";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveAvailabilityRulesAction } from "@/server/actions/core";
import type { AvailabilityRule, Doctor } from "@/types/database";

const days = [
  { index: 0, label: "Sunday" },
  { index: 1, label: "Monday" },
  { index: 2, label: "Tuesday" },
  { index: 3, label: "Wednesday" },
  { index: 4, label: "Thursday" },
  { index: 5, label: "Friday" },
  { index: 6, label: "Saturday" }
];

function defaultRule(dayOfWeek: number): Partial<AvailabilityRule> {
  const weekend = dayOfWeek === 0;
  return {
    day_of_week: dayOfWeek,
    is_open: !weekend,
    open_time: "09:00",
    close_time: "17:00",
    break_start: "12:00",
    break_end: "13:00",
    slot_interval_minutes: 30
  };
}

export function AvailabilityForm({
  doctors,
  rules,
  selectedDoctorId,
  canManage
}: {
  doctors: Doctor[];
  rules: AvailabilityRule[];
  selectedDoctorId: string;
  canManage: boolean;
}) {
  const [state, formAction] = useActionState(saveAvailabilityRulesAction, {});
  const scopedRules = rules.filter((rule) => (selectedDoctorId ? rule.doctor_id === selectedDoctorId : rule.doctor_id === null));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Availability</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" method="get">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Schedule scope
            <select
              name="doctorId"
              defaultValue={selectedDoctorId}
              className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-100 sm:w-80"
            >
              <option value="">Clinic-wide default</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.full_name}
                </option>
              ))}
            </select>
          </label>
          <button className="h-11 rounded-xl border border-border bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="submit">
            Load scope
          </button>
        </form>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="doctorId" value={selectedDoctorId} />
          <AuthStatus message={state.message} success={state.success} />
          <fieldset disabled={!canManage} className="space-y-3 disabled:opacity-70">
            {days.map((day) => {
              const rule = scopedRules.find((item) => item.day_of_week === day.index) ?? defaultRule(day.index);
              return (
                <div key={day.index} className="grid gap-3 rounded-2xl border border-border p-4 xl:grid-cols-[150px_110px_1fr] xl:items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{day.label}</p>
                    <input type="hidden" name={`rules.${day.index}.dayOfWeek`} value={day.index} />
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      name={`rules.${day.index}.isOpen`}
                      type="checkbox"
                      defaultChecked={rule.is_open ?? true}
                      className="rounded border-slate-300 text-blue-600"
                    />
                    Open
                  </label>
                  <div className="grid gap-3 sm:grid-cols-5">
                    <input
                      aria-label={`${day.label} open time`}
                      className="h-10 rounded-xl border border-input px-3 text-sm shadow-sm"
                      name={`rules.${day.index}.openTime`}
                      type="time"
                      defaultValue={rule.open_time ?? "09:00"}
                    />
                    <input
                      aria-label={`${day.label} close time`}
                      className="h-10 rounded-xl border border-input px-3 text-sm shadow-sm"
                      name={`rules.${day.index}.closeTime`}
                      type="time"
                      defaultValue={rule.close_time ?? "17:00"}
                    />
                    <input
                      aria-label={`${day.label} break start`}
                      className="h-10 rounded-xl border border-input px-3 text-sm shadow-sm"
                      name={`rules.${day.index}.breakStart`}
                      type="time"
                      defaultValue={rule.break_start ?? ""}
                    />
                    <input
                      aria-label={`${day.label} break end`}
                      className="h-10 rounded-xl border border-input px-3 text-sm shadow-sm"
                      name={`rules.${day.index}.breakEnd`}
                      type="time"
                      defaultValue={rule.break_end ?? ""}
                    />
                    <input
                      aria-label={`${day.label} slot interval`}
                      className="h-10 rounded-xl border border-input px-3 text-sm shadow-sm"
                      name={`rules.${day.index}.slotIntervalMinutes`}
                      type="number"
                      min={5}
                      step={5}
                      defaultValue={rule.slot_interval_minutes ?? 30}
                    />
                  </div>
                </div>
              );
            })}
          </fieldset>
          {canManage ? (
            <div className="flex justify-end">
              <SubmitButton className="w-full sm:w-auto">Save availability</SubmitButton>
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
