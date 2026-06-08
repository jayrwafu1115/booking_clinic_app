# Codex Handoff

## Project

- Product: ClinicFlow AI PH
- Stack: Next.js 15 App Router, TypeScript, Tailwind CSS, Supabase, FullCalendar
- Current branch: `main`
- Current phase completed: Phase 6 - Embeddable AI Booking Widget

## Phase Completed

Phase 6 builds the public embeddable AI booking widget on top of the Phase 5 AI assistant and Phase 4 appointment engine.

## Features Implemented

- Public widget route at `/widget/[clinicSlug]`
- Public widget chat endpoint at `/api/widget/[clinicSlug]/chat`
- Server-only clinic slug resolution with active-clinic checks
- Clinic branding in the widget:
  - Clinic name
  - Clinic logo
  - Clinic primary color
- Clinic AI settings support:
  - AI enabled
  - Widget enabled
  - Provider/model/tone/welcome message/instructions
- Floating button mode
- Expanded responsive chat panel
- Message bubbles
- Typing indicator
- Smooth open/close and hover transitions
- Quick reply buttons for online-booking-enabled services
- FAQ-first answer path before LLM fallback
- Emergency safety response rule
- Public booking conversation storage in `ai_conversations`
- Public message storage in `ai_messages`
- Explicit booking flow:
  - Select service
  - Suggest available slots
  - Select slot
  - Collect patient full name and phone
  - Ask for optional email
  - Confirm booking
  - Create or reuse patient by phone
  - Create appointment with `source = 'widget'`
- Public endpoint rate limiting by IP and clinic slug
- Dashboard embed page at `/ai/widget`
- Copyable widget URL, iframe snippet, and JavaScript snippet

## Files Changed

- `CODEX_HANDOFF.md`
- `app/(dashboard)/ai/page.tsx`
- `app/(dashboard)/ai/settings/page.tsx`
- `app/(dashboard)/ai/faq/page.tsx`
- `app/(dashboard)/ai/conversations/page.tsx`
- `app/(dashboard)/ai/conversations/[id]/page.tsx`
- `app/(dashboard)/ai/conversations/loading.tsx`
- `app/(dashboard)/ai/widget/page.tsx`
- `app/api/widget/[clinicSlug]/chat/route.ts`
- `app/widget/[clinicSlug]/page.tsx`
- `components/ai/ai-settings-form.tsx`
- `components/ai/conversation-message-form.tsx`
- `components/ai/faq-item-form.tsx`
- `components/ai/handoff-form.tsx`
- `components/ai/new-conversation-form.tsx`
- `components/ai/widget-embed-card.tsx`
- `components/layout/sidebar.tsx`
- `components/widget/booking-widget.tsx`
- `lib/ai/provider.ts`
- `lib/ai/openai-provider.ts`
- `lib/ai/ollama-provider.ts`
- `lib/ai/prompts.ts`
- `lib/ai/tools.ts`
- `lib/auth/permissions.ts`
- `lib/constants/ai.ts`
- `lib/rate-limit.ts`
- `lib/validations/settings.ts`
- `server/actions/ai.ts`
- `server/queries/ai.ts`
- `server/widget/chat.ts`
- `types/database.ts`

## Supabase Tables/Migrations Added

- Phase 6 adds no new Supabase migration.
- Phase 6 uses the Phase 5 migration:
  - `supabase/migrations/202606080005_phase_5_ai_booking_assistant.sql`
- The widget relies on these existing tables:
  - `clinics`
  - `clinic_settings`
  - `services`
  - `doctors`
  - `availability_rules`
  - `blocked_dates`
  - `patients`
  - `appointments`
  - `faq_items`
  - `ai_conversations`
  - `ai_messages`

## RLS Policies Added

- Phase 6 adds no new RLS policies.
- Public widget reads/writes are performed only inside server routes with the Supabase service-role client.
- The public endpoint scopes every operation by the clinic resolved from `clinicSlug`.
- No service-role key or internal provider keys are exposed to the browser.
- Existing authenticated RLS policies still protect dashboard access and prevent cross-clinic dashboard reads/writes.

## Environment Variables Required

Required for database access:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Required when clinic AI provider is OpenAI:

- `OPENAI_API_KEY`

Optional when clinic AI provider is Ollama:

- `OLLAMA_BASE_URL`

Optional for embed snippet origin generation:

- `NEXT_PUBLIC_APP_URL`

If `NEXT_PUBLIC_APP_URL` is not set, `/ai/widget` derives the origin from request headers and falls back to `https://yourdomain.com`.

## Known Issues

- Supabase migrations must be applied before testing AI settings, FAQ, conversations, messages, patients, appointments, and widget booking.
- No automated test framework or `npm test` script exists yet.
- The widget booking flow is deterministic through UI actions; model-native tool-calling is still not implemented.
- The public widget uses an in-memory rate limiter, which is suitable for a single server process but should move to Redis/Upstash or a database-backed limiter for multi-instance production deployments.
- The widget creates appointments from selected available slots, but reschedule/cancel self-service is not implemented yet.
- The widget currently suggests slots across active doctors or clinic-level availability; explicit doctor selection in the public UI can be expanded later.

## Validation

Run after Phase 6:

```bash
npm run lint
npm run typecheck
```

Both passed after implementing the widget.

## Next Recommended Phase Prompt

Phase 7 should implement patient-facing confirmation and communication workflows:

```txt
Continue from the existing implementation. Build appointment confirmation, reminders, and patient communication workflows.

Include patient confirmation pages, appointment lookup by secure token, reschedule/cancel requests, email/SMS notification abstractions, reminder scheduling metadata, staff notification views, and audit logs for patient-driven appointment changes.

Keep all clinic data tenant-scoped. Preserve the existing widget booking flow and AI assistant architecture. Run lint, typecheck, and update CODEX_HANDOFF.md.
```
