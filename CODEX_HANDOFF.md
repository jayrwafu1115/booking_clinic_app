# Codex Handoff

## Project

- Product: ClinicFlow AI PH
- Stack: Next.js 15 App Router, TypeScript, Tailwind CSS, Supabase, FullCalendar, Recharts
- Current branch: `main`
- Current phase completed: **Final Phase — Production Hardening, Security, Performance, and Deployment Readiness**

## All Phases Completed

| Phase | Title |
|-------|-------|
| 1 | Foundation (clinics, profiles, auth, RLS) |
| 2 | Settings & Users (clinic profile, user management, invites) |
| 3 | Core Modules (patients, doctors, services, availability) |
| 4 | Appointments (booking engine, calendar, FullCalendar) |
| 5 | AI Booking Assistant (AI chat, widget, FAQ, tools) |
| 7 | Philippines Localization & Resend Notifications |
| 8 | Analytics, Reports & Super Admin |
| 9 (Final) | Production Hardening, Security, Performance, Deployment Readiness |

## Final Phase Features Implemented

### PayMongo Webhook (`/api/paymongo/webhook`)
- HMAC-SHA256 signature verification via `Paymongo-Signature` header
- Handles `payment.paid`, `payment.failed`, `link.payment.paid`, `checkout_session.*`
- Updates `clinic_subscriptions.status` to `active`/`past_due`
- Writes audit logs via admin client (webhook has no user session)

### AI Handoff Audit Log
- `handoffConversationAction` now logs `ai.handoff_requested` with `reason` metadata

### Performance Indexes (migration `202606090008`)
- `appointments`: `(clinic_id, start_at)`, `(clinic_id, status)`, `(clinic_id, patient_id)`, `(clinic_id, doctor_id)`
- `patients`: `(clinic_id, lower(full_name))`, `(clinic_id, phone)`
- `ai_conversations`: `(clinic_id, status)`, `(clinic_id, created_at)`
- `ai_messages`: `(conversation_id, created_at)`
- `appointment_notifications`, `audit_logs`, `clinic_subscriptions`: targeted indexes
- Schema guards for `profiles.status`, `profiles.deactivated_at/by`

### README.md
Complete deployment guide covering Supabase setup, env vars, Resend, PayMongo, AI providers, Vercel deployment.

### PRODUCTION_CHECKLIST.md
12-section production checklist: env vars, RLS, webhooks, email domain, AI, Vercel, security, DB, backups, monitoring.

## Complete Feature List

### Clinic Dashboard
- Multi-tenant authentication and session management
- Role-based permissions: `super_admin`, `clinic_owner`, `receptionist`, `doctor`, `staff`
- Clinic profile and settings management
- User invitation, role management, deactivation
- Audit log trail (read-only for clinic users)
- Notification preferences (email)

### Appointments
- Booking engine with availability rules (per-doctor or clinic-wide)
- Blocked dates and holiday support
- Conflict detection (doctor schedule, blocked dates, break times)
- Status machine: `booked → confirmed → completed | cancelled | no_show`
- Email notifications: booking confirmation, confirmed, rescheduled, cancelled

### Calendar
- FullCalendar with day, week, list views
- Manila timezone awareness
- Colour-coded appointment status

### Patients
- Full Philippine address fields (barangay, city, province, region, postal code)
- Emergency contact
- Patient appointment history

### Services & Doctors
- Service categories, pricing (PHP), duration, online booking toggle
- Doctor profiles with specialization, license, availability override

### AI Booking Assistant
- Internal AI chat (dashboard) using OpenAI or Ollama
- FAQ matching with keyword scoring
- Service search and slot suggestion
- Emergency intent detection with safety redirect
- AI handoff to staff with audit log
- Embeddable public widget at `/widget/[clinicSlug]`
- Widget API at `/api/widget/[clinicSlug]/chat` with rate limiting (30 req/min/IP)

