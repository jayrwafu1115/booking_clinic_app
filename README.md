# ClinicFlow AI PH

A full-stack SaaS for Philippine clinics — appointment booking, AI assistant, multi-tenant management, and a super-admin portal. Built with Next.js 15 App Router, Supabase, Resend, and PayMongo.

## Features

- Multi-tenant clinic management with role-based access (clinic_owner, receptionist, doctor, staff)
- Appointment booking engine with availability rules, conflict detection, and status transitions
- Embeddable AI booking widget (OpenAI / Ollama) with FAQ matching and slot selection
- Email notifications via Resend (booking confirmation, reminders, cancellations)
- Patient management with Philippine address fields and emergency contacts
- Service, doctor, and availability management
- Reports dashboard with Recharts charts and AI analytics
- Super admin portal for platform-wide clinic, user, and subscription management
- Subscription plans with PayMongo webhook integration
- Full audit log trail with tenant isolation
- Philippines-specific: PHP currency, Asia/Manila timezone, PH holidays, PhilHealth fields

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Server Components, Server Actions) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth |
| Styling | Tailwind CSS |
| UI | Radix UI + shadcn/ui patterns |
| Charts | Recharts |
| Calendar | FullCalendar |
| Email | Resend |
| Payments | PayMongo |
| AI | OpenAI GPT-4o (or Ollama for self-hosted) |
| Validation | Zod |
| Forms | React Hook Form |
| State | Zustand + TanStack Query |

## Prerequisites

- Node.js 18+
- npm 9+
- A Supabase project (free tier works)
- A Resend account (free tier for email)
- An OpenAI API key (or local Ollama instance)
- A PayMongo account (for billing — optional for development)

## Local Development

### 1. Clone and install

```bash
git clone <repo-url>
cd booking-app
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials (see [Environment Variables](#environment-variables)).

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com).
2. Go to **Project Settings → API** and copy:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Settings → API → Service Role)
3. Go to **Project Settings → Database** and copy the connection string into `DATABASE_URL`.
4. Run migrations (see [Database Setup](#database-setup)).

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database Setup

All schema changes are in `supabase/migrations/`. Run them in order using one of:

### Option A: Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

### Option B: SQL Editor (manual)

In the Supabase dashboard → SQL Editor, run each migration file in numerical order:

```
supabase/migrations/202606050001_phase_1_foundation.sql
supabase/migrations/202606050002_phase_2_settings_users.sql
supabase/migrations/202606050003_phase_3_core_modules.sql
supabase/migrations/202606080004_phase_4_appointments.sql
supabase/migrations/202606080005_phase_5_ai_booking_assistant.sql
supabase/migrations/202606090006_phase_7_notifications.sql
supabase/migrations/202606090007_phase_8_reports_admin.sql
supabase/migrations/202606090008_phase_9_production_hardening.sql
```

### First super admin

After migrations, create a user in Supabase Auth (or via sign-up), then manually set their role:

```sql
-- In Supabase SQL Editor
update public.profiles
set role = 'super_admin', clinic_id = null
where email = 'your-admin@example.com';
```

Super admins have no `clinic_id` and are redirected to `/admin` on login.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

### Required

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Full URL of the app (e.g. `https://yourapp.com`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — **server-only, never expose** |

### AI Provider (configure one)

| Variable | Description |
|----------|-------------|
| `AI_PROVIDER` | `openai` or `ollama` |
| `OPENAI_API_KEY` | OpenAI API key — **server-only** |
| `OLLAMA_BASE_URL` | Ollama base URL (default: `http://localhost:11434`) |

### Email (Resend)

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Resend API key — **server-only** |
| `RESEND_FROM_EMAIL` | Sender address, e.g. `ClinicFlow <noreply@yourdomain.com>` |

### Payments (PayMongo)

| Variable | Description |
|----------|-------------|
| `PAYMONGO_SECRET_KEY` | PayMongo secret key — **server-only** |
| `PAYMONGO_PUBLIC_KEY` | PayMongo public key |
| `PAYMONGO_WEBHOOK_SECRET` | PayMongo webhook signing secret — **server-only** |
| `PAYMONGO_SUCCESS_REDIRECT_URL` | Post-payment success URL |
| `PAYMONGO_FAILURE_REDIRECT_URL` | Post-payment failure URL |

### Optional SMS

| Variable | Description |
|----------|-------------|
| `SEMAPHORE_API_KEY` | Semaphore SMS (recommended for PH numbers) |
| `SEMAPHORE_SENDER_NAME` | SMS sender name |

## Resend Setup

