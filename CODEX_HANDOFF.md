# Codex Handoff

## Project

- Product: ClinicFlow AI PH
- Stack: Next.js 15 App Router, TypeScript, Tailwind CSS, Supabase, FullCalendar
- Current branch: `main`
- Current phase completed: Phase 7 - Philippines Localization + Resend Notifications

## Phase Completed

Phase 7 implements Philippines-specific clinic localization, Resend transactional email notifications, per-clinic notification preferences, an SMS provider abstraction, and Philippines national holiday seeding for blocked dates.

## Features Implemented

### Philippines Clinic Localization
- All Philippines-specific clinic fields already existed from Phase 2/4:
  - Clinic name, PRC number, PTR number, TIN, PhilHealth accreditation
  - Address line 1/2, Barangay, City/Municipality, Province, Region, Postal code
  - Contact number, Email
  - Default timezone locked to `Asia/Manila`, currency to `PHP`
- Phase 7 confirms these remain complete and tenant-isolated via `clinic_id`

### Resend Email Notifications
- `lib/notifications/resend.ts` — thin Resend SDK wrapper; server-only
- `lib/notifications/templates/index.ts` — clean HTML email templates for:
  - `booking_confirmation` — sent immediately when appointment is created
  - `appointment_confirmed` — sent when clinic marks appointment confirmed
  - `appointment_rescheduled` — sent after reschedule
  - `appointment_cancelled` — sent on cancellation, includes reason
  - `appointment_reminder` — reminder template (sending requires cron)
- `lib/notifications/send-appointment-email.ts`:
  - `sendAppointmentEmail()` — takes pre-loaded data, respects notification preferences, records in `appointment_notifications`
  - `sendAppointmentEmailById()` — convenience wrapper that fetches appointment+clinic+settings from DB, fire-and-forget (never throws)
- Emails are wired into:
  - `server/actions/appointments.ts` — create (booking_confirmation), reschedule (appointment_rescheduled), status confirmed/cancelled
  - `server/widget/chat.ts` — widget confirm_booking flow

### Notification Preferences
- New `clinic_settings` columns:
  - `notify_booking_confirmation` (default true)
  - `notify_appointment_confirmed` (default true)
  - `notify_appointment_rescheduled` (default true)
  - `notify_appointment_cancelled` (default true)
  - `notify_appointment_reminder` (default false)
  - `reminder_hours_before` (default 24, range 1–168)
  - `sms_enabled` (default false)
  - `sms_provider` (nullable: semaphore | twilio | infobip)
- `updateNotificationPreferencesAction` in `server/actions/settings.ts`
- Full settings UI at `/settings/notifications`
- Toggle switches for all email and SMS preference toggles
- Reminder timing input
- SMS provider selector

### SMS Placeholder
- `lib/notifications/sms/types.ts` — `SmsProvider`, `SmsNotificationParams`, `SmsSendResult`, `SmsProviderClient` types
- `lib/notifications/sms/index.ts` — `sendSmsNotification()` stub with TODO comments for Semaphore (PH), Twilio, Infobip
- Env var references documented in `.env.example`

### Philippines Holidays
- `lib/constants/ph-holidays.ts` — static list of national and special holidays for 2025 and 2026
  - `PhHoliday`, `PhHolidayType` types
  - `getPhHolidays(year)` helper
  - `SUPPORTED_HOLIDAY_YEARS` constant
- `server/actions/notifications.ts` — `seedPhilippinesHolidaysAction`:
  - Inserts holidays as `blocked_dates` with `is_holiday = true`
  - Deduplicates by date (skips already-imported entries)
  - Audited via `audit_logs`
- UI import button in the Notifications settings page

### Appointment Notifications Table
- `appointment_notifications` tracks every email/SMS send attempt
  - Fields: clinic_id, appointment_id, channel, notification_type, recipient, status (pending/sent/failed), error, metadata, sent_at
  - RLS: super admins manage all; clinic users can select own
- `appointment_notifications` updated with message_id on successful send

### Appointment Tracking Fields
- `appointments.confirmation_token` — unique UUID set automatically on insert (for future patient confirmation pages)
- `appointments.patient_notified_at` — stamped when first `booking_confirmation` email is sent successfully

