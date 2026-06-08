create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  full_name text not null,
  email text,
  phone text not null,
  birth_date date,
  gender text check (gender in ('male','female','other','prefer_not_to_say')),
  address_line_1 text,
  address_line_2 text,
  barangay text,
  city text,
  province text,
  region text,
  postal_code text,
  emergency_contact_name text,
  emergency_contact_phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, phone)
);

create table if not exists public.doctors (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  specialization text,
  license_no text,
  email text,
  phone text,
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  name text not null,
  description text,
  category text,
  duration_minutes integer not null check (duration_minutes > 0),
  price_centavos integer not null default 0 check (price_centavos >= 0),
  color text not null default '#2563EB',
  icon text,
  online_booking_enabled boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  doctor_id uuid references public.doctors(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  is_open boolean not null default true,
  open_time time,
  close_time time,
  break_start time,
  break_end time,
  slot_interval_minutes integer not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, doctor_id, day_of_week)
);

create table if not exists public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  doctor_id uuid references public.doctors(id) on delete cascade,
  title text not null,
  reason text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blocked_dates_valid_range check (end_at > start_at)
);

drop trigger if exists set_patients_updated_at on public.patients;
create trigger set_patients_updated_at
before update on public.patients
for each row execute function public.set_updated_at();

drop trigger if exists set_doctors_updated_at on public.doctors;
create trigger set_doctors_updated_at
before update on public.doctors
for each row execute function public.set_updated_at();

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at
before update on public.services
for each row execute function public.set_updated_at();

drop trigger if exists set_availability_rules_updated_at on public.availability_rules;
create trigger set_availability_rules_updated_at
before update on public.availability_rules
for each row execute function public.set_updated_at();

drop trigger if exists set_blocked_dates_updated_at on public.blocked_dates;
create trigger set_blocked_dates_updated_at
before update on public.blocked_dates
for each row execute function public.set_updated_at();

create index if not exists patients_clinic_id_created_at_idx on public.patients(clinic_id, created_at desc);
create index if not exists patients_clinic_search_idx on public.patients(clinic_id, lower(full_name), lower(email), phone);
create index if not exists doctors_clinic_id_active_idx on public.doctors(clinic_id, active, full_name);
create index if not exists services_clinic_id_active_idx on public.services(clinic_id, active, name);
create index if not exists availability_rules_clinic_doctor_idx on public.availability_rules(clinic_id, doctor_id, day_of_week);
create index if not exists blocked_dates_clinic_start_idx on public.blocked_dates(clinic_id, start_at desc);

alter table public.patients enable row level security;
alter table public.doctors enable row level security;
alter table public.services enable row level security;
alter table public.availability_rules enable row level security;
alter table public.blocked_dates enable row level security;

drop policy if exists "Super admins can manage patients" on public.patients;
create policy "Super admins can manage patients"
on public.patients
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "Clinic users can manage own patients" on public.patients;
create policy "Clinic users can manage own patients"
on public.patients
for all
to authenticated
using (clinic_id = public.get_my_clinic_id())
with check (clinic_id = public.get_my_clinic_id());

drop policy if exists "Super admins can manage doctors" on public.doctors;
create policy "Super admins can manage doctors"
on public.doctors
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "Clinic users can manage own doctors" on public.doctors;
create policy "Clinic users can manage own doctors"
on public.doctors
for all
to authenticated
using (clinic_id = public.get_my_clinic_id())
with check (clinic_id = public.get_my_clinic_id());

drop policy if exists "Super admins can manage services" on public.services;
create policy "Super admins can manage services"
on public.services
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "Clinic users can manage own services" on public.services;
create policy "Clinic users can manage own services"
on public.services
for all
to authenticated
using (clinic_id = public.get_my_clinic_id())
with check (clinic_id = public.get_my_clinic_id());

drop policy if exists "Super admins can manage availability rules" on public.availability_rules;
create policy "Super admins can manage availability rules"
on public.availability_rules
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "Clinic users can manage own availability rules" on public.availability_rules;
create policy "Clinic users can manage own availability rules"
on public.availability_rules
for all
to authenticated
using (clinic_id = public.get_my_clinic_id())
with check (clinic_id = public.get_my_clinic_id());

drop policy if exists "Super admins can manage blocked dates" on public.blocked_dates;
create policy "Super admins can manage blocked dates"
on public.blocked_dates
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "Clinic users can manage own blocked dates" on public.blocked_dates;
create policy "Clinic users can manage own blocked dates"
on public.blocked_dates
for all
to authenticated
using (clinic_id = public.get_my_clinic_id())
with check (clinic_id = public.get_my_clinic_id());