### Reports
- Date range filter (Today, This Week, This Month, Last Month, Custom)
- Appointment KPIs: total, completed, cancelled, no-shows
- Business KPIs: revenue (PHP), new patients, AI bookings
- Charts: appointment status pie, booking source pie, services bar, doctor utilization bar
- Service and doctor performance tables
- AI analytics: conversations, bookings, handoffs, conversion rate, top sources

### Super Admin (`/admin`)
- Platform dashboard: clinic, subscription, user, AI metrics
- Clinic list with status/subscription info
- Clinic detail with status toggle (active/inactive/suspended)
- User list (all platform users)
- Subscription breakdown per clinic
- Per-clinic AI usage stats
- Platform rankings (top clinics by appointments and AI usage)

### Billing (infrastructure)
- `subscription_plans` table (Starter, Pro, Enterprise)
- `clinic_subscriptions` table with auto-trial trigger
- PayMongo webhook handler for payment events
- Front-end checkout not yet built (billing page is a placeholder)

### Notifications
- Resend email for booking confirmation, confirmed, rescheduled, cancelled
- Philippines holiday calendar (pre-loaded in `lib/constants/ph-holidays.ts`)
- Notification preferences stored per clinic

## Files Changed in Final Phase

- `server/actions/ai.ts`
- `app/api/paymongo/webhook/route.ts` (new)
- `supabase/migrations/202606090008_phase_9_production_hardening.sql` (new)
- `README.md` (new)
- `PRODUCTION_CHECKLIST.md` (new)
- `CLAUDE_HANDOFF.md`
- `CODEX_HANDOFF.md`

## Supabase Migrations (all phases)

```
202606050001_phase_1_foundation.sql
202606050002_phase_2_settings_users.sql
202606050003_phase_3_core_modules.sql
202606080004_phase_4_appointments.sql
202606080005_phase_5_ai_booking_assistant.sql
202606090006_phase_7_notifications.sql
202606090007_phase_8_reports_admin.sql
202606090008_phase_9_production_hardening.sql
```

## Commands Run

```bash
npm run lint       # ✔ No ESLint warnings or errors
npm run typecheck  # ✔ No TypeScript errors
npm run build      # ✔ Build successful (49 routes)
```

## Known Issues

- **Patient confirmation portal** — `/confirm/[token]` not built. Emails link to it → 404.
- **SMS not implemented** — Stub only. Wire Semaphore/Twilio/Infobip in `lib/notifications/sms/`.
- **Appointment reminder cron** — Preference stored but no scheduler fires it.
- **Rate limiter is in-memory** — Resets per serverless instance. Upgrade to Upstash Redis.
- **AI usage query** — `getAiUsageByClinic()` loads all message rows for per-clinic counts. Convert to aggregate RPC.
- **Mobile admin sidebar** — No drawer on small screens for `/admin`.
- **PayMongo checkout** — Webhook ready; front-end checkout initiation (create session, redirect) not built.

## Deployment Steps

1. Run all 8 migrations against Supabase (SQL Editor or `supabase db push`)
2. Set all env vars in Vercel (see README.md)
3. Register PayMongo webhook at `https://yourapp.com/api/paymongo/webhook`
4. Configure Supabase Auth redirect URLs for your domain
5. Verify Resend domain DNS
6. Create first super admin via SQL
7. Deploy — Vercel auto-deploys from `main`
8. Work through PRODUCTION_CHECKLIST.md

## Security Status

| Control | Status |
|---------|--------|
| Supabase RLS on all tables | ✅ |
| Server-only secrets (no `NEXT_PUBLIC_` leak) | ✅ |
| PayMongo webhook HMAC-SHA256 verification | ✅ |
| Server action auth guards (`requireUser` + `assertPermission`) | ✅ |
| Admin section role enforcement | ✅ |
| Admin client server-side only | ✅ |
| Audit logs on all major actions | ✅ |
| Rate limiting on public endpoints | ✅ (in-memory — upgrade for prod) |
