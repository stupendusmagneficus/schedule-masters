-- SCH-75: allow a workspace member to create a confirmed appointment manually.
-- The RPC is the only write path used by the mobile manual-booking flow.

create schema if not exists private;

create table if not exists private.master_booking_requests (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  idempotency_key text not null,
  response jsonb,
  created_at timestamptz not null default now(),
  primary key (workspace_id, idempotency_key)
);

revoke all on private.master_booking_requests from public, anon, authenticated;

create or replace function public.list_master_customers(
  p_workspace_id uuid,
  p_search text default null
)
returns table (
  id uuid,
  name text,
  email text,
  phone text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  return query
  select c.id, c.name, c.email, c.phone
    from public.customers c
   where c.workspace_id = p_workspace_id
     and (
       nullif(trim(coalesce(p_search, '')), '') is null
       or c.name ilike '%' || trim(p_search) || '%'
       or coalesce(c.email, '') ilike '%' || trim(p_search) || '%'
       or coalesce(c.phone, '') ilike '%' || trim(p_search) || '%'
     )
   order by c.name, c.created_at
   limit 50;
end;
$$;

create or replace function public.list_master_appointments(
  p_workspace_id uuid,
  p_from_date date,
  p_to_date date
)
returns table (
  id uuid,
  customer_id uuid,
  customer_name text,
  service_name text,
  duration_minutes integer,
  price_amount numeric,
  currency text,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.appointment_status,
  source public.appointment_source
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timezone text;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  if p_from_date is null or p_to_date is null or p_to_date < p_from_date then
    raise exception 'Invalid appointment date range';
  end if;

  select w.timezone
    into v_timezone
    from public.workspaces w
   where w.id = p_workspace_id;

  return query
  select
    a.id,
    a.customer_id,
    c.name,
    a.service_name_snapshot,
    a.duration_minutes_snapshot,
    a.price_amount_snapshot,
    a.currency_snapshot,
    a.starts_at,
    a.ends_at,
    a.status,
    a.source
    from public.appointments a
    join public.customers c on c.id = a.customer_id
   where a.workspace_id = p_workspace_id
     and a.starts_at < ((p_to_date + 1)::timestamp at time zone v_timezone)
     and a.ends_at > (p_from_date::timestamp at time zone v_timezone)
     and a.status in ('pending', 'confirmed')
   order by a.starts_at;
end;
$$;

create or replace function public.create_master_booking(
  p_workspace_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_idempotency_key text,
  p_customer_id uuid default null,
  p_name text default null,
  p_email text default null,
  p_phone text default null,
  p_duration_minutes integer default null,
  p_price_amount numeric default null,
  p_master_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_service public.services%rowtype;
  v_customer public.customers%rowtype;
  v_appointment public.appointments%rowtype;
  v_existing_response jsonb;
  v_request_key text := nullif(trim(p_idempotency_key), '');
  v_email text := nullif(lower(trim(p_email)), '');
  v_phone text := nullif(trim(p_phone), '');
  v_duration integer;
  v_price numeric;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  if v_request_key is null or length(v_request_key) > 100 then
    raise exception 'Idempotency key is required';
  end if;

  if p_starts_at is null then
    raise exception 'Appointment start is required';
  end if;

  if length(coalesce(p_name, '')) > 200
    or length(coalesce(p_email, '')) > 320
    or length(coalesce(p_phone, '')) > 50
    or length(coalesce(p_master_note, '')) > 1000 then
    raise exception 'Booking input is too long';
  end if;

  select *
    into v_service
    from public.services s
   where s.id = p_service_id
     and s.workspace_id = p_workspace_id
     and s.is_active = true
     and s.archived_at is null;

  if v_service.id is null then
    raise exception 'Service is not available';
  end if;

  v_duration := coalesce(p_duration_minutes, v_service.duration_minutes);
  v_price := coalesce(p_price_amount, v_service.price_amount);

  if v_duration < 1 or v_duration > 1440 then
    raise exception 'Duration must be between 1 and 1440 minutes';
  end if;

  if v_price < 0 then
    raise exception 'Price cannot be negative';
  end if;

  insert into private.master_booking_requests (workspace_id, idempotency_key)
  values (p_workspace_id, v_request_key)
  on conflict (workspace_id, idempotency_key) do nothing;

  select r.response
    into v_existing_response
    from private.master_booking_requests r
   where r.workspace_id = p_workspace_id
     and r.idempotency_key = v_request_key
   for update;

  if v_existing_response is not null then
    return v_existing_response;
  end if;

  if not exists (
    select 1
      from public.get_master_available_slots(
        p_workspace_id,
        p_service_id,
        (p_starts_at at time zone (select w.timezone from public.workspaces w where w.id = p_workspace_id))::date
      ) slot
     where slot.starts_at = p_starts_at
  ) then
    raise exception 'Selected time is no longer available';
  end if;

  if p_customer_id is not null then
    select *
      into v_customer
      from public.customers c
     where c.id = p_customer_id
       and c.workspace_id = p_workspace_id;

    if v_customer.id is null then
      raise exception 'Customer is not available';
    end if;
  else
    if nullif(trim(coalesce(p_name, '')), '') is null then
      raise exception 'Customer name is required';
    end if;

    insert into public.customers (
      workspace_id, name, email, phone, normalized_email, normalized_phone
    )
    values (
      p_workspace_id,
      trim(p_name),
      v_email,
      v_phone,
      v_email,
      v_phone
    )
    returning * into v_customer;
  end if;

  insert into public.appointments (
    workspace_id,
    customer_id,
    service_id,
    service_name_snapshot,
    duration_minutes_snapshot,
    price_amount_snapshot,
    currency_snapshot,
    buffer_before_minutes_snapshot,
    buffer_after_minutes_snapshot,
    starts_at,
    ends_at,
    status,
    source,
    master_note,
    confirmed_at
  )
  values (
    p_workspace_id,
    v_customer.id,
    v_service.id,
    v_service.name,
    v_duration,
    v_price,
    v_service.currency,
    v_service.buffer_before_minutes,
    v_service.buffer_after_minutes,
    p_starts_at,
    p_starts_at + make_interval(mins => v_duration),
    'confirmed',
    'master_created',
    nullif(trim(p_master_note), ''),
    now()
  )
  returning * into v_appointment;

  insert into public.appointment_events (
    appointment_id, to_status, event_type
  )
  values (v_appointment.id, 'confirmed', 'created');

  v_existing_response := jsonb_build_object(
    'id', v_appointment.id,
    'startsAt', v_appointment.starts_at,
    'endsAt', v_appointment.ends_at,
    'serviceName', v_appointment.service_name_snapshot,
    'status', v_appointment.status,
    'source', v_appointment.source
  );

  update private.master_booking_requests
     set response = v_existing_response
   where workspace_id = p_workspace_id
     and idempotency_key = v_request_key;

  return v_existing_response;
exception
  when exclusion_violation then
    raise exception 'Selected time is no longer available';
end;
$$;

revoke all on function public.list_master_customers(uuid, text)
  from public, anon;
grant execute on function public.list_master_customers(uuid, text)
  to authenticated;

revoke all on function public.list_master_appointments(uuid, date, date)
  from public, anon;
grant execute on function public.list_master_appointments(uuid, date, date)
  to authenticated;

revoke all on function public.create_master_booking(
  uuid, uuid, timestamptz, text, uuid, text, text, text, integer, numeric, text
) from public, anon;
grant execute on function public.create_master_booking(
  uuid, uuid, timestamptz, text, uuid, text, text, text, integer, numeric, text
) to authenticated;
