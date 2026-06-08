# Claude Handoff

## Project

- Product: ClinicFlow AI PH
- Stack: Next.js 15 App Router, TypeScript, Tailwind CSS, Supabase, Recharts
- Current branch: `main`
- Phase completed: **Final Phase — Production Hardening, Security, Performance, and Deployment Readiness**

## What Was Built in the Final Phase

### PayMongo Webhook Handler (`/api/paymongo/webhook`)
- New route at `app/api/paymongo/webhook/route.ts`
- Verifies HMAC-SHA256 signature from `Paymongo-Signature` header (format: `t={timestamp},te={test},li={live}`)
- Uses `timingSafeEqual` to prevent timing attacks
- Handles `payment.paid`, `payment.failed`, `link.payment.paid`, `checkout_session.payment.paid`, `checkout_session.payment.expired`
- Updates `clinic_subscriptions.status` to `active` or `past_due` based on event
- Writes audit logs using the admin client (bypasses RLS — correct for webhook context)

### AI Handoff Audit Log
- `server/actions/ai.ts` — `handoffConversationAction` now calls `createAuditLog` with `action = "ai.handoff_requested"`
- Includes `reason` in metadata and `conversationId` as the entity ID

### Production Hardening Migration (`202606090008_phase_9_production_hardening.sql`)
Performance indexes added:
- `appointments(clinic_id, start_at desc)` — calendar and appointment list queries
- `appointments(clinic_id, status)` — status-filtered views
- `appointments(clinic_id, patient_id)` — patient appointment lookup
- `appointments(clinic_id, doctor_id)` — doctor schedule queries
- `patients(clinic_id, lower(full_name) text_pattern_ops)` — name search
- `patients(clinic_id, phone)` — phone lookup (widget booking dedup)
- `ai_conversations(clinic_id, status)` — status-filtered conversations
- `ai_conversations(clinic_id, created_at desc)` — recency sort
- `ai_messages(conversation_id, created_at asc)` — thread load
- `appointment_notifications(appointment_id, created_at desc)` — notification lookup
- `audit_logs(clinic_id, entity_type, created_at desc)` — entity-type filter
- `audit_logs(actor_id, created_at desc)` — actor-based filter
- `clinic_subscriptions(clinic_id)` — subscription lookup
Schema guards for `profiles.status`, `profiles.deactivated_at`, `profiles.deactivated_by`.

### README.md
- Full deployment guide: Supabase setup, env vars, Resend domain, PayMongo setup, AI setup, Vercel deployment steps
- Project structure overview
- Known limitations section

### PRODUCTION_CHECKLIST.md
- 12-section checklist covering env vars, RLS, PayMongo webhook, Resend domain, AI provider, Vercel, security, database, backups, monitoring, known limitations, and post-launch tasks

## Files Changed

- `server/actions/ai.ts` — Added `createAuditLog` import and audit log call in `handoffConversationAction`
- `app/api/paymongo/webhook/route.ts` — New file
- `supabase/migrations/202606090008_phase_9_production_hardening.sql` — New file
- `README.md` — New file
- `PRODUCTION_CHECKLIST.md` — New file
- `CLAUDE_HANDOFF.md` — Updated (this file)
- `CODEX_HANDOFF.md` — Updated

## Lint & Typecheck & Build

```
npm run lint       ✔ No ESLint warnings or errors
npm run typecheck  ✔ No TypeScript errors
npm run build      ✔ Build successful (49 routes, 0 errors)
```

## Security Summary

| Area | Status |
|------|--------|
| RLS on all tables | ✅ Applied in migrations |
| Secrets in `NEXT_PUBLIC_*` | ✅ None — all server-only |
| PayMongo webhook signature | ✅ HMAC-SHA256 with timing-safe compare |
| Route protection | ✅ `requireUser()` + `assertPermission()` in all server actions |
| Super admin protection | ✅ Layout-level + query-level checks |
| Admin client usage | ✅ Server-only (widget chat + webhook) |
| Audit logs | ✅ All major actions logged with tenant isolation |
| Rate limiting | ⚠️ In-memory — upgrade to Upstash Redis for multi-instance prod |

## Known Issues / Remaining Optional Work

1. **Patient confirmation portal** — `/confirm/[token]` returns 404. Emails link to it.
2. **SMS provider** — Stub only in `lib/notifications/sms/`. Wire Semaphore/Twilio/Infobip.
3. **Appointment reminder cron** — Preference stored, no scheduler. Add Vercel Cron or pg_cron.
4. **Rate limiter** — In-memory (`lib/rate-limit.ts`). Replace with `@upstash/ratelimit` for multi-instance.
5. **AI usage query** — `getAiUsageByClinic()` loads all message rows. Convert to aggregate RPC at scale.
6. **Mobile admin sidebar** — No drawer on small screens for `/admin`.
7. **PayMongo checkout flow** — Webhook handler is ready; the front-end checkout initiation (create checkout session, redirect) is not yet implemented.

## Deployment Steps

1. Run Supabase migrations in order (see README.md → Database Setup)
2. Configure all env vars in Vercel (see README.md → Environment Variables)
3. Register PayMongo webhook at `https://yourapp.com/api/paymongo/webhook`
4. Verify Resend domain DNS records
5. Create super admin user via SQL (`update profiles set role = 'super_admin', clinic_id = null ...`)
6. Deploy via Vercel (auto-deploys from `main`)
7. Verify health endpoint: `GET /api/health`
8. Work through `PRODUCTION_CHECKLIST.md`
