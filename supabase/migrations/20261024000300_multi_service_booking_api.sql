-- A visit is continuous: service durations are summed in order, with only the
-- first service's leading buffer and last service's trailing buffer applied.
-- Keep the request bounded to 20 items and 24 hours to cap query/booking cost.
create or replace function private.calculate_available_slots_for_services(
  p_workspace_id uuid,
  p_service_ids uuid[],
  p_date date
)
returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_timezone text;
  v_booking_interval_minutes integer;
  v_duration integer;
  v_buffer_before integer;
  v_buffer_after integer;
  v_service_count integer;
  v_currency_count integer;
begin
  if p_service_ids is null
     or cardinality(p_service_ids) < 1
     or cardinality(p_service_ids) > 20
     or p_date is null
     or cardinality(p_service_ids) <> cardinality(array(
       select distinct requested.service_id
         from unnest(p_service_ids) as requested(service_id)
     )) then
    return;
  end if;

  select w.timezone, w.booking_interval_minutes
    into v_timezone, v_booking_interval_minutes
    from public.workspaces w
   where w.id = p_workspace_id
     and w.status = 'active';

  with selected_services as (
    select s.*, requested.position
      from unnest(p_service_ids) with ordinality
        as requested(service_id, position)
      join public.services s
        on s.id = requested.service_id
       and s.workspace_id = p_workspace_id
       and s.is_active
       and s.archived_at is null
  )
  select count(*)::integer,
         coalesce(sum(s.duration_minutes), 0)::integer,
         (array_agg(s.buffer_before_minutes order by s.position))[1],
         (array_agg(s.buffer_after_minutes order by s.position))[
           cardinality(p_service_ids)
         ],
         count(distinct s.currency)::integer
    into v_service_count, v_duration, v_buffer_before,
         v_buffer_after, v_currency_count
    from selected_services s;

  if v_timezone is null
     or v_service_count <> cardinality(p_service_ids)
     or v_currency_count <> 1
     or v_duration < 1
     or v_duration > 1440 then
    return;
  end if;

  return query
  with active_exceptions as (
    select ae.kind, ae.starts_at, ae.ends_at
      from public.availability_exceptions ae
     where ae.workspace_id = p_workspace_id
       and ae.ends_at > (p_date::timestamp at time zone v_timezone)
       and ae.starts_at < ((p_date + 1)::timestamp at time zone v_timezone)
  ), date_override as (
    select o.override_kind, o.start_local_time, o.end_local_time
      from public.availability_date_overrides o
     where o.workspace_id = p_workspace_id
       and o.work_date = p_date
  ), availability_windows as (
    select
      (p_date + ar.start_local_time) at time zone v_timezone as window_start,
      (p_date + ar.end_local_time) at time zone v_timezone as window_end,
      ar.id as availability_rule_id
      from public.availability_rules ar
     where ar.workspace_id = p_workspace_id
       and ar.day_of_week = extract(isodow from p_date)::smallint
       and ar.is_active
       and p_date >= ar.valid_from
       and (ar.valid_until is null or p_date <= ar.valid_until)
       and not exists (
         select 1 from active_exceptions ae where ae.kind = 'modified'
       )
       and not exists (select 1 from date_override)
    union all
    select
      (p_date + d.start_local_time) at time zone v_timezone,
      (p_date + d.end_local_time) at time zone v_timezone,
      null::uuid
      from date_override d
     where d.override_kind = 'modified'
    union all
    select ae.starts_at, ae.ends_at, null::uuid
      from active_exceptions ae
     where ae.kind = 'modified'
       and not exists (select 1 from date_override)
    union all
    select ae.starts_at, ae.ends_at, null::uuid
      from active_exceptions ae
     where ae.kind = 'extra'
       and not exists (select 1 from date_override)
  ), candidate_slots as (
    select
      gs as occupied_start,
      gs + make_interval(mins => v_buffer_before) as service_start,
      gs + make_interval(mins => v_buffer_before + v_duration)
        as service_end,
      gs + make_interval(
        mins => v_buffer_before + v_duration + v_buffer_after
      ) as occupied_end,
      aw.availability_rule_id
      from availability_windows aw
      cross join lateral generate_series(
        aw.window_start,
        aw.window_end - make_interval(
          mins => v_buffer_before + v_duration + v_buffer_after
        ),
        make_interval(mins => v_booking_interval_minutes)
      ) gs
  ), workspace_day_slots as (
    select cs.*
      from candidate_slots cs
     where (cs.occupied_start at time zone v_timezone)::date = p_date
       and (cs.occupied_end at time zone v_timezone)::date = p_date
  )
  select distinct cs.service_start, cs.service_end
    from workspace_day_slots cs
   where not exists (
     select 1 from public.availability_breaks ab
      where ab.availability_rule_id = cs.availability_rule_id
        and tstzrange(
          (p_date + ab.start_local_time) at time zone v_timezone,
          (p_date + ab.end_local_time) at time zone v_timezone,
          '[)'
        ) && tstzrange(cs.occupied_start, cs.occupied_end, '[)')
   )
     and not exists (
       select 1 from public.availability_exceptions ae
        where ae.workspace_id = p_workspace_id
          and ae.kind = 'blocked'
          and tstzrange(ae.starts_at, ae.ends_at, '[)')
            && tstzrange(cs.occupied_start, cs.occupied_end, '[)')
     )
     and not exists (
       select 1 from public.appointments a
        where a.workspace_id = p_workspace_id
          and a.status in ('pending', 'confirmed')
          and a.occupied_range
            && tstzrange(cs.occupied_start, cs.occupied_end, '[)')
     )
   order by cs.service_start;
