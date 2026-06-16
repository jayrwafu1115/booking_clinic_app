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

## Deployment (Hostinger)

The app is built with `output: "standalone"` so it runs as a plain Node.js server — no Vercel or edge infrastructure needed.

### 1. Point your domain and set up a Node.js app

In **Hostinger hPanel**:
1. Go to **Websites → Manage → Node.js**.
2. Create a new Node.js application, set the **Node.js version** to 18 or 20, and set the **Application root** to your project folder.
3. Set the **Application startup file** to `.next/standalone/server.js`.
4. Note the assigned port (e.g. `3000` or Hostinger may assign one automatically).

For a **Hostinger VPS** with root access, install PM2 globally:
```bash
npm install -g pm2
```

---

### 2. Upload the project

**Option A — Git (recommended for VPS):**
```bash
git clone <your-repo-url> /home/user/clinic-app
cd /home/user/clinic-app
```

**Option B — File Manager / FTP:**  
Upload the entire project directory to your Hostinger hosting folder.

---

### 3. Install dependencies and build

```bash
cd /path/to/project
npm install
npm run build
```

After the build, copy the static assets into the standalone bundle:

```bash
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
```

> **Why?** `output: "standalone"` creates a self-contained `.next/standalone/server.js` that only includes the Node.js server. Static files must be copied in manually.

---

### 4. Create the environment file

```bash
cp .env.example .env
```

Edit `.env` with your real credentials. Key variables:

```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL="Book Clinic PH <noreply@yourdomain.com>"
PAYMONGO_SECRET_KEY=
PAYMONGO_WEBHOOK_SECRET=
CRON_SECRET=your-random-secret-here
PORT=3000
```

> **Never** commit `.env` to git. All secret keys stay server-side only.

---

### 5. Start the server

**Hostinger hPanel Node.js:** Click **Restart** in the Node.js panel — it starts `.next/standalone/server.js` automatically.

**VPS with PM2:**
```bash
PORT=3000 pm2 start .next/standalone/server.js --name "clinic-app"
pm2 save          # persist across reboots
pm2 startup       # configure PM2 to start on system boot
```

---

### 6. Configure Supabase Auth redirect URLs

In Supabase → **Authentication → URL Configuration**, add:
```
https://yourdomain.com/auth/callback
https://yourdomain.com/**
```

---

### 7. Run database migrations

Run migrations against your Supabase project (see [Database Setup](#database-setup)).

---

### 8. Set up PayMongo webhook

In PayMongo → **Developers → Webhooks**, create a webhook pointing to:
```
https://yourdomain.com/api/paymongo/webhook
```
Subscribe to: `payment.paid`, `payment.failed`, `checkout_session.payment.paid`, `checkout_session.payment.expired`.

---

### 9. Set up the appointment reminder cron job

In **Hostinger hPanel → Cron Jobs**, add a job that runs every hour:

| Field | Value |
|-------|-------|
| Command | `curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/cron/appointment-reminders` |
| Schedule | Every hour (`0 * * * *`) |

On a **VPS**, add to crontab (`crontab -e`):
```
0 * * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/cron/appointment-reminders
```

Replace `YOUR_CRON_SECRET` with the value of `CRON_SECRET` in your `.env`.

---

### Re-deploying updates

```bash
git pull
npm install
npm run build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
pm2 restart clinic-app    # VPS
# or click Restart in hPanel Node.js
```

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

`lib/rate-limit.ts` uses an in-memory sliding window for single-instance deployments (Hostinger VPS with PM2). To support multiple instances, set:

```env
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

Create a free Redis database at [console.upstash.com](https://console.upstash.com). The rate limiter will switch to Upstash automatically when those env vars are present — no code change needed.

## Security Notes

- `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`, and `PAYMONGO_SECRET_KEY` are server-only. Never prefix them with `NEXT_PUBLIC_`.
- All clinic data is row-level security (RLS) scoped. Queries without a valid auth session return nothing.
- The `/admin` section enforces super admin role at the layout level and at the query level.
- The widget chat endpoint uses the Supabase admin client intentionally — it's server-side only and has no session.
- PayMongo webhook signatures are verified with HMAC-SHA256 before any processing.
- Audit logs are tenant-isolated; clinic users can only read their own logs.

## License

Private — all rights reserved.
