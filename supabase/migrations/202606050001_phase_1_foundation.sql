create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  email text,
  phone text,
  address_line_1 text,
  address_line_2 text,
  barangay text,
  city text,
  province text,
  region text,
  postal_code text,
  country text not null default 'Philippines',
  timezone text not null default 'Asia/Manila',
  logo_url text,
  primary_color text not null default '#2563EB',
  status text not null default 'active' check (status in ('active','inactive','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinics_country_ph_only check (country = 'Philippines'),
  constraint clinics_timezone_manila_only check (timezone = 'Asia/Manila')
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete cascade,
  role text not null default 'clinic_owner' check (role in ('super_admin','clinic_owner','receptionist','doctor','staff')),
  full_name text not null,
  email text not null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_settings (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null unique references public.clinics(id) on delete cascade,
  clinic_type text not null default 'medical' check (clinic_type in ('medical','dental','aesthetic','physiotherapy','diagnostic','wellness','other')),
  prc_number text,
  ptr_number text,
  tin text,
  philhealth_accreditation_no text,
  default_language text not null default 'en',
  default_currency text not null default 'PHP',
  timezone text not null default 'Asia/Manila',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinic_settings_currency_php_only check (default_currency = 'PHP'),
  constraint clinic_settings_timezone_manila_only check (timezone = 'Asia/Manila')
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

drop trigger if exists set_clinics_updated_at on public.clinics;
create trigger set_clinics_updated_at
before update on public.clinics
for each row execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_clinic_settings_updated_at on public.clinic_settings;
create trigger set_clinic_settings_updated_at
before update on public.clinic_settings
for each row execute function public.set_updated_at();

create index if not exists profiles_clinic_id_idx on public.profiles(clinic_id);
create index if not exists clinic_settings_clinic_id_idx on public.clinic_settings(clinic_id);
create index if not exists audit_logs_clinic_id_created_at_idx on public.audit_logs(clinic_id, created_at desc);

create or replace function public.get_my_clinic_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select clinic_id
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_my_role() = 'super_admin', false);
$$;

alter table public.clinics enable row level security;
alter table public.profiles enable row level security;
alter table public.clinic_settings enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Super admins can manage clinics" on public.clinics;
create policy "Super admins can manage clinics"
on public.clinics
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "Clinic users can read own clinic" on public.clinics;
create policy "Clinic users can read own clinic"
on public.clinics
for select
to authenticated
using (id = public.get_my_clinic_id());

drop policy if exists "Clinic owners can update own clinic" on public.clinics;
create policy "Clinic owners can update own clinic"
on public.clinics
for update
to authenticated
using (id = public.get_my_clinic_id() and public.get_my_role() = 'clinic_owner')
with check (id = public.get_my_clinic_id() and public.get_my_role() = 'clinic_owner');

drop policy if exists "Super admins can manage profiles" on public.profiles;
create policy "Super admins can manage profiles"
on public.profiles
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "Clinic users can read clinic profiles" on public.profiles;
create policy "Clinic users can read clinic profiles"
on public.profiles
for select
to authenticated
using (clinic_id = public.get_my_clinic_id() or id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and clinic_id = public.get_my_clinic_id());

drop policy if exists "Clinic owners can manage clinic profiles" on public.profiles;
create policy "Clinic owners can manage clinic profiles"
on public.profiles
for all
to authenticated
using (clinic_id = public.get_my_clinic_id() and public.get_my_role() = 'clinic_owner')
with check (clinic_id = public.get_my_clinic_id() and public.get_my_role() = 'clinic_owner');

drop policy if exists "Super admins can manage clinic settings" on public.clinic_settings;
create policy "Super admins can manage clinic settings"
on public.clinic_settings
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "Clinic users can read own clinic settings" on public.clinic_settings;
create policy "Clinic users can read own clinic settings"
on public.clinic_settings
for select
to authenticated
using (clinic_id = public.get_my_clinic_id());

drop policy if exists "Clinic owners can update own clinic settings" on public.clinic_settings;
create policy "Clinic owners can update own clinic settings"
on public.clinic_settings
for update
to authenticated
using (clinic_id = public.get_my_clinic_id() and public.get_my_role() = 'clinic_owner')
with check (clinic_id = public.get_my_clinic_id() and public.get_my_role() = 'clinic_owner');

drop policy if exists "Super admins can manage audit logs" on public.audit_logs;
create policy "Super admins can manage audit logs"
on public.audit_logs
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "Clinic users can read own audit logs" on public.audit_logs;
create policy "Clinic users can read own audit logs"
on public.audit_logs
for select
to authenticated
using (clinic_id = public.get_my_clinic_id());

drop policy if exists "Clinic users can insert own audit logs" on public.audit_logs;
create policy "Clinic users can insert own audit logs"
on public.audit_logs
for insert
to authenticated
with check (clinic_id = public.get_my_clinic_id() and actor_id = auth.uid());

revoke all on function public.get_my_clinic_id() from public;
revoke all on function public.get_my_role() from public;
revoke all on function public.is_super_admin() from public;
grant execute on function public.get_my_clinic_id() to authenticated;
grant execute on function public.get_my_role() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