end;
$$;

revoke all on function private.calculate_available_slots_for_services(
  uuid, uuid[], date
) from public, anon, authenticated;

create function public.get_master_available_slots_for_services(
  p_workspace_id uuid,
  p_service_ids uuid[],
  p_date date
)
returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  return query
  select slots.starts_at, slots.ends_at
    from private.calculate_available_slots_for_services(
      p_workspace_id, p_service_ids, p_date
    ) slots;
end;
$$;

revoke all on function public.get_master_available_slots_for_services(
  uuid, uuid[], date
) from public, anon;
grant execute on function public.get_master_available_slots_for_services(
  uuid, uuid[], date
) to authenticated;

create function public.get_public_available_slots_for_services(
  p_slug text,
  p_service_ids uuid[],
  p_date date
)
returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_workspace_id uuid;
begin
  select bl.workspace_id
    into v_workspace_id
    from public.booking_links bl
    join public.workspaces w on w.id = bl.workspace_id
   where bl.slug = lower(trim(p_slug))
     and bl.is_active
     and w.status = 'active';

  if v_workspace_id is null then
    return;
  end if;

  return query
  select slots.starts_at, slots.ends_at
    from private.calculate_available_slots_for_services(
      v_workspace_id, p_service_ids, p_date
    ) slots;
end;
$$;

revoke all on function public.get_public_available_slots_for_services(
  text, uuid[], date
) from public;
grant execute on function public.get_public_available_slots_for_services(
  text, uuid[], date
) to anon, authenticated;

