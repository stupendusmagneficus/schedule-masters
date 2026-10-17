alter table public.workspaces
  add column booking_interval_minutes integer not null default 30
  check (booking_interval_minutes in (15, 30, 60));

drop function public.bootstrap_master_workspace(
  text, text, text, text, integer, numeric, time, time, smallint[]
);

create function public.bootstrap_master_workspace(
  p_name text,
  p_slug text,
  p_locale text,
  p_service_name text,
  p_duration_minutes integer,
  p_price_amount numeric,
  p_start_local_time time,
  p_end_local_time time,
  p_working_days smallint[],
  p_booking_interval_minutes integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_slug text := lower(trim(p_slug));
  v_working_days smallint[];
begin
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;

  if trim(p_name) = '' or trim(p_service_name) = '' then
    raise exception 'Workspace and service names are required';
  end if;

  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Booking slug must contain only lowercase letters, numbers, and hyphens';
  end if;

  if p_duration_minutes <= 0 or p_duration_minutes > 1440
     or p_price_amount < 0 then
    raise exception 'Service duration and price are invalid';
  end if;

  if p_booking_interval_minutes is null
     or p_booking_interval_minutes not in (15, 30, 60) then
    raise exception 'Booking interval must be 15, 30, or 60 minutes';
  end if;

  if p_end_local_time <= p_start_local_time then
    raise exception 'Working day end must be after start';
  end if;

  if p_working_days is null or cardinality(p_working_days) = 0 then
    raise exception 'At least one working day is required';
  end if;

  select array_agg(distinct day_number order by day_number)
    into v_working_days
    from unnest(p_working_days) as days(day_number);

  if exists (
    select 1
      from unnest(v_working_days) as days(day_number)
     where day_number < 1 or day_number > 7
  ) then
    raise exception 'Working days must be between 1 and 7';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select wm.workspace_id
    into v_workspace_id
    from public.workspace_members wm
   where wm.user_id = v_user_id
     and wm.role = 'owner'
   order by wm.created_at
   limit 1;

  if v_workspace_id is null then
    insert into public.workspaces (
      name, slug, locale, booking_interval_minutes
    )
    values (
      trim(p_name), v_slug,
      coalesce(nullif(trim(p_locale), ''), 'cs-CZ'),
      p_booking_interval_minutes
    )
    returning id into v_workspace_id;

    insert into public.workspace_members (workspace_id, user_id, role)
    values (v_workspace_id, v_user_id, 'owner');

    insert into public.booking_links (workspace_id, slug)
    values (v_workspace_id, v_slug);
  end if;

  insert into public.services (
    workspace_id, name, duration_minutes, price_amount, currency, sort_order
  )
  select
    v_workspace_id, trim(p_service_name), p_duration_minutes,
    p_price_amount, 'CZK', 0
  where not exists (
    select 1 from public.services s
     where s.workspace_id = v_workspace_id
       and s.is_active
  );

  insert into public.availability_rules (
    workspace_id, day_of_week, start_local_time, end_local_time, valid_from
  )
  select
    v_workspace_id, day_number, p_start_local_time, p_end_local_time,
    current_date
    from unnest(v_working_days) as days(day_number)
   where not exists (
     select 1 from public.availability_rules ar
      where ar.workspace_id = v_workspace_id
        and ar.is_active
   );

  return jsonb_build_object(
    'workspace_id', v_workspace_id,
    'slug', (
      select bl.slug from public.booking_links bl
       where bl.workspace_id = v_workspace_id limit 1
    )
  );
end;
$$;

revoke all on function public.bootstrap_master_workspace(
  text, text, text, text, integer, numeric, time, time, smallint[], integer
) from public;
grant execute on function public.bootstrap_master_workspace(
  text, text, text, text, integer, numeric, time, time, smallint[], integer
) to authenticated;

drop function public.update_master_workspace_settings(
  uuid, text, text, smallint[], time, time
);

create function public.update_master_workspace_settings(
  p_workspace_id uuid,
  p_name text,
  p_slug text,
  p_working_days smallint[],
  p_start_local_time time,
  p_end_local_time time,
  p_booking_interval_minutes integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_timezone text;
  v_today date;
  v_slug text := lower(btrim(p_slug));
  v_days smallint[];
begin
  if v_user_id is null then
    raise exception using message = 'Authentication is required';
  end if;

  if p_name is null or length(btrim(p_name)) not between 1 and 120 then
    raise exception using message = 'Workspace name must contain 1 to 120 characters';
  end if;

  if v_slug is null or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception using message = 'Booking slug is invalid';
  end if;

  if p_booking_interval_minutes is not null
     and p_booking_interval_minutes not in (15, 30, 60) then
    raise exception using message = 'Booking interval must be 15, 30, or 60 minutes';
  end if;

  if p_start_local_time is null or p_end_local_time is null
     or p_end_local_time <= p_start_local_time then
    raise exception using message = 'Working hours are invalid';
  end if;

  if p_working_days is null or cardinality(p_working_days) = 0 then
    raise exception using message = 'At least one working day is required';
  end if;

  select array_agg(distinct day_number order by day_number)
    into v_days
    from unnest(p_working_days) as days(day_number);

  if exists (
    select 1 from unnest(v_days) as days(day_number)
     where day_number is null or day_number < 1 or day_number > 7
  ) then
    raise exception using message = 'Working days must be between 1 and 7';
  end if;

  select w.timezone
    into v_workspace_timezone
    from public.workspaces w
   where w.id = p_workspace_id
   for update;

  if not found or not exists (
    select 1 from public.workspace_members wm
     where wm.workspace_id = p_workspace_id
       and wm.user_id = v_user_id
       and wm.role = 'owner'
  ) then
    raise exception using message = 'Workspace access denied';
  end if;

  v_today := (now() at time zone v_workspace_timezone)::date;

  if exists (
    select 1 from public.workspaces w
     where w.slug = v_slug and w.id <> p_workspace_id
  ) or exists (
    select 1 from public.booking_links bl
     where bl.slug = v_slug and bl.workspace_id <> p_workspace_id
  ) then
    raise exception using message = 'Booking slug is already taken';
  end if;

  if exists (
    select 1 from public.availability_rules ar
     where ar.workspace_id = p_workspace_id
       and ar.is_active
       and (ar.valid_until is not null or ar.valid_from > v_today)
  ) or exists (
    select 1 from public.availability_rules ar
      join public.availability_breaks ab
        on ab.availability_rule_id = ar.id
     where ar.workspace_id = p_workspace_id
       and ar.is_active
  ) or exists (
    select ar.day_of_week from public.availability_rules ar
     where ar.workspace_id = p_workspace_id
       and ar.is_active
     group by ar.day_of_week
    having count(*) > 1
  ) or exists (
    select ar.workspace_id from public.availability_rules ar
     where ar.workspace_id = p_workspace_id
       and ar.is_active
     group by ar.workspace_id
    having count(distinct (ar.start_local_time, ar.end_local_time)) > 1
  ) then
    raise exception using message = 'Advanced schedule cannot be edited here';
  end if;

  if not exists (
    select 1 from public.booking_links bl
     where bl.workspace_id = p_workspace_id
  ) then
    raise exception using message = 'Workspace booking link is missing';
  end if;

  update public.workspaces
     set name = btrim(p_name),
         slug = v_slug,
         booking_interval_minutes = coalesce(
           p_booking_interval_minutes, booking_interval_minutes
         )
   where id = p_workspace_id;

  update public.booking_links
     set slug = v_slug
   where workspace_id = p_workspace_id;

  update public.availability_rules
     set is_active = false
   where workspace_id = p_workspace_id
     and is_active;

  insert into public.availability_rules (
    workspace_id, day_of_week, start_local_time, end_local_time, valid_from
  )
  select
    p_workspace_id, day_number, p_start_local_time, p_end_local_time, v_today
    from unnest(v_days) as days(day_number);

  return jsonb_build_object(
    'workspace_id', p_workspace_id,
    'name', btrim(p_name),
    'slug', v_slug,
    'working_days', v_days,
    'booking_interval_minutes', coalesce(
      p_booking_interval_minutes,
      (select w.booking_interval_minutes from public.workspaces w
        where w.id = p_workspace_id)
    )
  );
end;
$$;

revoke all on function public.update_master_workspace_settings(
  uuid, text, text, smallint[], time, time, integer
) from public;
grant execute on function public.update_master_workspace_settings(
  uuid, text, text, smallint[], time, time, integer
) to authenticated;

create or replace function private.calculate_available_slots(
  p_workspace_id uuid,
  p_service_id uuid,
  p_date date
)
returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_timezone text;
  v_booking_interval_minutes integer;
  v_duration integer;
  v_buffer_before integer;
  v_buffer_after integer;
begin
  select w.timezone, w.booking_interval_minutes
    into v_timezone, v_booking_interval_minutes
    from public.workspaces w
   where w.id = p_workspace_id
     and w.status = 'active';

  select s.duration_minutes, s.buffer_before_minutes, s.buffer_after_minutes
    into v_duration, v_buffer_before, v_buffer_after
    from public.services s
   where s.id = p_service_id
     and s.workspace_id = p_workspace_id
     and s.is_active = true
     and s.archived_at is null;

  if v_timezone is null or v_duration is null or p_date is null then
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
       and ar.is_active = true
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

revoke all on function private.calculate_available_slots(uuid, uuid, date)
  from public, anon, authenticated;
