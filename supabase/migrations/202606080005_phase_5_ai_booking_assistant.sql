alter table public.clinic_settings
add column if not exists ai_provider text not null default 'openai'
check (ai_provider in ('openai','ollama'));

alter table public.clinic_settings
add column if not exists ai_model text not null default 'gpt-4o';

alter table public.clinic_settings
add column if not exists ai_tone text not null default 'professional'
check (ai_tone in ('professional','friendly','formal','casual'));

alter table public.clinic_settings
add column if not exists ai_welcome_message text not null default 'Welcome! I am your AI booking assistant. How can I help you today?';

alter table public.clinic_settings
add column if not exists ai_booking_instructions text;

alter table public.clinic_settings
add column if not exists ai_enabled boolean not null default true;

alter table public.clinic_settings
add column if not exists ai_widget_enabled boolean not null default true;

create table if not exists public.faq_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  question text not null,
  answer text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  patient_temp_id text,
  channel text not null default 'widget' check (channel in ('widget','dashboard','facebook','whatsapp','sms')),
  status text not null default 'open' check (status in ('open','booked','handoff','closed')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  role text not null check (role in ('user','assistant','system','tool')),
  content text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

drop trigger if exists set_faq_items_updated_at on public.faq_items;
create trigger set_faq_items_updated_at
before update on public.faq_items
for each row execute function public.set_updated_at();

drop trigger if exists set_ai_conversations_updated_at on public.ai_conversations;
create trigger set_ai_conversations_updated_at
before update on public.ai_conversations
for each row execute function public.set_updated_at();

create index if not exists faq_items_clinic_active_idx on public.faq_items(clinic_id, active, created_at desc);
create index if not exists ai_conversations_clinic_status_idx on public.ai_conversations(clinic_id, status, created_at desc);
create index if not exists ai_messages_conversation_created_idx on public.ai_messages(conversation_id, created_at);
create index if not exists ai_messages_clinic_created_idx on public.ai_messages(clinic_id, created_at desc);

alter table public.faq_items enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

drop policy if exists "Super admins can manage FAQ items" on public.faq_items;
create policy "Super admins can manage FAQ items"
on public.faq_items
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "Clinic users can manage own FAQ items" on public.faq_items;
create policy "Clinic users can manage own FAQ items"
on public.faq_items
for all
to authenticated
using (clinic_id = public.get_my_clinic_id())
with check (clinic_id = public.get_my_clinic_id());

drop policy if exists "Super admins can manage AI conversations" on public.ai_conversations;
create policy "Super admins can manage AI conversations"
on public.ai_conversations
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "Clinic users can manage own AI conversations" on public.ai_conversations;
create policy "Clinic users can manage own AI conversations"
on public.ai_conversations
for all
to authenticated
using (clinic_id = public.get_my_clinic_id())
with check (clinic_id = public.get_my_clinic_id());

drop policy if exists "Super admins can manage AI messages" on public.ai_messages;
create policy "Super admins can manage AI messages"
on public.ai_messages
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "Clinic users can manage own AI messages" on public.ai_messages;
create policy "Clinic users can manage own AI messages"
on public.ai_messages
for all
to authenticated
using (clinic_id = public.get_my_clinic_id())
with check (
  clinic_id = public.get_my_clinic_id()
  and exists (
    select 1
    from public.ai_conversations c
    where c.id = conversation_id
      and c.clinic_id = public.get_my_clinic_id()
  )
);
