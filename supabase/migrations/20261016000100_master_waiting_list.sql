-- SCH-98: workspace-scoped, master-managed waiting list.
create type public.waiting_list_status as enum ('active', 'booked', 'removed');

create table public.waiting_list_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  service_id uuid not null references public.services(id) on delete restrict,
  desired_date date not null,
  desired_time_from time,
  desired_time_to time,
  note text,
  status public.waiting_list_status not null default 'active',
  appointment_id uuid references public.appointments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (desired_time_from is null or desired_time_to is null or desired_time_to > desired_time_from)
);

create index waiting_list_workspace_status_date_idx
  on public.waiting_list_entries (workspace_id, status, desired_date, created_at);

create table public.waiting_list_entry_events (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.waiting_list_entries(id) on delete cascade,
  from_status public.waiting_list_status,
  to_status public.waiting_list_status not null,
  appointment_id uuid references public.appointments(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index waiting_list_entry_events_entry_date_idx
  on public.waiting_list_entry_events (entry_id, created_at, id);

alter table public.waiting_list_entry_events enable row level security;
revoke all on public.waiting_list_entry_events from public, anon, authenticated;

create or replace function public.record_waiting_list_entry_event()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.waiting_list_entry_events (entry_id, from_status, to_status, actor_user_id)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.waiting_list_entry_events (entry_id, from_status, to_status, appointment_id, actor_user_id)
    values (new.id, old.status, new.status, new.appointment_id, auth.uid());
  end if;
  return new;
end;
$$;

create trigger waiting_list_entry_status_event
after insert or update of status on public.waiting_list_entries
for each row execute function public.record_waiting_list_entry_event();
revoke all on function public.record_waiting_list_entry_event() from public, anon, authenticated;

alter table public.waiting_list_entries enable row level security;
revoke all on public.waiting_list_entries from public, anon, authenticated;

create or replace function public.list_master_waiting_list(p_workspace_id uuid)
returns table (
  id uuid, customer_id uuid, customer_name text, customer_email text,
  customer_phone text, service_id uuid, service_name text,
  duration_minutes integer, desired_date date, desired_time_from time,
  desired_time_to time, note text, status public.waiting_list_status,
  appointment_id uuid, created_at timestamptz
)
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;
  return query
  select e.id, e.customer_id, e.customer_name, e.customer_email,
         e.customer_phone, e.service_id, s.name, s.duration_minutes,
         e.desired_date, e.desired_time_from, e.desired_time_to,
         e.note, e.status, e.appointment_id, e.created_at
    from public.waiting_list_entries e
    join public.services s on s.id = e.service_id and s.workspace_id = e.workspace_id
   where e.workspace_id = p_workspace_id
   order by (e.status = 'active') desc, e.desired_date, e.created_at, e.id;
end;
$$;

create or replace function public.create_master_waiting_list_entry(
  p_workspace_id uuid, p_service_id uuid, p_desired_date date,
  p_customer_name text, p_customer_id uuid default null,
  p_customer_email text default null, p_customer_phone text default null,
  p_desired_time_from time default null, p_desired_time_to time default null,
  p_note text default null
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_customer public.customers%rowtype; v_id uuid;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;
  if nullif(trim(p_customer_name), '') is null or p_desired_date is null then
    raise exception 'Customer name and desired date are required';
  end if;
  if p_customer_id is null
     and nullif(trim(p_customer_email), '') is null
     and nullif(trim(p_customer_phone), '') is null then
    raise exception 'Email or phone is required for a new contact';
  end if;
  if p_desired_time_from is not null and p_desired_time_to is not null and p_desired_time_to <= p_desired_time_from then
    raise exception 'Invalid desired time range';
  end if;
  if not exists (select 1 from public.services s where s.id = p_service_id and s.workspace_id = p_workspace_id and s.is_active) then
    raise exception 'Active service not found';
  end if;
  if p_customer_id is not null then
    select * into v_customer from public.customers c
     where c.id = p_customer_id and c.workspace_id = p_workspace_id and c.anonymized_at is null;
    if not found then raise exception 'Customer not found'; end if;
  end if;
  insert into public.waiting_list_entries (
    workspace_id, customer_id, customer_name, customer_email, customer_phone,
    service_id, desired_date, desired_time_from, desired_time_to, note
  ) values (
    p_workspace_id, p_customer_id,
    coalesce(v_customer.name, trim(p_customer_name)),
    coalesce(v_customer.email, nullif(trim(p_customer_email), '')),
    coalesce(v_customer.phone, nullif(trim(p_customer_phone), '')),
    p_service_id, p_desired_date, p_desired_time_from, p_desired_time_to,
    nullif(trim(p_note), '')
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.update_master_waiting_list_entry(
  p_workspace_id uuid, p_entry_id uuid, p_service_id uuid,
  p_desired_date date, p_customer_name text, p_customer_id uuid default null,
  p_customer_email text default null, p_customer_phone text default null,
  p_desired_time_from time default null, p_desired_time_to time default null,
  p_note text default null
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_customer public.customers%rowtype;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;
  if nullif(trim(p_customer_name), '') is null or p_desired_date is null then
    raise exception 'Customer name and desired date are required';
  end if;
  if p_customer_id is null
     and nullif(trim(p_customer_email), '') is null
     and nullif(trim(p_customer_phone), '') is null then
    raise exception 'Email or phone is required for a new contact';
  end if;
  if p_desired_time_from is not null and p_desired_time_to is not null and p_desired_time_to <= p_desired_time_from then
    raise exception 'Invalid desired time range';
  end if;
  if not exists (select 1 from public.services s where s.id = p_service_id and s.workspace_id = p_workspace_id and s.is_active) then
    raise exception 'Active service not found';
  end if;
  if p_customer_id is not null then
    select * into v_customer from public.customers c
     where c.id = p_customer_id and c.workspace_id = p_workspace_id and c.anonymized_at is null;
    if not found then raise exception 'Customer not found'; end if;
  end if;
  update public.waiting_list_entries e
     set customer_id = p_customer_id,
         customer_name = coalesce(v_customer.name, trim(p_customer_name)),
         customer_email = coalesce(v_customer.email, nullif(trim(p_customer_email), '')),
         customer_phone = coalesce(v_customer.phone, nullif(trim(p_customer_phone), '')),
         service_id = p_service_id, desired_date = p_desired_date,
         desired_time_from = p_desired_time_from, desired_time_to = p_desired_time_to,
         note = nullif(trim(p_note), ''), updated_at = now()
   where e.id = p_entry_id and e.workspace_id = p_workspace_id and e.status = 'active';
  if not found then raise exception 'Active waiting list entry not found'; end if;
  return p_entry_id;
end;
$$;

create or replace function public.set_master_waiting_list_entry_status(
  p_workspace_id uuid, p_entry_id uuid, p_status public.waiting_list_status,
  p_appointment_id uuid default null
)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;
  if p_status not in ('booked', 'removed') then raise exception 'Invalid status'; end if;
  if p_status = 'booked' and not exists (
    select 1
      from public.waiting_list_entries e
      join public.services s on s.id = e.service_id and s.workspace_id = e.workspace_id
      join public.workspaces w on w.id = e.workspace_id
      join public.appointments a on a.id = p_appointment_id and a.workspace_id = e.workspace_id
      join public.customers c on c.id = a.customer_id and c.workspace_id = a.workspace_id
     where e.id = p_entry_id and e.workspace_id = p_workspace_id and e.status = 'active'
       and a.status in ('pending', 'confirmed')
       and a.service_id = e.service_id
       and a.duration_minutes_snapshot = s.duration_minutes
       and (a.starts_at at time zone w.timezone)::date = e.desired_date
       and (e.desired_time_from is null or (a.starts_at at time zone w.timezone)::time >= e.desired_time_from)
       and (e.desired_time_to is null or (a.starts_at at time zone w.timezone)::time <= e.desired_time_to)
       and (
         e.customer_id = a.customer_id
         or (nullif(trim(e.customer_email), '') is not null and lower(trim(c.email)) = lower(trim(e.customer_email)))
         or (nullif(regexp_replace(coalesce(e.customer_phone, ''), '\D', '', 'g'), '') is not null
             and regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') = regexp_replace(coalesce(e.customer_phone, ''), '\D', '', 'g'))
       )
  ) then raise exception 'Appointment does not match the waiting list entry'; end if;
  update public.waiting_list_entries e
     set status = p_status, appointment_id = case when p_status = 'booked' then p_appointment_id else null end,
         updated_at = now()
   where e.id = p_entry_id and e.workspace_id = p_workspace_id and e.status = 'active';
  if not found then raise exception 'Active waiting list entry not found'; end if;
  return;
end;
$$;

create or replace function public.list_master_waiting_list_matches(
  p_workspace_id uuid, p_cancelled_appointment_id uuid
)
returns table (
  id uuid, customer_id uuid, customer_name text, customer_email text,
  customer_phone text, service_id uuid, service_name text,
  duration_minutes integer, desired_date date, desired_time_from time,
  desired_time_to time, note text, starts_at timestamptz, ends_at timestamptz
)
language plpgsql security definer set search_path = ''
as $$
declare v_appointment public.appointments%rowtype; v_timezone text;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;
  select * into v_appointment from public.appointments a
   where a.id = p_cancelled_appointment_id and a.workspace_id = p_workspace_id
     and a.status in ('cancelled_by_master', 'cancelled_by_customer');
  if not found then raise exception 'Cancelled appointment not found'; end if;
  select w.timezone into v_timezone from public.workspaces w where w.id = p_workspace_id;
  return query
  select e.id, e.customer_id, e.customer_name, e.customer_email,
         e.customer_phone, e.service_id, s.name, s.duration_minutes,
         e.desired_date, e.desired_time_from, e.desired_time_to, e.note,
         v_appointment.starts_at, v_appointment.ends_at
    from public.waiting_list_entries e
    join public.services s on s.id = e.service_id and s.workspace_id = e.workspace_id
   where e.workspace_id = p_workspace_id and e.status = 'active'
     and e.service_id = v_appointment.service_id
     and s.is_active = true
     and s.archived_at is null
     and s.duration_minutes = v_appointment.duration_minutes_snapshot
     and e.desired_date = (v_appointment.starts_at at time zone v_timezone)::date
     and (e.desired_time_from is null or (v_appointment.starts_at at time zone v_timezone)::time >= e.desired_time_from)
     and (e.desired_time_to is null or (v_appointment.starts_at at time zone v_timezone)::time <= e.desired_time_to)
   order by e.created_at, e.id;
end;
$$;

revoke all on function public.list_master_waiting_list(uuid) from public, anon;
revoke all on function public.create_master_waiting_list_entry(uuid, uuid, date, text, uuid, text, text, time, time, text) from public, anon;
revoke all on function public.update_master_waiting_list_entry(uuid, uuid, uuid, date, text, uuid, text, text, time, time, text) from public, anon;
revoke all on function public.set_master_waiting_list_entry_status(uuid, uuid, public.waiting_list_status, uuid) from public, anon;
revoke all on function public.list_master_waiting_list_matches(uuid, uuid) from public, anon;
grant execute on function public.list_master_waiting_list(uuid) to authenticated;
grant execute on function public.create_master_waiting_list_entry(uuid, uuid, date, text, uuid, text, text, time, time, text) to authenticated;
grant execute on function public.update_master_waiting_list_entry(uuid, uuid, uuid, date, text, uuid, text, text, time, time, text) to authenticated;
grant execute on function public.set_master_waiting_list_entry_status(uuid, uuid, public.waiting_list_status, uuid) to authenticated;
grant execute on function public.list_master_waiting_list_matches(uuid, uuid) to authenticated;