create function public.create_master_booking_with_services(
  p_workspace_id uuid,
  p_service_ids uuid[],
  p_starts_at timestamptz,
  p_idempotency_key text,
  p_customer_id uuid default null,
  p_name text default null,
  p_email text default null,
  p_phone text default null,
  p_master_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_first_service_id uuid;
  v_service_count integer;
  v_duration integer;
  v_price numeric(10, 2);
  v_currency char(3);
  v_currency_count integer;
  v_buffer_before integer;
  v_buffer_after integer;
  v_service_name text;
  v_timezone text;
  v_response jsonb;
  v_appointment public.appointments%rowtype;
  v_service_items jsonb;
  v_request_key text := nullif(trim(p_idempotency_key), '');
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;
  if p_service_ids is null
     or cardinality(p_service_ids) < 1
     or cardinality(p_service_ids) > 20
     or cardinality(p_service_ids) <> cardinality(array(
       select distinct requested.service_id
         from unnest(p_service_ids) as requested(service_id)
     )) then
    raise exception 'Select between 1 and 20 different services';
  end if;

  if v_request_key is null or length(v_request_key) > 100 then
    raise exception 'Idempotency key is required';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_workspace_id::text || ':' || v_request_key, 0)
  );

  select r.response into v_response
    from private.master_booking_requests r
   where r.workspace_id = p_workspace_id
     and r.idempotency_key = v_request_key
   for update;

  if v_response is not null then
    select * into v_appointment
      from public.appointments a
     where a.id = (v_response->>'id')::uuid
       and a.workspace_id = p_workspace_id;

    if v_appointment.id is null then
      return v_response;
    end if;

    select jsonb_agg(jsonb_build_object(
             'position', aps.position,
             'serviceId', aps.service_id,
             'serviceName', aps.service_name_snapshot,
             'durationMinutes', aps.duration_minutes_snapshot,
             'priceAmount', aps.price_amount_snapshot,
             'currency', aps.currency_snapshot
           ) order by aps.position)
      into v_service_items
      from public.appointment_services aps
     where aps.appointment_id = v_appointment.id;

    if (select array_agg(aps.service_id order by aps.position)
          from public.appointment_services aps
         where aps.appointment_id = v_appointment.id)
       is distinct from p_service_ids then
      raise exception 'Idempotency key was already used for another service selection';
    end if;

    return jsonb_build_object(
      'id', v_appointment.id,
      'startsAt', v_appointment.starts_at,
      'endsAt', v_appointment.ends_at,
      'serviceName', v_appointment.service_name_snapshot,
      'serviceItems', v_service_items,
      'durationMinutes', v_appointment.duration_minutes_snapshot,
      'priceAmount', v_appointment.price_amount_snapshot,
      'status', v_appointment.status,
      'source', v_appointment.source
    );
  end if;

  perform s.id
    from unnest(p_service_ids) with ordinality
      as requested(service_id, position)
    join public.services s
      on s.id = requested.service_id
     and s.workspace_id = p_workspace_id
     and s.is_active
     and s.archived_at is null
   for share of s;

  select (array_agg(s.id order by requested.position))[1], count(*)::integer,
         sum(s.duration_minutes)::integer,
         sum(s.price_amount)::numeric(10, 2),
         (array_agg(s.currency order by requested.position))[1],
         count(distinct s.currency)::integer,
         (array_agg(s.buffer_before_minutes order by requested.position))[1],
         (array_agg(s.buffer_after_minutes order by requested.position))[
           cardinality(p_service_ids)
         ],
         string_agg(s.name, ' + ' order by requested.position)
    into v_first_service_id, v_service_count, v_duration, v_price,
         v_currency, v_currency_count, v_buffer_before,
         v_buffer_after, v_service_name
    from unnest(p_service_ids) with ordinality
      as requested(service_id, position)
    join public.services s
      on s.id = requested.service_id
     and s.workspace_id = p_workspace_id
     and s.is_active
     and s.archived_at is null;

  if v_service_count <> cardinality(p_service_ids)
     or v_currency_count <> 1
     or v_duration not between 1 and 1440 then
    raise exception 'One or more selected services are unavailable';
  end if;

  select w.timezone into v_timezone
    from public.workspaces w where w.id = p_workspace_id;

  if not exists (
    select 1 from public.get_master_available_slots_for_services(
      p_workspace_id,
      p_service_ids,
      (p_starts_at at time zone v_timezone)::date
    ) slot where slot.starts_at = p_starts_at
  ) then
    raise exception 'Selected time is no longer available';
  end if;

  v_response := public.create_master_booking(
    p_workspace_id,
    v_first_service_id,
    p_starts_at,
    v_request_key,
    p_customer_id,
    p_name,
    p_email,
    p_phone,
    null,
    null,
    p_master_note
  );

  select * into v_appointment
    from public.appointments a
   where a.id = (v_response->>'id')::uuid
     and a.workspace_id = p_workspace_id
   for update;

  if v_appointment.id is null then
    raise exception 'Appointment was not created';
  end if;

  delete from public.appointment_services
   where appointment_id = v_appointment.id;

  insert into public.appointment_services (
    appointment_id, workspace_id, position, service_id,
    service_name_snapshot, duration_minutes_snapshot, price_amount_snapshot,
    currency_snapshot, buffer_before_minutes_snapshot,
    buffer_after_minutes_snapshot
  )
  select
    v_appointment.id, p_workspace_id, requested.position, s.id, s.name,
    s.duration_minutes, s.price_amount, s.currency,
    s.buffer_before_minutes, s.buffer_after_minutes
    from unnest(p_service_ids) with ordinality
      as requested(service_id, position)
    join public.services s
      on s.id = requested.service_id
     and s.workspace_id = p_workspace_id;

  select jsonb_agg(jsonb_build_object(
           'position', aps.position,
           'serviceId', aps.service_id,
           'serviceName', aps.service_name_snapshot,
           'durationMinutes', aps.duration_minutes_snapshot,
           'priceAmount', aps.price_amount_snapshot,
           'currency', aps.currency_snapshot
         ) order by aps.position)
    into v_service_items
    from public.appointment_services aps
   where aps.appointment_id = v_appointment.id;

  update public.appointments
     set service_id = v_first_service_id,
         service_name_snapshot = v_service_name,
         duration_minutes_snapshot = v_duration,
         price_amount_snapshot = v_price,
         currency_snapshot = v_currency,
         buffer_before_minutes_snapshot = v_buffer_before,
         buffer_after_minutes_snapshot = v_buffer_after,
         ends_at = starts_at + make_interval(mins => v_duration)
   where id = v_appointment.id
   returning * into v_appointment;

  v_response := jsonb_build_object(
    'id', v_appointment.id,
    'startsAt', v_appointment.starts_at,
    'endsAt', v_appointment.ends_at,
    'serviceName', v_appointment.service_name_snapshot,
    'serviceItems', v_service_items,
    'durationMinutes', v_appointment.duration_minutes_snapshot,
    'priceAmount', v_appointment.price_amount_snapshot,
    'status', v_appointment.status,
    'source', v_appointment.source
  );

  update private.master_booking_requests
     set response = v_response
   where workspace_id = p_workspace_id
     and idempotency_key = v_request_key;

  return v_response;
