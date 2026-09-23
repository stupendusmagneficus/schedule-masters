-- SCH-51: lifecycle transitions, idempotent public booking, and safe rescheduling.
-- This migration is additive. Existing migrations remain immutable.

create type public.appointment_event_type as enum (
  'created',
  'confirmed',
  'rescheduled',
  'cancelled',
  'completed',
  'no_show'
);

create table public.appointment_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  from_status public.appointment_status,
  to_status public.appointment_status not null,
  event_type public.appointment_event_type not null,
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index appointment_events_appointment_created_idx
  on public.appointment_events (appointment_id, created_at);

create table public.public_booking_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  idempotency_key text not null,
  response jsonb,
  created_at timestamptz not null default now(),
  unique (workspace_id, idempotency_key)
);

alter table public.appointments
  add column buffer_before_minutes_snapshot integer not null default 0
    check (buffer_before_minutes_snapshot >= 0),
  add column buffer_after_minutes_snapshot integer not null default 0
    check (buffer_after_minutes_snapshot >= 0),
  add column occupied_range tstzrange;

update public.appointments
set occupied_range = tstzrange(
  starts_at - (buffer_before_minutes_snapshot * interval '1 minute'),
  ends_at + (buffer_after_minutes_snapshot * interval '1 minute'),
  '[)'
);

alter table public.appointments
  alter column occupied_range set not null;

create or replace function public.set_appointment_occupied_range()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.occupied_range := tstzrange(
    new.starts_at - (new.buffer_before_minutes_snapshot * interval '1 minute'),
    new.ends_at + (new.buffer_after_minutes_snapshot * interval '1 minute'),
    '[)'
  );
  return new;
end;
$$;

create trigger appointments_set_occupied_range
  before insert or update of starts_at, ends_at,
    buffer_before_minutes_snapshot, buffer_after_minutes_snapshot
  on public.appointments
  for each row execute function public.set_appointment_occupied_range();

alter table public.appointments drop constraint appointments_no_overlap;

alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    workspace_id with =,
    occupied_range with &&
  )
  where (status in ('pending', 'confirmed'));

alter table public.appointment_events enable row level security;
alter table public.public_booking_requests enable row level security;

create policy appointment_events_member_access on public.appointment_events
  for select to authenticated
  using (
    exists (
      select 1
      from public.appointments
      where id = appointment_id
        and public.is_workspace_member(workspace_id)
    )
  );

revoke all on public.appointment_events from anon;
revoke all on public.public_booking_requests from anon, authenticated;

drop policy appointments_member_access on public.appointments;

create policy appointments_member_select on public.appointments
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy appointments_member_insert on public.appointments
  for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

create or replace function public.get_public_available_slots(
  p_slug text,
  p_service_id uuid,
  p_date date
)
returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_workspace_id uuid;
  v_timezone text;
  v_duration integer;
  v_buffer_before integer;
  v_buffer_after integer;
