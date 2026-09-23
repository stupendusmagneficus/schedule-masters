-- Public booking access is exposed only through narrowly-scoped functions.
-- Direct anon access to business tables remains disabled by RLS.

create or replace function public.get_public_booking_context(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_workspace_id uuid;
  v_workspace_name text;
  v_timezone text;
  v_slug text;
begin
  select w.id, w.name, w.timezone, bl.slug
  into v_workspace_id, v_workspace_name, v_timezone, v_slug
  from public.booking_links bl
  join public.workspaces w on w.id = bl.workspace_id
  where bl.slug = lower(trim(p_slug))
    and bl.is_active = true
    and w.status = 'active';

  if v_workspace_id is null then
    return null;
  end if;

  return jsonb_build_object(
    'workspace', jsonb_build_object(
      'id', v_workspace_id,
      'name', v_workspace_name,
      'timezone', v_timezone,
      'slug', v_slug
    ),
    'services', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'name', s.name,
          'description', s.description,
          'durationMinutes', s.duration_minutes,
          'priceAmount', s.price_amount,
          'currency', s.currency
        ) order by s.sort_order, s.name
      )
      from public.services s
      where s.workspace_id = v_workspace_id
        and s.is_active = true
        and s.archived_at is null
    ), '[]'::jsonb)
  );
end;
$$;

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
begin
  select bl.workspace_id, w.timezone
  into v_workspace_id, v_timezone
  from public.booking_links bl
  join public.workspaces w on w.id = bl.workspace_id
  where bl.slug = lower(trim(p_slug))
    and bl.is_active = true
    and w.status = 'active';

  select s.duration_minutes
  into v_duration
  from public.services s
  where s.id = p_service_id
    and s.workspace_id = v_workspace_id
    and s.is_active = true
    and s.archived_at is null;

  if v_workspace_id is null or v_duration is null then
    return;
  end if;

  return query
  with matching_rules as (
    select ar.start_local_time, ar.end_local_time
    from public.availability_rules ar
    where ar.workspace_id = v_workspace_id
      and ar.day_of_week = extract(isodow from p_date)::smallint
      and ar.is_active = true
      and p_date >= ar.valid_from
      and (ar.valid_until is null or p_date <= ar.valid_until)
  ), candidate_slots as (
    select gs as local_start,
      gs + make_interval(mins => v_duration) as local_end
    from matching_rules mr
    cross join lateral generate_series(
      p_date + mr.start_local_time,
      p_date + mr.end_local_time - make_interval(mins => v_duration),
      interval '30 minutes'
    ) gs
  ), utc_slots as (
    select
      (local_start at time zone v_timezone) as slot_start,
      (local_end at time zone v_timezone) as slot_end
    from candidate_slots
  )
  select us.slot_start, us.slot_end
  from utc_slots us
  where not exists (
    select 1
    from public.availability_breaks ab
    join public.availability_rules ar on ar.id = ab.availability_rule_id
    where ar.workspace_id = v_workspace_id
      and ar.day_of_week = extract(isodow from p_date)::smallint
      and p_date + ab.start_local_time < (us.slot_end at time zone v_timezone)
      and p_date + ab.end_local_time > (us.slot_start at time zone v_timezone)
  )
  and not exists (
    select 1
    from public.availability_exceptions ae
    where ae.workspace_id = v_workspace_id
      and ae.kind = 'blocked'
      and ae.starts_at < us.slot_end
      and ae.ends_at > us.slot_start
  )
  and not exists (
    select 1
    from public.appointments a
    where a.workspace_id = v_workspace_id
      and a.status in ('pending', 'confirmed')
      and a.starts_at < us.slot_end
      and a.ends_at > us.slot_start
  )
  order by us.slot_start;
end;
$$;

create or replace function public.create_public_booking(
  p_slug text,
  p_service_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_starts_at timestamptz,
  p_customer_note text default null
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
  v_email text := nullif(lower(trim(p_email)), '');
  v_phone text := nullif(trim(p_phone), '');
begin
  if nullif(trim(p_name), '') is null then
    raise exception 'Customer name is required';
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

  if not exists (
    select 1
    from public.get_public_available_slots(p_slug, p_service_id, (p_starts_at at time zone v_timezone)::date) slot
    where slot.starts_at = p_starts_at
  ) then
    raise exception 'Selected time is no longer available';
  end if;

  select c.id into v_customer_id
  from public.customers c
  where c.workspace_id = v_workspace_id
    and ((v_email is not null and c.normalized_email = v_email)
      or (v_phone is not null and c.normalized_phone = v_phone))
  limit 1;

  if v_customer_id is null then
    insert into public.customers (workspace_id, name, email, phone, normalized_email, normalized_phone)
    values (v_workspace_id, trim(p_name), v_email, v_phone, v_email, v_phone)
    returning id into v_customer_id;
  else
    update public.customers
    set name = trim(p_name), email = coalesce(v_email, email), phone = coalesce(v_phone, phone)
    where id = v_customer_id;
  end if;

  insert into public.appointments (
    workspace_id, customer_id, service_id, service_name_snapshot,
    duration_minutes_snapshot, price_amount_snapshot, currency_snapshot,
    starts_at, ends_at, status, source, customer_note
  )
  values (
    v_workspace_id, v_customer_id, v_service.id, v_service.name,
    v_service.duration_minutes, v_service.price_amount, v_service.currency,
    p_starts_at,
    p_starts_at + make_interval(mins => v_service.duration_minutes),
    'pending', 'public_booking', nullif(trim(p_customer_note), '')
  )
  returning * into v_appointment;

  return jsonb_build_object(
    'id', v_appointment.id,
    'startsAt', v_appointment.starts_at,
    'endsAt', v_appointment.ends_at,
    'serviceName', v_appointment.service_name_snapshot,
    'status', v_appointment.status
  );
exception
  when exclusion_violation then
    raise exception 'Selected time is no longer available';
end;
$$;

grant execute on function public.get_public_booking_context(text) to anon, authenticated;
grant execute on function public.get_public_available_slots(text, uuid, date) to anon, authenticated;
grant execute on function public.create_public_booking(text, uuid, text, text, text, timestamptz, text) to anon, authenticated;