exception
  when exclusion_violation then
    raise exception 'Selected time is no longer available';
end;
$$;

revoke all on function public.create_master_booking_with_services(
  uuid, uuid[], timestamptz, text, uuid, text, text, text, text
) from public, anon;
grant execute on function public.create_master_booking_with_services(
  uuid, uuid[], timestamptz, text, uuid, text, text, text, text
) to authenticated;

create function public.create_public_booking_with_services(
  p_slug text,
  p_service_ids uuid[],
  p_name text,
  p_email text,
  p_phone text,
  p_starts_at timestamptz,
  p_customer_note text default null,
  p_idempotency_key text default null,
  p_locale text default 'cz'
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_workspace_id uuid;
  v_timezone text;
  v_first_service_id uuid;
  v_service_count integer;
  v_duration integer;
  v_price numeric(10, 2);
  v_currency char(3);
  v_currency_count integer;
  v_buffer_before integer;
  v_buffer_after integer;
  v_service_name text;
  v_response jsonb;
  v_existing_response jsonb;
  v_appointment public.appointments%rowtype;
  v_service_items jsonb;
  v_request_key text := nullif(trim(p_idempotency_key), '');
begin
  select bl.workspace_id, w.timezone
    into v_workspace_id, v_timezone
    from public.booking_links bl
    join public.workspaces w on w.id = bl.workspace_id
   where bl.slug = lower(trim(p_slug))
     and bl.is_active
     and w.status = 'active';

  if v_workspace_id is null then
    raise exception 'Booking link is not available';
  end if;
  if v_request_key is null or length(v_request_key) > 100 then
    raise exception 'Idempotency key is required';
  end if;
  if p_service_ids is null
     or cardinality(p_service_ids) < 1
     or cardinality(p_service_ids) > 20
     or cardinality(p_service_ids) <> cardinality(array(
       select distinct requested.service_id
         from unnest(p_service_ids) as requested(service_id)
     )) then
    raise exception 'Select between 1 and 20 different services';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_workspace_id::text || ':' || v_request_key, 0)
  );

  select r.response into v_existing_response
    from public.public_booking_requests r
   where r.workspace_id = v_workspace_id
     and r.idempotency_key = v_request_key
   for update;

  if v_existing_response is not null then
    select * into v_appointment
      from public.appointments a
     where a.id = (v_existing_response->>'id')::uuid
       and a.workspace_id = v_workspace_id;
    if v_appointment.id is null then
      return v_existing_response;
    end if;
    if (select array_agg(aps.service_id order by aps.position)
          from public.appointment_services aps
         where aps.appointment_id = v_appointment.id)
       is distinct from p_service_ids then
      raise exception 'Idempotency key was already used for another service selection';
    end if;
    select jsonb_agg(jsonb_build_object(
             'position', aps.position,
             'serviceId', aps.service_id,
             'serviceName', aps.service_name_snapshot,
             'durationMinutes', aps.duration_minutes_snapshot,
             'priceAmount', aps.price_amount_snapshot,
             'currency', aps.currency_snapshot
           ) order by aps.position)
      into v_service_items
      from public.appointment_services aps
     where aps.appointment_id = v_appointment.id;
    return jsonb_build_object(
      'id', v_appointment.id,
      'startsAt', v_appointment.starts_at,
      'endsAt', v_appointment.ends_at,
      'serviceName', v_appointment.service_name_snapshot,
      'serviceItems', v_service_items,
      'durationMinutes', v_appointment.duration_minutes_snapshot,
      'priceAmount', v_appointment.price_amount_snapshot,
      'status', v_appointment.status
    );
  end if;

  perform s.id
    from unnest(p_service_ids) with ordinality
      as requested(service_id, position)
    join public.services s
      on s.id = requested.service_id
     and s.workspace_id = v_workspace_id
     and s.is_active
     and s.archived_at is null
   for share of s;

  select (array_agg(s.id order by requested.position))[1], count(*)::integer,
         sum(s.duration_minutes)::integer,
         sum(s.price_amount)::numeric(10, 2),
         (array_agg(s.currency order by requested.position))[1],
         count(distinct s.currency)::integer,
         (array_agg(s.buffer_before_minutes order by requested.position))[1],
         (array_agg(s.buffer_after_minutes order by requested.position))[
           cardinality(p_service_ids)
         ],
         string_agg(s.name, ' + ' order by requested.position)
    into v_first_service_id, v_service_count, v_duration, v_price,
         v_currency, v_currency_count, v_buffer_before,
         v_buffer_after, v_service_name
    from unnest(p_service_ids) with ordinality
      as requested(service_id, position)
    join public.services s
      on s.id = requested.service_id
     and s.workspace_id = v_workspace_id
     and s.is_active
     and s.archived_at is null;

  if v_service_count <> cardinality(p_service_ids)
     or v_currency_count <> 1
     or v_duration not between 1 and 1440 then
    raise exception 'One or more selected services are unavailable';
  end if;

  if not exists (
    select 1 from public.get_public_available_slots_for_services(
      p_slug,
      p_service_ids,
      (p_starts_at at time zone v_timezone)::date
    ) slot where slot.starts_at = p_starts_at
  ) then
    raise exception 'Selected time is no longer available';
  end if;

  v_response := public.create_public_booking(
    p_slug,
    v_first_service_id,
    p_name,
    p_email,
    p_phone,
    p_starts_at,
    p_customer_note,
    v_request_key,
    p_locale
  );

  select * into v_appointment
    from public.appointments a
   where a.id = (v_response->>'id')::uuid
     and a.workspace_id = v_workspace_id
   for update;
  if v_appointment.id is null then
    raise exception 'Appointment was not created';
  end if;

  delete from public.appointment_services
   where appointment_id = v_appointment.id;

  insert into public.appointment_services (
    appointment_id, workspace_id, position, service_id,
    service_name_snapshot, duration_minutes_snapshot, price_amount_snapshot,
    currency_snapshot, buffer_before_minutes_snapshot,
    buffer_after_minutes_snapshot
  )
  select
    v_appointment.id, v_workspace_id, requested.position, s.id, s.name,
    s.duration_minutes, s.price_amount, s.currency,
    s.buffer_before_minutes, s.buffer_after_minutes
    from unnest(p_service_ids) with ordinality
      as requested(service_id, position)
    join public.services s
      on s.id = requested.service_id
     and s.workspace_id = v_workspace_id;

  select jsonb_agg(jsonb_build_object(
           'position', aps.position,
           'serviceId', aps.service_id,
           'serviceName', aps.service_name_snapshot,
           'durationMinutes', aps.duration_minutes_snapshot,
           'priceAmount', aps.price_amount_snapshot,
           'currency', aps.currency_snapshot
         ) order by aps.position)
    into v_service_items
    from public.appointment_services aps
   where aps.appointment_id = v_appointment.id;

  update public.appointments
     set service_id = v_first_service_id,
         service_name_snapshot = v_service_name,
         duration_minutes_snapshot = v_duration,
         price_amount_snapshot = v_price,
         currency_snapshot = v_currency,
         buffer_before_minutes_snapshot = v_buffer_before,
         buffer_after_minutes_snapshot = v_buffer_after,
         ends_at = starts_at + make_interval(mins => v_duration)
   where id = v_appointment.id
   returning * into v_appointment;

  update public.booking_decision_email_outbox
     set service_name = v_service_name
   where appointment_id = v_appointment.id;

  v_response := jsonb_build_object(
    'id', v_appointment.id,
    'startsAt', v_appointment.starts_at,
    'endsAt', v_appointment.ends_at,
    'serviceName', v_appointment.service_name_snapshot,
    'serviceItems', v_service_items,
    'durationMinutes', v_appointment.duration_minutes_snapshot,
    'priceAmount', v_appointment.price_amount_snapshot,
    'status', v_appointment.status
  );

  update public.public_booking_requests
     set response = v_response
   where workspace_id = v_workspace_id
     and idempotency_key = v_request_key;

  return v_response;
