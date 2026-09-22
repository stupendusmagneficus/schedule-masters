create extension if not exists "btree_gist";
create extension if not exists "pgcrypto";

create type public.workspace_status as enum ('active', 'paused', 'archived');
create type public.workspace_role as enum ('owner', 'admin', 'member');
create type public.availability_exception_kind as enum ('blocked', 'extra', 'modified');
create type public.appointment_status as enum (
  'pending',
  'confirmed',
  'cancelled_by_customer',
  'cancelled_by_master',
  'completed',
  'no_show'
);
create type public.appointment_source as enum ('public_booking', 'master_created', 'imported');
create type public.access_token_purpose as enum ('manage', 'cancel', 'reschedule');
create type public.notification_channel as enum ('email', 'push');
create type public.notification_type as enum (
  'confirmation',
  'reminder',
  'cancellation',
  'rescheduled'
);
create type public.notification_job_status as enum (
  'pending',
  'processing',
  'sent',
  'failed',
  'cancelled'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'Europe/Prague',
  locale text not null default 'cs-CZ',
  status public.workspace_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null check (duration_minutes > 0),
  buffer_before_minutes integer not null default 0 check (buffer_before_minutes >= 0),
  buffer_after_minutes integer not null default 0 check (buffer_after_minutes >= 0),
  price_amount numeric(10, 2) not null check (price_amount >= 0),
  currency char(3) not null default 'CZK',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  normalized_email text,
  normalized_phone text,
  notes text,
  marketing_consent_at timestamptz,
  last_visit_at timestamptz,
  auth_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  anonymized_at timestamptz
);

create unique index customers_workspace_auth_user_unique
  on public.customers (workspace_id, auth_user_id)
  where auth_user_id is not null;

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_local_time time not null,
  end_local_time time not null,
  valid_from date not null,
  valid_until date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_local_time > start_local_time),
  check (valid_until is null or valid_until >= valid_from)
);

create table public.availability_breaks (
  id uuid primary key default gen_random_uuid(),
  availability_rule_id uuid not null references public.availability_rules(id) on delete cascade,
  start_local_time time not null,
  end_local_time time not null,
  check (end_local_time > start_local_time)
);

create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  kind public.availability_exception_kind not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.booking_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  service_id uuid references public.services(id) on delete set null,
  service_name_snapshot text not null,
  duration_minutes_snapshot integer not null check (duration_minutes_snapshot > 0),
  price_amount_snapshot numeric(10, 2) not null check (price_amount_snapshot >= 0),
  currency_snapshot char(3) not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'pending',
  source public.appointment_source not null,
  customer_note text,
  master_note text,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  check (ends_at > starts_at)
);

alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    workspace_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status in ('pending', 'confirmed'));

create table public.appointment_access_tokens (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  token_hash text not null,
  purpose public.access_token_purpose not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  channel public.notification_channel not null,
  type public.notification_type not null,
  recipient text not null,
  scheduled_for timestamptz not null,
  status public.notification_job_status not null default 'pending',
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index workspace_members_user_workspace_idx
  on public.workspace_members (user_id, workspace_id);
create index services_workspace_active_sort_idx
  on public.services (workspace_id, is_active, sort_order);
create index customers_workspace_email_idx
  on public.customers (workspace_id, normalized_email);
create index customers_workspace_phone_idx
  on public.customers (workspace_id, normalized_phone);
create index availability_rules_workspace_day_idx
  on public.availability_rules (workspace_id, day_of_week, valid_from);
create index availability_exceptions_workspace_time_idx
  on public.availability_exceptions (workspace_id, starts_at, ends_at);
create index appointments_workspace_start_idx
  on public.appointments (workspace_id, starts_at);
create index appointments_workspace_status_start_idx
  on public.appointments (workspace_id, status, starts_at);
create index appointment_access_tokens_hash_idx
  on public.appointment_access_tokens (token_hash);
create index notification_jobs_status_schedule_idx
  on public.notification_jobs (status, scheduled_for);

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();
create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();
create trigger availability_rules_set_updated_at
  before update on public.availability_rules
  for each row execute function public.set_updated_at();
create trigger availability_exceptions_set_updated_at
  before update on public.availability_exceptions
  for each row execute function public.set_updated_at();
create trigger booking_links_set_updated_at
  before update on public.booking_links
  for each row execute function public.set_updated_at();
create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = (select auth.uid())
  );
$$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.services enable row level security;
alter table public.customers enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_breaks enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.booking_links enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_access_tokens enable row level security;
alter table public.notification_jobs enable row level security;

create policy workspaces_member_access on public.workspaces
  for all to authenticated
  using (public.is_workspace_member(id))
  with check (public.is_workspace_member(id));

create policy workspace_members_member_access on public.workspace_members
  for select to authenticated
  using (public.is_workspace_member(workspace_id) or user_id = (select auth.uid()));

create policy services_member_access on public.services
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy customers_member_access on public.customers
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy availability_rules_member_access on public.availability_rules
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy availability_breaks_member_access on public.availability_breaks
  for all to authenticated
  using (
    exists (
      select 1
      from public.availability_rules
      where id = availability_rule_id
        and public.is_workspace_member(workspace_id)
    )
  )
  with check (
    exists (
      select 1
      from public.availability_rules
      where id = availability_rule_id
        and public.is_workspace_member(workspace_id)
    )
  );

create policy availability_exceptions_member_access on public.availability_exceptions
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy booking_links_member_access on public.booking_links
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy appointments_member_access on public.appointments
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy appointment_access_tokens_member_access on public.appointment_access_tokens
  for all to authenticated
  using (
    exists (
      select 1
      from public.appointments
      where id = appointment_id
        and public.is_workspace_member(workspace_id)
    )
  )
  with check (
    exists (
      select 1
      from public.appointments
      where id = appointment_id
        and public.is_workspace_member(workspace_id)
    )
  );

create policy notification_jobs_member_access on public.notification_jobs
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
