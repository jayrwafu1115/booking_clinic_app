# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start development server (http://localhost:3000)
npm run build      # Production build — run before marking any phase done
npm run lint       # ESLint (next lint)
npm run typecheck  # tsc --noEmit — run alongside lint before committing
```

There is no test runner configured. Validate changes with `lint`, `typecheck`, and `build`.

## Architecture Overview

**ClinicFlow AI PH** is a multi-tenant SaaS for Philippine clinics. Every piece of data is scoped to a `clinic_id`. A single Next.js 15 App Router app serves the clinic dashboard, the super-admin portal, and the public embeddable widget.

### Route Groups

| Group | Path prefix | Who uses it |
|-------|-------------|-------------|
| `app/(auth)/` | `/login`, `/register`, `/forgot-password` | Unauthenticated |
| `app/(dashboard)/` | `/dashboard`, `/appointments`, `/calendar`, `/patients`, `/doctors`, `/services`, `/availability`, `/ai/*`, `/reports`, `/settings/*`, `/billing` | Authenticated clinic users |
| `app/admin/` | `/admin/*` | `super_admin` role only |
| `app/widget/[clinicSlug]/` | `/widget/:slug` | Public (embeds on external sites) |
| `app/api/` | `/api/health`, `/api/widget/[slug]/chat`, `/api/paymongo/webhook` | Public/webhook |

### Auth & Tenant Isolation

- **Middleware** (`middleware.ts`) — redirects unauthenticated requests on all protected prefixes to `/login`.
- **Layout guards** — `app/(dashboard)/layout.tsx` redirects `super_admin` users (no `clinic_id`) to `/admin`. `app/admin/layout.tsx` redirects non-super-admins to `/dashboard`.
- **Server action context** — every mutable action calls `requireUser()` + `getCurrentProfile()` then `assertPermission(profile, permission)` before touching the DB.
- **Queries** — all Supabase queries explicitly filter `.eq("clinic_id", clinicId)` even with RLS active. Never rely on RLS alone.

### Supabase Client Usage

Three clients — use the right one:

| Client | File | When to use |
|--------|------|-------------|
| Server (SSR) | `lib/supabase/server.ts` | Server components, server actions, server queries — uses the authenticated user's session |
| Browser | `lib/supabase/browser.ts` | Client components only |
| Admin | `lib/supabase/admin.ts` | Bypasses RLS — **only** for the widget chat (`server/widget/chat.ts`) and the PayMongo webhook (`app/api/paymongo/webhook/route.ts`) |

### Server Actions Pattern

All mutations go through Server Actions in `server/actions/`. Every action:
1. Validates input with a Zod schema (`lib/validations/`)
2. Calls `getActionContext()` / `requireUser()` + `getCurrentProfile()`
3. Calls `assertPermission(profile, "permission:name")`
4. Performs the DB mutation scoped to `clinicId`
5. Calls `createAuditLog(...)` from `server/audit/create-audit-log.ts`
6. Returns `{ message?: string; success?: boolean }` — never throws to the client

### Permissions

`lib/auth/permissions.ts` defines the `Permission` union type and `rolePermissions` map. Call `assertPermission(profile, permission)` to throw on insufficient role. Roles in order of capability: `super_admin` > `clinic_owner` > `receptionist` > `staff` > `doctor`.

### Read Queries

`server/queries/` contains read-only helpers used by Server Components. They call `createSupabaseServerClient()` and always scope to the caller's `clinic_id` (obtained via `getCurrentProfile()`). Super-admin queries in `server/queries/super-admin.ts` call `isSuperAdmin()` before executing.

### Audit Logs

Call `createAuditLog({ clinicId, actorId, action, entityType, entityId?, metadata? })` after every state-changing action. The `audit_logs` table has RLS — use the server client for clinic actions and the admin client for webhook/system events (e.g. payment events where `actor_id = null`).

### AI / Widget

- **Internal AI chat** (`server/actions/ai.ts`) — uses the server client, requires an authenticated clinic user with `ai:view` permission.
- **Public widget** (`server/widget/chat.ts`) — uses the admin client, unauthenticated. Rate-limited at 30 req/min/IP in `app/api/widget/[clinicSlug]/chat/route.ts`.
- **AI provider** — abstracted via `lib/ai/provider.ts`. Supports `openai` and `ollama`. Never import `lib/ai/` from client components.

### Rate Limiting

`lib/rate-limit.ts` — in-memory sliding window. Works for single instances only. For production multi-instance deployments replace with `@upstash/ratelimit`.

### Philippines Localisation

- Timezone: always `Asia/Manila`. All DB timestamps are UTC; conversion helpers are in `lib/utils/manila-time.ts`.
- Currency: always `PHP`, amounts stored in **centavos** (integer).
- PH holiday constants: `lib/constants/ph-holidays.ts`.

### Migrations

All schema changes go in `supabase/migrations/` as numbered SQL files. Run them in order. The filename prefix is `YYYYMMDDNNNN_description.sql`. Always run `npm run build` after adding a migration to catch type errors.

### Environment Variables

`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `PAYMONGO_SECRET_KEY`, and `PAYMONGO_WEBHOOK_SECRET` are server-only secrets — never prefix with `NEXT_PUBLIC_`. See `.env.example` for the full list.