exception
  when exclusion_violation then
    raise exception 'Selected time is no longer available';
end;
$$;

revoke all on function public.create_public_booking_with_services(
  text, uuid[], text, text, text, timestamptz, text, text, text
) from public;
grant execute on function public.create_public_booking_with_services(
  text, uuid[], text, text, text, timestamptz, text, text, text
) to anon, authenticated;

create function public.list_master_appointment_services(
  p_workspace_id uuid,
  p_appointment_id uuid
)
returns table (
  "position" integer,
  service_id uuid,
  service_name text,
  duration_minutes integer,
  price_amount numeric,
  currency text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.appointments a
     where a.id = p_appointment_id
       and a.workspace_id = p_workspace_id
  ) then
    raise exception 'Appointment not found' using errcode = 'P0002';
  end if;

  return query
  select aps.position, aps.service_id, aps.service_name_snapshot,
         aps.duration_minutes_snapshot, aps.price_amount_snapshot,
         aps.currency_snapshot::text
    from public.appointment_services aps
   where aps.appointment_id = p_appointment_id
     and aps.workspace_id = p_workspace_id
   order by aps.position;
end;
$$;

revoke all on function public.list_master_appointment_services(uuid, uuid)
  from public, anon;
grant execute on function public.list_master_appointment_services(uuid, uuid)
  to authenticated;

notify pgrst, 'reload schema';