begin
  select bl.workspace_id, w.timezone
  into v_workspace_id, v_timezone
  from public.booking_links bl
  join public.workspaces w on w.id = bl.workspace_id
  where bl.slug = lower(trim(p_slug))
    and bl.is_active = true
    and w.status = 'active';

  select s.duration_minutes, s.buffer_before_minutes, s.buffer_after_minutes
  into v_duration, v_buffer_before, v_buffer_after
  from public.services s
  where s.id = p_service_id
    and s.workspace_id = v_workspace_id
    and s.is_active = true
    and s.archived_at is null;

  if v_workspace_id is null or v_duration is null then
    return;
  end if;

  return query
  with active_exceptions as (
    select
      ae.kind,
      ae.starts_at,
      ae.ends_at,
      ae.starts_at at time zone v_timezone as local_start,
      ae.ends_at at time zone v_timezone as local_end
    from public.availability_exceptions ae
    where ae.workspace_id = v_workspace_id
      and ae.ends_at > (p_date::timestamp at time zone v_timezone)
      and ae.starts_at < ((p_date + 1)::timestamp at time zone v_timezone)
  ),
  modified_windows as (
    select local_start, local_end, null::uuid as availability_rule_id
    from active_exceptions
    where kind = 'modified'
  ),
  base_windows as (
    select
      p_date + ar.start_local_time as local_start,
      p_date + ar.end_local_time as local_end,
      ar.id as availability_rule_id
    from public.availability_rules ar
    where ar.workspace_id = v_workspace_id
      and ar.day_of_week = extract(isodow from p_date)::smallint
      and ar.is_active = true
      and p_date >= ar.valid_from
      and (ar.valid_until is null or p_date <= ar.valid_until)
      and not exists (
        select 1 from active_exceptions where kind = 'modified'
      )
  ),
  extra_windows as (
    select local_start, local_end, null::uuid as availability_rule_id
    from active_exceptions
    where kind = 'extra'
  ),
  availability_windows as (
    select * from base_windows
    union all
    select * from modified_windows
    union all
    select * from extra_windows
  ),
  candidate_slots as (
    select
      gs + make_interval(mins => v_buffer_before) as local_start,
      gs + make_interval(mins => v_buffer_before + v_duration)
        as local_end,
      gs as occupied_local_start,
      gs + make_interval(mins => v_buffer_before + v_duration + v_buffer_after)
        as occupied_local_end,
      aw.availability_rule_id
    from availability_windows aw
    cross join lateral generate_series(
      aw.local_start,
      aw.local_end - make_interval(
        mins => v_buffer_before + v_duration + v_buffer_after
      ),
      interval '30 minutes'
    ) gs
  ),
  utc_slots as (
    select
      (local_start at time zone v_timezone) as slot_start,
      (local_end at time zone v_timezone) as slot_end,
      (occupied_local_start at time zone v_timezone) as occupied_start,
      (occupied_local_end at time zone v_timezone) as occupied_end,
      availability_rule_id
    from candidate_slots
  )
  select us.slot_start, us.slot_end
  from utc_slots us
  where not exists (
    select 1
    from public.availability_breaks ab
    where us.availability_rule_id = ab.availability_rule_id
      and p_date + ab.start_local_time < (us.occupied_end at time zone v_timezone)
      and p_date + ab.end_local_time > (us.occupied_start at time zone v_timezone)
  )
  and not exists (
    select 1
    from public.availability_exceptions ae
    where ae.workspace_id = v_workspace_id
      and ae.kind = 'blocked'
      and ae.starts_at < us.occupied_end
      and ae.ends_at > us.occupied_start
  )
  and not exists (
    select 1
    from public.appointments a
    where a.workspace_id = v_workspace_id
      and a.status in ('pending', 'confirmed')
      and a.starts_at - make_interval(mins => a.buffer_before_minutes_snapshot)
        < us.occupied_end
      and a.ends_at + make_interval(mins => a.buffer_after_minutes_snapshot)
        > us.occupied_start
  )
  order by us.slot_start;
end;
$$;

drop function public.create_public_booking(
  text, uuid, text, text, text, timestamptz, text
);

