-- Phase 7: Philippines Localization + Resend Notifications
-- Adds notification preferences to clinic_settings, appointment_notifications table,
-- confirmation token tracking on appointments, holiday flag on blocked_dates.

-- 1. Notification preference columns on clinic_settings
alter table public.clinic_settings
add column if not exists notify_booking_confirmation boolean not null default true;

alter table public.clinic_settings
add column if not exists notify_appointment_confirmed boolean not null default true;

alter table public.clinic_settings
add column if not exists notify_appointment_rescheduled boolean not null default true;

alter table public.clinic_settings
add column if not exists notify_appointment_cancelled boolean not null default true;

alter table public.clinic_settings
add column if not exists notify_appointment_reminder boolean not null default false;

alter table public.clinic_settings
add column if not exists reminder_hours_before integer not null default 24
  check (reminder_hours_before > 0 and reminder_hours_before <= 168);

alter table public.clinic_settings
add column if not exists sms_enabled boolean not null default false;

alter table public.clinic_settings
add column if not exists sms_provider text
  check (sms_provider in ('semaphore','twilio','infobip'));

-- 2. Confirmation token and notification tracking on appointments
alter table public.appointments
add column if not exists confirmation_token uuid unique default gen_random_uuid();

alter table public.appointments
add column if not exists patient_notified_at timestamptz;

-- 3. Holiday flag on blocked_dates
alter table public.blocked_dates
add column if not exists is_holiday boolean not null default false;

-- 4. appointment_notifications table
create table if not exists public.appointment_notifications (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  channel text not null default 'email' check (channel in ('email','sms')),
  notification_type text not null check (notification_type in (
    'booking_confirmation',
    'appointment_confirmed',
    'appointment_rescheduled',
    'appointment_cancelled',
    'appointment_reminder'
  )),
  recipient text not null,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  error text,
  metadata jsonb not null default '{}',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists appt_notifications_clinic_appt_idx
  on public.appointment_notifications(clinic_id, appointment_id, created_at desc);

create index if not exists appt_notifications_clinic_created_idx
  on public.appointment_notifications(clinic_id, created_at desc);

alter table public.appointment_notifications enable row level security;

drop policy if exists "Super admins can manage appointment notifications" on public.appointment_notifications;
create policy "Super admins can manage appointment notifications"
on public.appointment_notifications
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "Clinic users can view own appointment notifications" on public.appointment_notifications;
create policy "Clinic users can view own appointment notifications"
on public.appointment_notifications
for select
to authenticated
using (clinic_id = public.get_my_clinic_id());
