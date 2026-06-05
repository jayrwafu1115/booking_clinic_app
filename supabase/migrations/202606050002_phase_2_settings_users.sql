alter table public.profiles
add column if not exists status text not null default 'active'
check (status in ('active','inactive'));

alter table public.profiles
add column if not exists deactivated_at timestamptz;

alter table public.profiles
add column if not exists deactivated_by uuid references auth.users(id) on delete set null;

create table if not exists public.user_invites (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  email text not null,
  role text not null check (role in ('clinic_owner','receptionist','doctor','staff')),
  token text not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','expired','revoked')),
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_user_invites_updated_at on public.user_invites;
create trigger set_user_invites_updated_at
before update on public.user_invites
for each row execute function public.set_updated_at();

create index if not exists user_invites_clinic_id_created_at_idx
on public.user_invites(clinic_id, created_at desc);

create index if not exists user_invites_email_status_idx
on public.user_invites(lower(email), status);

alter table public.user_invites enable row level security;

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid() and status = 'active')
with check (
  id = auth.uid()
  and clinic_id = public.get_my_clinic_id()
  and role = public.get_my_role()
  and status = 'active'
  and deactivated_at is null
  and deactivated_by is null
);

drop policy if exists "Clinic owners can manage clinic profiles" on public.profiles;
create policy "Clinic owners can insert clinic profiles"
on public.profiles
for insert
to authenticated
with check (
  clinic_id = public.get_my_clinic_id()
  and public.get_my_role() = 'clinic_owner'
  and role in ('clinic_owner','receptionist','doctor','staff')
);

create policy "Clinic owners can update clinic profiles"
on public.profiles
for update
to authenticated
using (
  clinic_id = public.get_my_clinic_id()
  and public.get_my_role() = 'clinic_owner'
  and role in ('clinic_owner','receptionist','doctor','staff')
)
with check (
  clinic_id = public.get_my_clinic_id()
  and public.get_my_role() = 'clinic_owner'
  and role in ('clinic_owner','receptionist','doctor','staff')
);

drop policy if exists "Clinic owners can insert own clinic settings" on public.clinic_settings;
create policy "Clinic owners can insert own clinic settings"
on public.clinic_settings
for insert
to authenticated
with check (clinic_id = public.get_my_clinic_id() and public.get_my_role() = 'clinic_owner');

drop policy if exists "Super admins can manage user invites" on public.user_invites;
create policy "Super admins can manage user invites"
on public.user_invites
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "Clinic owners can manage own user invites" on public.user_invites;
create policy "Clinic owners can manage own user invites"
on public.user_invites
for all
to authenticated
using (clinic_id = public.get_my_clinic_id() and public.get_my_role() = 'clinic_owner')
with check (
  clinic_id = public.get_my_clinic_id()
  and public.get_my_role() = 'clinic_owner'
  and role in ('clinic_owner','receptionist','doctor','staff')
);
