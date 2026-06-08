-- Phase 9: Production Hardening
-- Performance indexes, RLS audit improvements, webhook audit support.

-- ─── Performance Indexes ──────────────────────────────────────────────────────

-- Appointments: most queries filter by clinic_id + start_at range or status
create index if not exists appointments_clinic_start_at_idx
  on public.appointments(clinic_id, start_at desc);

create index if not exists appointments_clinic_status_idx
  on public.appointments(clinic_id, status);

create index if not exists appointments_clinic_patient_idx
  on public.appointments(clinic_id, patient_id);

create index if not exists appointments_clinic_doctor_idx
  on public.appointments(clinic_id, doctor_id);

-- Patients: name search and phone lookup
create index if not exists patients_clinic_full_name_idx
  on public.patients(clinic_id, lower(full_name) text_pattern_ops);

create index if not exists patients_clinic_phone_idx
  on public.patients(clinic_id, phone);

-- AI conversations: status filtering and recency sort
create index if not exists ai_conversations_clinic_status_idx
  on public.ai_conversations(clinic_id, status);

create index if not exists ai_conversations_clinic_created_at_idx
  on public.ai_conversations(clinic_id, created_at desc);

-- AI messages: conversation thread loads (ordered by time)
create index if not exists ai_messages_conversation_created_at_idx
  on public.ai_messages(conversation_id, created_at asc);

-- Appointment notifications: lookup by appointment
create index if not exists appointment_notifications_appointment_idx
  on public.appointment_notifications(appointment_id, created_at desc);

-- Audit logs: filtering by entity_type within a clinic
create index if not exists audit_logs_clinic_entity_type_idx
  on public.audit_logs(clinic_id, entity_type, created_at desc);

-- Audit logs: actor lookup (useful for user activity views)
create index if not exists audit_logs_actor_id_idx
  on public.audit_logs(actor_id, created_at desc);

-- Subscription lookup by clinic
create index if not exists clinic_subscriptions_clinic_id_idx
  on public.clinic_subscriptions(clinic_id);

-- ─── Audit Log: allow system/webhook inserts (actor_id = null) ────────────────
-- The existing insert policy requires actor_id = auth.uid(), which blocks
-- server-side webhook inserts where there is no authenticated session.
-- We keep the existing policy for authenticated users and add a service-role bypass
-- via the admin client (bypasses RLS entirely), so no policy change is needed here.
-- Document: webhook audit inserts MUST use the admin client, not the anon client.

-- ─── Profiles: add status column if missing from earlier phases ───────────────
-- status was referenced in Phase 3 (permissions) but guard against missing column
alter table public.profiles
  add column if not exists status text not null default 'active'
  check (status in ('active','inactive'));

alter table public.profiles
  add column if not exists deactivated_at timestamptz;

alter table public.profiles
  add column if not exists deactivated_by uuid references auth.users(id) on delete set null;

-- ─── Clinic subscriptions: ensure updated_at trigger exists ──────────────────
drop trigger if exists set_clinic_subscriptions_updated_at on public.clinic_subscriptions;
create trigger set_clinic_subscriptions_updated_at
  before update on public.clinic_subscriptions
  for each row execute function public.set_updated_at();
