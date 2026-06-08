"use client";

import { useActionState } from "react";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SMS_PROVIDERS } from "@/lib/validations/settings";
import { updateNotificationPreferencesAction } from "@/server/actions/settings";
import { seedPhilippinesHolidaysAction } from "@/server/actions/notifications";
import { SUPPORTED_HOLIDAY_YEARS } from "@/lib/constants/ph-holidays";
import type { ClinicSettings } from "@/types/database";

function Toggle({
  name,
  label,
  description,
  defaultChecked,
  disabled
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start gap-4 rounded-xl border border-border p-4 transition-colors ${disabled ? "opacity-60" : "cursor-pointer hover:bg-slate-50"}`}>
      <div className="relative mt-0.5 flex h-5 w-9 shrink-0 items-center">
        <input
          type="checkbox"
          name={name}
          value="on"
          defaultChecked={defaultChecked}
          disabled={disabled}
          className="peer sr-only"
        />
        <div className="h-5 w-9 rounded-full bg-slate-200 transition-colors peer-checked:bg-blue-600 peer-disabled:opacity-50" />
        <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
    </label>
  );
}

export function NotificationPreferencesForm({
  settings,
  canEdit
}: {
  settings: ClinicSettings | null;
  canEdit: boolean;
}) {
  const [state, formAction] = useActionState(updateNotificationPreferencesAction, {});
  const [holidayState, holidayAction] = useActionState(seedPhilippinesHolidaysAction, {});

  const s = settings;

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-5">
        <AuthStatus message={state.message} success={state.success} />

        <fieldset disabled={!canEdit} className="space-y-5 disabled:opacity-70">
          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-500 mb-1">
                Emails are sent to the patient when their email address is on file.
                Uses Resend with the <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">RESEND_FROM_EMAIL</code> sender.
              </p>
              <Toggle
                name="notifyBookingConfirmation"
                label="Booking confirmation"
                description="Send an email immediately when a new appointment is booked via the widget or dashboard."
                defaultChecked={s?.notify_booking_confirmation ?? true}
              />
              <Toggle
                name="notifyAppointmentConfirmed"
                label="Appointment confirmed by clinic"
                description="Send an email when staff mark an appointment as confirmed."
                defaultChecked={s?.notify_appointment_confirmed ?? true}
              />
              <Toggle
                name="notifyAppointmentRescheduled"
                label="Appointment rescheduled"
                description="Send an email when an appointment is moved to a new date or time."
                defaultChecked={s?.notify_appointment_rescheduled ?? true}
              />
              <Toggle
                name="notifyAppointmentCancelled"
                label="Appointment cancelled"
                description="Send an email when an appointment is cancelled."
                defaultChecked={s?.notify_appointment_cancelled ?? true}
              />
              <Toggle
                name="notifyAppointmentReminder"
                label="Appointment reminder"
                description="Send a reminder email before the appointment. Requires a scheduled job to be configured."
                defaultChecked={s?.notify_appointment_reminder ?? false}
              />
            </CardContent>
          </Card>

          {/* Reminder Timing */}
          <Card>
            <CardHeader>
              <CardTitle>Reminder Timing</CardTitle>
            </CardHeader>
            <CardContent className="max-w-xs space-y-3">
              <p className="text-sm text-slate-500">
                How many hours before the appointment should the reminder email be sent.
              </p>
              <div className="space-y-2">
                <Label htmlFor="reminderHoursBefore">Hours before appointment</Label>
                <Input
                  id="reminderHoursBefore"
                  name="reminderHoursBefore"
                  type="number"
                  min={1}
                  max={168}
                  defaultValue={s?.reminder_hours_before ?? 24}
                />
                <p className="text-xs text-slate-400">
                  Reminders require a cron job via Supabase pg_cron, Vercel Cron, or a queue.
                  {/* TODO: Wire reminder sending to a scheduler (Phase 8). */}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* SMS Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>SMS Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-500">
                SMS notifications are prepared but not yet connected to a provider.
                Configure an SMS provider below and enable it when ready.
              </p>
              <Toggle
                name="smsEnabled"
                label="Enable SMS notifications"
                description="Send SMS to patients. Requires a configured SMS provider."
                defaultChecked={s?.sms_enabled ?? false}
              />
              <div className="space-y-2">
                <Label htmlFor="smsProvider">SMS provider</Label>
                <select
                  id="smsProvider"
                  name="smsProvider"
                  defaultValue={s?.sms_provider ?? ""}
                  className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-100"
                >
                  <option value="">— Not configured —</option>
                  {SMS_PROVIDERS.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider === "semaphore" ? "Semaphore (Philippines)" : provider === "twilio" ? "Twilio" : "Infobip"}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400">
                  Semaphore is recommended for Philippine mobile numbers.
                </p>
              </div>
            </CardContent>
          </Card>
        </fieldset>

        <div className="flex justify-end">
          {canEdit ? (
            <SubmitButton className="w-full sm:w-auto">Save notification preferences</SubmitButton>
          ) : null}
        </div>
      </form>

      {/* Philippines Holidays Import */}
      <Card>
        <CardHeader>
          <CardTitle>Philippines National Holidays</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            Import Philippines national holidays into your blocked dates. Existing holiday entries for that year
            are skipped. You can edit or remove them from the Availability &rarr; Blocked Dates page.
          </p>
          {holidayState.message && (
            <p className={`rounded-xl px-4 py-2.5 text-sm font-medium ${holidayState.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {holidayState.message}
            </p>
          )}
          {canEdit ? (
            <form action={holidayAction} className="flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <select
                  id="year"
                  name="year"
                  className="h-11 rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-100"
                >
                  {SUPPORTED_HOLIDAY_YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <SubmitButton className="border border-input bg-white text-slate-700 hover:bg-slate-50">Import holidays</SubmitButton>
            </form>
          ) : (
            <p className="text-sm text-slate-400">Clinic owners can import holidays.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