1. Create an account at [resend.com](https://resend.com).
2. Add and verify your sending domain (DNS records required).
3. Create an API key and set `RESEND_API_KEY`.
4. Set `RESEND_FROM_EMAIL` to a verified sender address.
5. In production, ensure your domain passes SPF, DKIM, and DMARC.

## PayMongo Setup

1. Create an account at [paymongo.com](https://paymongo.com).
2. Go to **Developers → API Keys** and copy both the public and secret keys.
3. Go to **Developers → Webhooks** and create a webhook pointing to:
   ```
   https://yourapp.com/api/paymongo/webhook
   ```
4. Subscribe to these events:
   - `payment.paid`
   - `payment.failed`
   - `link.payment.paid`
   - `checkout_session.payment.paid`
   - `checkout_session.payment.expired`
5. Copy the webhook signing secret and set `PAYMONGO_WEBHOOK_SECRET`.
6. To test locally, use the [PayMongo CLI](https://developers.paymongo.com/docs/webhooks) or forward via `ngrok`.

## AI Setup

### OpenAI (default)

1. Create an API key at [platform.openai.com](https://platform.openai.com).
2. Set `OPENAI_API_KEY` and `AI_PROVIDER=openai`.
3. The default model is `gpt-4o`. Clinics can override this in AI Settings.

### Ollama (self-hosted)

1. Install Ollama from [ollama.com](https://ollama.com).
2. Pull a model: `ollama pull llama3.2`
3. Set `AI_PROVIDER=ollama` and `OLLAMA_BASE_URL=http://localhost:11434`.
4. Clinics select the model from the Ollama model list in AI Settings.

## Deployment (Vercel)

### 1. Import project

1. Push the repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **New Project** → import the repo.

### 2. Set environment variables

In Vercel → **Project Settings → Environment Variables**, add all variables from `.env.example`. Mark sensitive variables as **Sensitive** (they will not be visible after saving).

Key variables that must be set before the first deployment:
- All `NEXT_PUBLIC_SUPABASE_*` and `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` or Ollama setup
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL`
- `PAYMONGO_SECRET_KEY` and `PAYMONGO_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL` set to your Vercel domain

### 3. Deploy

Vercel auto-deploys on push to `main`. The first deployment runs `npm run build`.

### 4. Configure Supabase Auth redirect URLs

In Supabase → **Authentication → URL Configuration**, add:
```
https://yourapp.vercel.app/auth/callback
https://yourapp.vercel.app/**
```

### 5. Run database migrations

After the first successful deployment, run migrations against your Supabase project (see [Database Setup](#database-setup)).

## Project Structure

```
app/
  (auth)/           # Login, register, forgot-password
  (dashboard)/      # Clinic dashboard — all tenant-scoped pages
    appointments/
    calendar/
    patients/
    doctors/
    services/
    availability/
    ai/             # AI assistant, settings, conversations, widget
    reports/
    settings/
    billing/
  admin/            # Super admin only — platform management
  api/
    health/         # GET /api/health
    widget/[clinicSlug]/chat/   # POST — public widget chat
    paymongo/webhook/           # POST — PayMongo webhook
  widget/[clinicSlug]/  # Embeddable public widget page

components/
  layout/           # Dashboard shell, sidebar, header
  ui/               # Base UI components
  reports/          # Report charts and filters
  admin/            # Admin-specific components

server/
  actions/          # Server actions (auth, appointments, AI, settings, ...)
  queries/          # Read-only Supabase query helpers
  audit/            # createAuditLog helper
  widget/           # Widget chat handler (uses admin client)

lib/
  ai/               # AI provider abstraction (OpenAI, Ollama)
  auth/             # Session helpers and permission definitions
  constants/        # App-wide constants (PH holidays, AI models, ...)
  notifications/    # Resend email sender and appointment templates
  rate-limit.ts     # In-memory rate limiter (upgrade to Upstash for prod)
  supabase/         # Supabase client factories (browser, server, admin)
  validations/      # Zod schemas

supabase/
  migrations/       # Ordered SQL migration files
```

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint
npm run typecheck  # TypeScript type check (no emit)
```

## Rate Limiting

The in-memory rate limiter in `lib/rate-limit.ts` works for single-instance deployments. For multi-instance production (Vercel serverless), replace it with [Upstash Redis](https://upstash.com):

```bash
npm install @upstash/ratelimit @upstash/redis
```

Update `lib/rate-limit.ts` to use `@upstash/ratelimit` with a sliding window. Store `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` as env vars.

## Known Limitations

- **Appointment reminder cron** — `notify_appointment_reminder` preference is stored but no scheduler fires it. Add a Vercel Cron or Supabase pg_cron job.
- **SMS** — Stub only. Wire Semaphore/Twilio/Infobip in `lib/notifications/sms/`.
- **Patient confirmation portal** — `/confirm/[token]` is not yet built. Emails link to it but it returns 404.
- **Rate limiter** — In-memory, resets per instance. Upgrade to Upstash Redis for multi-instance deployments.
- **Confirm/reschedule portal** — Not yet built.

## Security Notes

- `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`, and `PAYMONGO_SECRET_KEY` are server-only. Never prefix them with `NEXT_PUBLIC_`.
- All clinic data is row-level security (RLS) scoped. Queries without a valid auth session return nothing.
- The `/admin` section enforces super admin role at the layout level and at the query level.
- The widget chat endpoint uses the Supabase admin client intentionally — it's server-side only and has no session.
- PayMongo webhook signatures are verified with HMAC-SHA256 before any processing.
- Audit logs are tenant-isolated; clinic users can only read their own logs.

## License

Private — all rights reserved.