### Blocked Dates Enhancement
- `blocked_dates.is_holiday` — boolean flag, default false

## Files Changed

- `CODEX_HANDOFF.md`
- `.env.example`
- `package.json` (added `resend`)
- `types/database.ts`
- `lib/validations/settings.ts`
- `lib/constants/ph-holidays.ts` (new)
- `lib/notifications/resend.ts` (new)
- `lib/notifications/templates/index.ts` (new)
- `lib/notifications/send-appointment-email.ts` (new)
- `lib/notifications/sms/types.ts` (new)
- `lib/notifications/sms/index.ts` (new)
- `server/actions/settings.ts`
- `server/actions/appointments.ts`
- `server/actions/notifications.ts` (new)
- `server/queries/settings.ts`
- `server/widget/chat.ts`
- `components/settings/notification-preferences-form.tsx` (new)
- `app/(dashboard)/settings/notifications/page.tsx`

## Supabase Migrations Added

- `supabase/migrations/202606090006_phase_7_notifications.sql`
  - Adds 8 notification preference columns to `clinic_settings`
  - Adds `confirmation_token`, `patient_notified_at` to `appointments`
  - Adds `is_holiday` to `blocked_dates`
  - Creates `appointment_notifications` table with RLS

## Environment Variables Added

New in `.env.example` (SMS providers — not yet active):
```
SEMAPHORE_API_KEY=
SEMAPHORE_SENDER_NAME=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_PHONE=
INFOBIP_BASE_URL=
INFOBIP_API_KEY=
INFOBIP_SENDER=
```

Existing variables used by Phase 7 (already in `.env.example`):
```
RESEND_API_KEY=
RESEND_FROM_EMAIL=
NEXT_PUBLIC_APP_URL=
```

## Commands Run

```bash
npm install resend
npm run lint       # ✔ No ESLint warnings or errors
npm run typecheck  # ✔ No TypeScript errors
```

## Known Issues

- **Appointment reminders require a scheduler.** The `notify_appointment_reminder` flag and `reminder_hours_before` preference are stored and respected by `sendAppointmentEmail()`, but no cron job is wired yet. Set up Supabase `pg_cron`, Vercel Cron, or a queue job that calls `sendAppointmentEmailById(id, "appointment_reminder")` for appointments due within `reminder_hours_before` hours.
- **SMS not yet implemented.** `sendSmsNotification()` is a no-op stub. Implement a concrete Semaphore/Twilio/Infobip client in `lib/notifications/sms/` when an SMS contract is in place.
- **Confirmation token page not built.** `appointments.confirmation_token` is generated and included in email links as `/confirm/{token}`, but the public patient page at `app/confirm/[token]/page.tsx` is not yet implemented. The URL appears in emails but leads to a 404 until Phase 8.
- **PH holiday dates for Islamic holidays (Eid)** use estimated dates. Confirm official proclamation dates each year and update `lib/constants/ph-holidays.ts`.
- **Rate limiter still in-memory.** Inherited from Phase 6. Move to Redis/Upstash for multi-instance production.
- **No automated test framework.** `npm test` is not configured.

## Next Recommended Phase Prompt

Phase 8 should implement the patient-facing confirmation portal and billing:

```txt
Continue from Phase 7. Implement the patient-facing appointment confirmation portal and PayMongo billing.

Patient portal:
- Public page at /confirm/[token] showing appointment details (no login required)
- Cancel appointment action via secure token
- Request-reschedule action (creates a note for staff)
- Audit log for patient-driven changes (actor_id = null, source = patient_portal)

PayMongo billing:
- Subscription plans page at /billing
- PayMongo checkout for clinic subscriptions (monthly/annual in PHP)
- GCash and credit card payment support
- Webhook handler for payment events
- Clinic status gating (active/trial/suspended) based on subscription
- Free trial countdown visible in the dashboard

Keep all data tenant-scoped. Preserve existing Phase 7 notification and widget flows.
Run lint, typecheck, and update CODEX_HANDOFF.md.
```
