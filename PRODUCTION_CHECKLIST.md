# ClinicFlow AI PH — Production Checklist

Work through this checklist before going live. Check each item when confirmed.

---

## 1. Environment Variables

- [ ] `NEXT_PUBLIC_APP_URL` — set to the live domain (no trailing slash)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — set as a **secret** env var (never expose in browser)
- [ ] `OPENAI_API_KEY` — set as a **secret** env var (or confirm Ollama is reachable)
- [ ] `AI_PROVIDER` — `openai` or `ollama`
- [ ] `RESEND_API_KEY` — set as a **secret** env var
- [ ] `RESEND_FROM_EMAIL` — verified sender address
- [ ] `PAYMONGO_SECRET_KEY` — set as a **secret** env var
- [ ] `PAYMONGO_PUBLIC_KEY` — set
- [ ] `PAYMONGO_WEBHOOK_SECRET` — set as a **secret** env var
- [ ] `PAYMONGO_SUCCESS_REDIRECT_URL` — live domain URL
- [ ] `PAYMONGO_FAILURE_REDIRECT_URL` — live domain URL
- [ ] No `NEXT_PUBLIC_` prefix on any secret key

---

## 2. Supabase RLS

- [ ] All tables have RLS enabled (verify in Supabase dashboard → Table Editor → each table → RLS)
- [ ] `clinics` — clinic users can only read their own row; super admins can manage all
- [ ] `profiles` — users can only read clinic members; owners can manage clinic profiles
- [ ] `clinic_settings` — owners can update; all clinic users can read
- [ ] `appointments` — scoped to `clinic_id = get_my_clinic_id()`
- [ ] `patients` — scoped to clinic
- [ ] `doctors` — scoped to clinic
- [ ] `services` — scoped to clinic
- [ ] `availability_rules` — scoped to clinic
- [ ] `blocked_dates` — scoped to clinic
- [ ] `audit_logs` — clinic users can read own; can only insert with own `actor_id`
- [ ] `ai_conversations` — scoped to clinic
- [ ] `ai_messages` — scoped to clinic
- [ ] `faq_items` — scoped to clinic
- [ ] `appointment_notifications` — scoped to clinic
- [ ] `clinic_subscriptions` — clinic users read own; super admin manages all
- [ ] `subscription_plans` — all authenticated users can read (public plans list)
- [ ] `user_invites` — scoped to clinic

---

## 3. PayMongo Webhook

- [ ] Webhook URL registered in PayMongo dashboard: `https://yourapp.com/api/paymongo/webhook`
- [ ] Webhook subscribed to events:
  - [ ] `payment.paid`
  - [ ] `payment.failed`
  - [ ] `link.payment.paid`
  - [ ] `checkout_session.payment.paid`
  - [ ] `checkout_session.payment.expired`
- [ ] `PAYMONGO_WEBHOOK_SECRET` copied from PayMongo dashboard and set in env vars
- [ ] Webhook signature verification working (test via PayMongo test mode + event replay)
- [ ] PayMongo test mode disabled for production keys

---

## 4. Resend Domain

- [ ] Domain added and verified in Resend dashboard
- [ ] SPF record added to DNS (`v=spf1 include:amazonses.com ~all` or Resend-specific)
- [ ] DKIM CNAME records added to DNS (provided by Resend)
- [ ] DMARC record added: `v=DMARC1; p=quarantine;`
- [ ] Sending domain verified (green status in Resend)
- [ ] `RESEND_FROM_EMAIL` matches a verified sender identity
- [ ] Test email sent and received without spam flagging

---

## 5. AI Provider

### OpenAI
- [ ] `OPENAI_API_KEY` is valid and has available credits
- [ ] API key has appropriate rate limits for expected traffic
- [ ] Model `gpt-4o` is available on the account (or update clinic defaults)
- [ ] Spending limit set in OpenAI dashboard

