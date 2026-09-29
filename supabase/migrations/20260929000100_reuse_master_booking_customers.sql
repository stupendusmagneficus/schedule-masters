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
  select distinct on (
    coalesce(nullif(c.normalized_email, ''), nullif(c.normalized_phone, ''), c.id::text)
  ) c.id, c.name, c.email, c.phone
    from public.customers c
   where c.workspace_id = p_workspace_id
     and (
       nullif(trim(coalesce(p_search, '')), '') is null
       or c.name ilike '%' || trim(p_search) || '%'
       or coalesce(c.email, '') ilike '%' || trim(p_search) || '%'
       or coalesce(c.phone, '') ilike '%' || trim(p_search) || '%'
     )
   order by
     coalesce(nullif(c.normalized_email, ''), nullif(c.normalized_phone, ''), c.id::text),
     c.created_at,
     c.id;
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

    if v_email is not null or v_phone is not null then
      perform pg_advisory_xact_lock(
        hashtextextended(
          p_workspace_id::text || ':' || coalesce(v_email, v_phone),
          0
        )
      );
    end if;

    select *
      into v_customer
      from public.customers c
     where c.workspace_id = p_workspace_id
       and (
         (v_email is not null and c.normalized_email = v_email)
         or (v_phone is not null and c.normalized_phone = v_phone)
       )
     order by c.created_at, c.id
     limit 1
     for update;

    if v_customer.id is null then
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
    else
      update public.customers
         set name = trim(p_name),
             email = coalesce(v_email, email),
             phone = coalesce(v_phone, phone),
             normalized_email = coalesce(v_email, normalized_email),
             normalized_phone = coalesce(v_phone, normalized_phone)
       where id = v_customer.id;
    end if;
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
