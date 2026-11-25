-- Independent audit P3 fixes (F-027, F-028, F-031, F-034, F-047).

-- F-031: workspace members can update their row directly through PostgREST,
-- so validate the timezone in the database. Existing rows are not rechecked.
create function private.validate_workspace_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from pg_catalog.pg_timezone_names z where z.name = new.timezone
  ) then
    raise exception 'Invalid workspace timezone' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger workspaces_validate_timezone
  before insert or update of timezone on public.workspaces
  for each row execute function private.validate_workspace_timezone();

-- F-034: match phone digits regardless of formatting and treat LIKE
-- metacharacters in the search text literally.
create function private.customer_matches_search(
  p_name text,
  p_email text,
  p_phone text,
  p_search text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select v.term is null
      or p_name ilike '%' || v.pattern || '%'
      or coalesce(p_email, '') ilike '%' || v.pattern || '%'
      or coalesce(p_phone, '') ilike '%' || v.pattern || '%'
      or (
        v.digits is not null
        and regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') like '%' || v.digits || '%'
      )
    from (
      select t.term,
             replace(replace(replace(t.term, '\', '\\'), '%', '\%'), '_', '\_') as pattern,
             case
               when t.term ~ '^[0-9 +()./-]+$'
                 then nullif(regexp_replace(t.term, '\D', '', 'g'), '')
             end as digits
        from (select nullif(trim(coalesce(p_search, '')), '') as term) t
    ) v
$$;

revoke all on function private.customer_matches_search(text, text, text, text)
  from public, anon, authenticated;

create or replace function public.list_master_customer_directory(
  p_workspace_id uuid,
  p_search text default null
)
returns table (
  id uuid,
  name text,
  email text,
  phone text,
  notes text,
  completed_visits bigint,
  last_completed_visit_at timestamptz
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
  select c.id,
         c.name,
         c.email,
         c.phone,
         c.notes,
         count(a.id) filter (where a.status = 'completed') as completed_visits,
         max(a.starts_at) filter (where a.status = 'completed') as last_completed_visit_at
    from public.customers c
    left join public.appointments a
      on a.customer_id = c.id
     and a.workspace_id = c.workspace_id
     and a.starts_at <= now()
   where c.workspace_id = p_workspace_id
     and c.anonymized_at is null
     and private.customer_matches_search(c.name, c.email, c.phone, p_search)
   group by c.id
   order by lower(c.name), c.created_at, c.id;
end;
$$;

create or replace function public.list_master_customers(p_workspace_id uuid, p_search text default null)
returns table (id uuid, name text, email text, phone text)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;
  return query
  select distinct on (coalesce(nullif(c.normalized_email, ''), nullif(c.normalized_phone, ''), c.id::text))
         c.id, c.name, c.email, c.phone
    from public.customers c
   where c.workspace_id = p_workspace_id and c.anonymized_at is null
     and private.customer_matches_search(c.name, c.email, c.phone, p_search)
   order by coalesce(nullif(c.normalized_email, ''), nullif(c.normalized_phone, ''), c.id::text), c.created_at, c.id;
end;
$$;

-- F-028: reusing a customer by contact keeps the stored name.
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
      -- Reuse the stored profile name; a contact match must not rename history.
      update public.customers
         set email = coalesce(v_email, email),
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

-- F-047: erase unlinked wait-list entries that hold the customer's contacts.
create or replace function public.anonymize_master_customer(
  p_workspace_id uuid,
  p_customer_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_phone_digits text;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  select nullif(lower(trim(c.email)), ''),
         nullif(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), '')
    into v_email, v_phone_digits
    from public.customers c
   where c.id = p_customer_id
     and c.workspace_id = p_workspace_id
   for update;

  -- Missing or already anonymized customers are a successful no-op. This keeps
  -- retries safe and does not reveal whether an ID belongs to another tenant.
  if not found then
    return;
  end if;

  update public.customers
     set name = 'Anonymized customer',
         email = null,
         phone = null,
         normalized_email = null,
         normalized_phone = null,
         notes = null,
         marketing_consent_at = null,
         auth_user_id = null,
         anonymized_at = coalesce(anonymized_at, now()),
         updated_at = now()
   where id = p_customer_id
     and workspace_id = p_workspace_id
     and anonymized_at is null;

  if not found then
    return;
  end if;

  -- Wait-list records duplicate the customer's name and contact details. They
  -- are no longer actionable once their contact is erased, so remove them.
  -- Older or direct-RPC entries may hold the same contacts without a link.
  delete from public.waiting_list_entries e
   where e.workspace_id = p_workspace_id
     and (
       e.customer_id = p_customer_id
       or (
         e.customer_id is null
         and (
           (v_email is not null and lower(trim(e.customer_email)) = v_email)
           or (
             v_phone_digits is not null
             and regexp_replace(coalesce(e.customer_phone, ''), '\D', '', 'g') = v_phone_digits
           )
         )
       )
     );

  -- Preserve appointment IDs, statuses, dates, services, and amounts while
  -- removing free-text fields which may contain customer PII.
  update public.appointments
     set customer_note = null,
         master_note = null,
         cancellation_reason = null
   where workspace_id = p_workspace_id
     and customer_id = p_customer_id;

  update public.appointment_events e
     set reason = null
    from public.appointments a
   where a.id = e.appointment_id
     and a.workspace_id = p_workspace_id
     and a.customer_id = p_customer_id;

  -- Prevent stale contact links and queued messages from exposing or sending
  -- the erased contact data. Appointment lifecycle remains in appointment_events.
  update public.appointment_access_tokens t
     set revoked_at = coalesce(t.revoked_at, now())
    from public.appointments a
   where a.id = t.appointment_id
     and a.workspace_id = p_workspace_id
     and a.customer_id = p_customer_id
     and t.revoked_at is null;

  delete from public.notification_jobs n
   using public.appointments a
   where a.id = n.appointment_id
     and a.workspace_id = p_workspace_id
     and a.customer_id = p_customer_id;

  delete from public.booking_decision_email_outbox e
   using public.appointments a
   where a.id = e.appointment_id
     and a.workspace_id = p_workspace_id
     and a.customer_id = p_customer_id;
end;
$$;

-- F-027: customer links cannot change an appointment that has started.
create or replace function public.get_customer_appointment(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appointment public.appointments%rowtype;
  v_workspace_name text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{128}$' then
    return null;
  end if;

  select a.*
    into v_appointment
    from public.appointment_access_tokens t
    join public.appointments a on a.id = t.appointment_id
   where t.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
     and t.purpose = 'manage'
     and t.expires_at > now()
     and t.revoked_at is null;

  if v_appointment.id is null then
    return null;
  end if;

  select w.name into v_workspace_name
    from public.workspaces w
   where w.id = v_appointment.workspace_id;

  return jsonb_build_object(
    'appointmentId', v_appointment.id,
    'serviceName', v_appointment.service_name_snapshot,
    'startsAt', v_appointment.starts_at,
    'endsAt', v_appointment.ends_at,
    'status', v_appointment.status,
    'workspaceName', v_workspace_name,
    'timezone', (select w.timezone from public.workspaces w where w.id = v_appointment.workspace_id),
    'canConfirm', v_appointment.status = 'pending'
      and v_appointment.starts_at > now(),
    'canCancel', v_appointment.status in ('pending', 'confirmed')
      and v_appointment.starts_at > now()
  );
end;
$$;

create or replace function public.update_customer_appointment(
  p_token text,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token_id uuid;
  v_appointment_id uuid;
  v_appointment public.appointments%rowtype;
  v_completed_status public.appointment_status;
  v_next_status public.appointment_status;
  v_event_type public.appointment_event_type;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{128}$'
    or p_action is null or p_action not in ('confirm', 'cancel') then
    raise exception 'Invalid appointment link or action';
  end if;

  select t.id, t.appointment_id
    into v_token_id, v_appointment_id
    from public.appointment_access_tokens t
   where t.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
     and t.purpose = 'manage'
     and t.expires_at > now()
     and t.revoked_at is null
   for update;

  if v_token_id is null then
    -- Cancellation revokes a link in the same transaction. If the response
    -- was lost, return the already committed outcome for an identical retry.
    select a.id, a.status
      into v_appointment_id, v_completed_status
      from public.appointment_access_tokens t
      join public.appointments a on a.id = t.appointment_id
     where t.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
       and t.used_at is not null
       and ((p_action = 'confirm' and a.status = 'confirmed')
         or (p_action = 'cancel' and a.status = 'cancelled_by_customer'));

    if v_completed_status is not null then
      return jsonb_build_object('id', v_appointment_id, 'status', v_completed_status);
    end if;

    raise exception 'Appointment link is invalid or expired';
  end if;

  select a.* into v_appointment
    from public.appointments a
   where a.id = v_appointment_id
   for update;

  if p_action = 'confirm' then
    v_next_status := 'confirmed';
    v_event_type := 'confirmed';
    if v_appointment.status not in ('pending', 'confirmed') then
      raise exception 'Appointment can no longer be confirmed';
    end if;
  else
    v_next_status := 'cancelled_by_customer';
    v_event_type := 'cancelled';
    if v_appointment.status not in ('pending', 'confirmed', 'cancelled_by_customer') then
      raise exception 'Appointment can no longer be cancelled';
    end if;
  end if;

  if v_appointment.status <> v_next_status
    and v_appointment.starts_at <= now() then
    raise exception 'Appointment has already started';
  end if;

  if v_appointment.status <> v_next_status then
    update public.appointments
       set status = v_next_status,
           confirmed_at = case when v_next_status = 'confirmed' then now() else confirmed_at end,
           cancelled_at = case when v_next_status = 'cancelled_by_customer' then now() else cancelled_at end
     where id = v_appointment.id;

    insert into public.appointment_events (
      appointment_id, from_status, to_status, event_type
    ) values (
      v_appointment.id, v_appointment.status, v_next_status, v_event_type
    );
  end if;

  update public.appointment_access_tokens
     set used_at = coalesce(used_at, now())
   where id = v_token_id;

  return jsonb_build_object('id', v_appointment.id, 'status', v_next_status);
end;
$$;