### Ollama (self-hosted)
- [ ] Ollama server is reachable from the app server
- [ ] `OLLAMA_BASE_URL` points to the Ollama server
- [ ] Required models are pulled (`ollama pull llama3.2` or as configured)
- [ ] Ollama server has sufficient RAM/VRAM for the selected model

---

## 6. Vercel Deployment

- [ ] Project imported from GitHub
- [ ] All environment variables set in Vercel (Settings → Environment Variables)
- [ ] Framework preset: **Next.js**
- [ ] Node.js version: **18.x** or **20.x**
- [ ] `npm run build` passes without errors
- [ ] `npm run lint` passes without errors
- [ ] `npm run typecheck` passes without errors
- [ ] Production deployment is on the `main` branch
- [ ] Custom domain configured (if applicable)
- [ ] HTTPS enforced

---

## 7. Security

- [ ] No secrets in `NEXT_PUBLIC_*` env vars
- [ ] Supabase service role key only used server-side (`lib/supabase/admin.ts`)
- [ ] Rate limiting active on widget chat endpoint (`/api/widget/[slug]/chat`)
- [ ] PayMongo webhook verifies HMAC-SHA256 signature before processing
- [ ] Supabase Auth email confirmation enabled (Settings → Auth → Email)
- [ ] Auth redirect URLs restricted to your domain in Supabase
- [ ] `X-Forwarded-For` IP extraction used for rate limiting (Vercel sets this)
- [ ] Admin section (`/admin`) protected by role check at layout + query levels
- [ ] Super admin accounts created via SQL only (no public registration path)

---

## 8. Database

- [ ] All migrations applied in order (verify by checking `supabase_migrations` or schema)
- [ ] Super admin user created and tested
- [ ] `subscription_plans` seeded (Starter, Pro, Enterprise)
- [ ] `get_platform_metrics()` and `get_all_clinics_admin()` RPCs exist
- [ ] `on_clinic_created_create_trial` trigger works (create a test clinic and check `clinic_subscriptions`)
- [ ] Performance indexes applied (migration `202606090008`)
- [ ] Database backups enabled (Supabase Pro or point-in-time recovery)
- [ ] Connection pooling configured for serverless (Supabase → Settings → Database → Connection Pooling)

---

## 9. Backup & Recovery

- [ ] Supabase automatic daily backups enabled (Pro plan feature)
- [ ] Manual backup created before first production deployment
- [ ] Recovery steps documented (restore from Supabase backup + re-run app)
- [ ] Critical data: clinics, profiles, appointments, patients — confirmed in backup

---

## 10. Monitoring

- [ ] Vercel Analytics enabled (or equivalent)
- [ ] Error monitoring set up (Sentry, Axiom, or Vercel Logs)
- [ ] Supabase logs reviewed after deployment
- [ ] Health endpoint reachable: `GET /api/health` returns `{ "ok": true }`
- [ ] Alert set up for high error rate or webhook failures
- [ ] PayMongo webhook delivery logs reviewed

---

## 11. Known Limitations to Document for Users

- **Appointment reminders** require a separate cron job. Not auto-fired.
- **SMS notifications** are stubbed. Semaphore/Twilio/Infobip integration needed.
- **Patient confirmation portal** (`/confirm/[token]`) — page not yet built; links in emails 404.
- **Rate limiter** — in-memory, resets per serverless instance. Upgrade to Upstash Redis for multi-region consistency.
- **AI usage query** — `getAiUsageByClinic()` fetches all message rows. Convert to an aggregate RPC as volume grows.

---

## 12. Post-Launch

- [ ] Monitor first 48h of error logs
- [ ] Confirm first booking email delivered end-to-end
- [ ] Test widget booking flow from external browser
- [ ] Test PayMongo payment flow in test mode, then switch to live keys
- [ ] Verify super admin can access `/admin` and see clinic list
- [ ] Verify audit logs are recording actions in `/settings/audit-logs`
