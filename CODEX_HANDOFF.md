# Codex Handoff

## Project

- Product: ClinicFlow AI PH
- Stack: Next.js 15 App Router, TypeScript, Tailwind CSS, Supabase, FullCalendar
- Current branch: `main`
- Current phase completed: Phase 4 - Appointment Booking Engine and Calendar

## Phase Completed

Phase 4 implements manual appointment booking, appointment lifecycle management, FullCalendar calendar views, drag-to-reschedule validation, and real dashboard metrics.

## Features Implemented

- Manual appointment creation and editing
- Server-side conflict checks for overlapping doctor appointments
- Service-duration-based appointment end times
- Availability rule checks for open hours and breaks
- Blocked date checks for clinic-wide and doctor-specific closures
- Appointment status lifecycle:
  - `booked -> confirmed`
  - `booked -> cancelled`
  - `confirmed -> checked_in`
  - `confirmed -> cancelled`
  - `checked_in -> in_progress`
  - `in_progress -> completed`
  - `booked/confirmed -> no_show`
- Appointment list with doctor, service, and status filters
- Appointment detail and edit pages
- FullCalendar day/week/month/list views
- Drag-and-drop appointment rescheduling with server validation
- Calendar filters by doctor, service, and status
- Status-based calendar colors
- Dashboard metrics from real clinic-scoped data:
  - Appointments today
  - Upcoming appointments
  - Total patients
  - Revenue this month from completed appointments
  - No-show rate
  - Cancellation rate

## Files Changed

- `package.json`
- `package-lock.json`
- `app/globals.css`
- `app/(dashboard)/appointments/page.tsx`
- `app/(dashboard)/appointments/new/page.tsx`
- `app/(dashboard)/appointments/[id]/page.tsx`
- `app/(dashboard)/appointments/[id]/edit/page.tsx`
- `app/(dashboard)/appointments/loading.tsx`
- `app/(dashboard)/calendar/page.tsx`
- `app/(dashboard)/calendar/loading.tsx`
- `app/(dashboard)/dashboard/page.tsx`
- `components/appointments/appointment-calendar.tsx`
- `components/appointments/appointment-form.tsx`
- `components/appointments/status-badge.tsx`
- `components/appointments/status-transition-form.tsx`
- `components/dashboard/dashboard-overview.tsx`
- `lib/auth/permissions.ts`
- `lib/constants/appointments.ts`
- `lib/utils/manila-time.ts`
- `lib/validations/core.ts`
- `server/actions/appointments.ts`
- `server/queries/appointments.ts`
- `server/queries/dashboard.ts`
- `types/database.ts`

## Supabase Tables/Migrations Added

- `supabase/migrations/202606080004_phase_4_appointments.sql`
- Adds `appointments`
- Adds updated-at trigger
- Adds indexes:
  - `appointments(clinic_id, start_at)`
  - `appointments(clinic_id, status)`
  - `appointments(clinic_id, doctor_id, start_at)`

## RLS Policies Added

The appointments migration enables RLS and adds:

- `Super admins can manage appointments`
- `Clinic users can manage own appointments`

These policies enforce tenant isolation by `clinic_id = get_my_clinic_id()`.

## Environment Variables Required

Required for real database-backed behavior:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Existing future-phase variables remain in `.env.example` for OpenAI/Ollama, Resend, PayMongo, and optional direct GCash access.

## Known Issues

- No automated test framework or `npm test` script exists yet.
- Appointment creation requires existing patients and active services; doctor assignment is optional.
- Availability validation allows booking when no availability rule exists for the clinic or selected doctor. Once clinics configure rules, those rules are enforced.
- FullCalendar drag-and-drop calls a server action and shows `window.alert()` on validation failure.
- Supabase migrations must be applied before testing appointments against a real database.

## Validation

Run after Phase 4:

```bash
npm run lint
npm run typecheck
```

Both passed after this handoff was updated.

## Next Recommended Phase Prompt

Phase 5 should implement the public booking widget and AI-assisted booking flow:

```txt
Continue from the existing implementation. Build the public clinic booking widget and AI-assisted appointment booking flow.

Include widget route behavior for /widget/[clinicSlug], patient self-booking, service/doctor selection, available slot generation from availability rules and blocked dates, appointment creation from widget source, AI booking conversation scaffolding, and Resend confirmation emails.

Do not implement billing yet. Keep all secrets server-side. Run lint, typecheck, and update CODEX_HANDOFF.md.
```