create or replace function public.create_public_booking(
  p_slug text,
  p_service_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_starts_at timestamptz,
  p_customer_note text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_workspace_id uuid;
  v_timezone text;
  v_service public.services%rowtype;
  v_customer_id uuid;
  v_appointment public.appointments%rowtype;
  v_request_key text := nullif(trim(p_idempotency_key), '');
  v_existing_response jsonb;
  v_email text := nullif(lower(trim(p_email)), '');
  v_phone text := nullif(trim(p_phone), '');
begin
  if nullif(trim(p_name), '') is null then
    raise exception 'Customer name is required';
  end if;

  if length(trim(p_name)) > 200
    or length(coalesce(p_email, '')) > 320
    or length(coalesce(p_phone, '')) > 50
    or length(coalesce(p_customer_note, '')) > 1000
    or length(coalesce(p_idempotency_key, '')) > 100 then
    raise exception 'Booking input is too long';
  end if;

  if v_request_key is null then
    raise exception 'Idempotency key is required';
  end if;

  select bl.workspace_id, w.timezone
  into v_workspace_id, v_timezone
  from public.booking_links bl
  join public.workspaces w on w.id = bl.workspace_id
  where bl.slug = lower(trim(p_slug))
    and bl.is_active = true
    and w.status = 'active';

  select * into v_service
  from public.services s
  where s.id = p_service_id
    and s.workspace_id = v_workspace_id
    and s.is_active = true
    and s.archived_at is null;

  if v_workspace_id is null or v_service.id is null then
    raise exception 'Booking link or service is not available';
  end if;

  insert into public.public_booking_requests (workspace_id, idempotency_key)
  values (v_workspace_id, v_request_key)
  on conflict (workspace_id, idempotency_key) do nothing;

  select response into v_existing_response
  from public.public_booking_requests
  where workspace_id = v_workspace_id
    and idempotency_key = v_request_key
  for update;

  if v_existing_response is not null then
    return v_existing_response;
  end if;

  if not exists (
    select 1
    from public.get_public_available_slots(
      p_slug,
      p_service_id,
      (p_starts_at at time zone v_timezone)::date
    ) slot
    where slot.starts_at = p_starts_at
  ) then
    raise exception 'Selected time is no longer available';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_workspace_id::text || ':' || coalesce(v_email, v_phone, v_request_key), 0)
  );

  select c.id into v_customer_id
  from public.customers c
  where c.workspace_id = v_workspace_id
    and ((v_email is not null and c.normalized_email = v_email)
      or (v_phone is not null and c.normalized_phone = v_phone))
  limit 1;

  if v_customer_id is null then
    insert into public.customers (
      workspace_id, name, email, phone, normalized_email, normalized_phone
    )
    values (
      v_workspace_id, trim(p_name), v_email, v_phone, v_email, v_phone
    )
    returning id into v_customer_id;
  else
    update public.customers
    set name = trim(p_name),
        email = coalesce(v_email, email),
        phone = coalesce(v_phone, phone)
    where id = v_customer_id;
  end if;

  insert into public.appointments (
    workspace_id, customer_id, service_id, service_name_snapshot,
    duration_minutes_snapshot, price_amount_snapshot, currency_snapshot,
    buffer_before_minutes_snapshot, buffer_after_minutes_snapshot,
    starts_at, ends_at, status, source, customer_note
  )
  values (
    v_workspace_id, v_customer_id, v_service.id, v_service.name,
    v_service.duration_minutes, v_service.price_amount, v_service.currency,
    v_service.buffer_before_minutes, v_service.buffer_after_minutes,
    p_starts_at,
    p_starts_at + make_interval(mins => v_service.duration_minutes),
    'pending', 'public_booking', nullif(trim(p_customer_note), '')
  )
  returning * into v_appointment;

  insert into public.appointment_events (
    appointment_id, to_status, event_type
  )
  values (v_appointment.id, 'pending', 'created');

  v_existing_response := jsonb_build_object(
    'id', v_appointment.id,
    'startsAt', v_appointment.starts_at,
    'endsAt', v_appointment.ends_at,
    'serviceName', v_appointment.service_name_snapshot,
    'status', v_appointment.status
  );

  update public.public_booking_requests
  set response = v_existing_response
  where workspace_id = v_workspace_id
    and idempotency_key = v_request_key;

  return v_existing_response;
exception
  when exclusion_violation then
    raise exception 'Selected time is no longer available';
end;
$$;

