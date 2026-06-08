create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  doctor_id uuid references public.doctors(id) on delete set null,
  service_id uuid not null references public.services(id) on delete restrict,
  status text not null default 'booked' check (status in ('booked','confirmed','checked_in','in_progress','completed','cancelled','no_show')),
  source text not null default 'manual' check (source in ('manual','widget','ai','phone','walk_in')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  notes text,
  cancellation_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_valid_range check (end_at > start_at)
);

drop trigger if exists set_appointments_updated_at on public.appointments;
create trigger set_appointments_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

create index if not exists appointments_clinic_id_start_at_idx on public.appointments(clinic_id, start_at);
create index if not exists appointments_clinic_id_status_idx on public.appointments(clinic_id, status);
create index if not exists appointments_clinic_id_doctor_id_start_at_idx on public.appointments(clinic_id, doctor_id, start_at);

alter table public.appointments enable row level security;

drop policy if exists "Super admins can manage appointments" on public.appointments;
create policy "Super admins can manage appointments"
on public.appointments
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "Clinic users can manage own appointments" on public.appointments;
create policy "Clinic users can manage own appointments"
on public.appointments
for all
to authenticated
using (clinic_id = public.get_my_clinic_id())
with check (clinic_id = public.get_my_clinic_id());