create or replace function public.set_appointment_status(
  p_appointment_id uuid,
  p_status public.appointment_status,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_appointment public.appointments%rowtype;
  v_event_type public.appointment_event_type;
begin
  select * into v_appointment
  from public.appointments
  where id = p_appointment_id
    and public.is_workspace_member(workspace_id)
  for update;

  if v_appointment.id is null then
    raise exception 'Appointment not found';
  end if;

  if v_appointment.status = p_status then
    return jsonb_build_object('id', v_appointment.id, 'status', v_appointment.status);
  end if;

  if not (
    (v_appointment.status = 'pending' and p_status in ('confirmed', 'cancelled_by_master'))
    or (v_appointment.status = 'confirmed' and p_status in (
      'cancelled_by_master', 'completed', 'no_show'
    ))
  ) then
    raise exception 'Invalid appointment status transition';
  end if;

  v_event_type := (case
    when p_status in ('cancelled_by_customer', 'cancelled_by_master') then 'cancelled'
    when p_status = 'completed' then 'completed'
    when p_status = 'no_show' then 'no_show'
    when p_status = 'confirmed' then 'confirmed'
    else 'created'
  end)::public.appointment_event_type;

  update public.appointments
  set status = p_status,
      cancellation_reason = case
        when p_status in ('cancelled_by_customer', 'cancelled_by_master')
          then nullif(trim(p_reason), '')
        else cancellation_reason
      end,
      confirmed_at = case when p_status = 'confirmed' then coalesce(confirmed_at, now()) else confirmed_at end,
      cancelled_at = case when p_status in ('cancelled_by_customer', 'cancelled_by_master') then now() else cancelled_at end,
      completed_at = case when p_status = 'completed' then now() else completed_at end
  where id = v_appointment.id;

  insert into public.appointment_events (
    appointment_id, from_status, to_status, event_type, reason, created_by
  )
  values (
    v_appointment.id,
    v_appointment.status,
    p_status,
    v_event_type,
    nullif(trim(p_reason), ''),
    auth.uid()
  );

  return jsonb_build_object('id', v_appointment.id, 'status', p_status);
end;
$$;

create or replace function public.reschedule_appointment(
  p_appointment_id uuid,
  p_starts_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_appointment public.appointments%rowtype;
  v_slug text;
  v_timezone text;
  v_old_status public.appointment_status;
begin
  select a.* into v_appointment
  from public.appointments a
  where a.id = p_appointment_id
    and public.is_workspace_member(a.workspace_id)
  for update;

  if v_appointment.id is null then
    raise exception 'Appointment not found';
  end if;

  if v_appointment.status not in ('pending', 'confirmed') then
    raise exception 'Only pending or confirmed appointments can be rescheduled';
  end if;

  if p_starts_at = v_appointment.starts_at then
    return jsonb_build_object(
      'id', v_appointment.id,
      'startsAt', v_appointment.starts_at,
      'endsAt', v_appointment.ends_at,
      'status', v_appointment.status
    );
  end if;

  select bl.slug, w.timezone
  into v_slug, v_timezone
  from public.booking_links bl
  join public.workspaces w on w.id = bl.workspace_id
  where bl.workspace_id = v_appointment.workspace_id
    and bl.is_active = true
  limit 1;

  if v_slug is null or not exists (
    select 1
    from public.get_public_available_slots(
      v_slug,
      v_appointment.service_id,
      (p_starts_at at time zone v_timezone)::date
    ) slot
    where slot.starts_at = p_starts_at
  ) then
    raise exception 'Selected time is no longer available';
  end if;

  v_old_status := v_appointment.status;

  update public.appointments
  set starts_at = p_starts_at,
      ends_at = p_starts_at + make_interval(mins => duration_minutes_snapshot)
  where id = v_appointment.id;

  insert into public.appointment_events (
    appointment_id, from_status, to_status, event_type, created_by
  )
  values (v_appointment.id, v_old_status, v_old_status, 'rescheduled', auth.uid());

  return jsonb_build_object(
    'id', v_appointment.id,
    'startsAt', p_starts_at,
    'endsAt', p_starts_at + make_interval(mins => v_appointment.duration_minutes_snapshot),
    'status', v_old_status
  );
exception
  when exclusion_violation then
    raise exception 'Selected time is no longer available';
end;
$$;

grant execute on function public.create_public_booking(
  text, uuid, text, text, text, timestamptz, text, text
) to anon, authenticated;

revoke all on function public.set_appointment_status(
  uuid, public.appointment_status, text
) from public;
grant execute on function public.set_appointment_status(
  uuid, public.appointment_status, text
) to authenticated;

revoke all on function public.reschedule_appointment(uuid, timestamptz)
  from public;
grant execute on function public.reschedule_appointment(uuid, timestamptz)
  to authenticated;
