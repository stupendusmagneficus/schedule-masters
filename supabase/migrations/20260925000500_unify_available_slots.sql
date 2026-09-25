-- SCH-66: one availability algorithm for public booking and master clients.
-- The calculation stays outside the exposed API surface; public and
-- authenticated wrappers only resolve their respective workspace context.

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
  v_duration integer;
  v_buffer_before integer;
  v_buffer_after integer;
begin
  select w.timezone
    into v_timezone
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
  ),
  availability_windows as (
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
         select 1
           from active_exceptions ae
          where ae.kind = 'modified'
       )
    union all
    select ae.starts_at, ae.ends_at, null::uuid
      from active_exceptions ae
     where ae.kind in ('modified', 'extra')
  ),
  candidate_slots as (
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
        interval '30 minutes'
      ) gs
  ),
  workspace_day_slots as (
    select cs.*
      from candidate_slots cs
     where (cs.occupied_start at time zone v_timezone)::date = p_date
       and (cs.occupied_end at time zone v_timezone)::date = p_date
  )
  select distinct cs.service_start, cs.service_end
    from workspace_day_slots cs
   where not exists (
     select 1
       from public.availability_breaks ab
      where ab.availability_rule_id = cs.availability_rule_id
        and tstzrange(
          (p_date + ab.start_local_time) at time zone v_timezone,
          (p_date + ab.end_local_time) at time zone v_timezone,
          '[)'
        ) && tstzrange(cs.occupied_start, cs.occupied_end, '[)')
   )
     and not exists (
       select 1
         from public.availability_exceptions ae
        where ae.workspace_id = p_workspace_id
          and ae.kind = 'blocked'
          and tstzrange(ae.starts_at, ae.ends_at, '[)')
            && tstzrange(cs.occupied_start, cs.occupied_end, '[)')
     )
     and not exists (
       select 1
         from public.appointments a
        where a.workspace_id = p_workspace_id
          and a.status in ('pending', 'confirmed')
          and a.occupied_range
            && tstzrange(cs.occupied_start, cs.occupied_end, '[)')
     )
   order by cs.service_start;
end;
$$;

create or replace function public.get_master_available_slots(
  p_workspace_id uuid,
  p_service_id uuid,
  p_date date
)
returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  return query
  select slots.starts_at, slots.ends_at
    from private.calculate_available_slots(
      p_workspace_id,
      p_service_id,
      p_date
    ) slots;
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
begin
  select bl.workspace_id
    into v_workspace_id
    from public.booking_links bl
    join public.workspaces w on w.id = bl.workspace_id
   where bl.slug = lower(trim(p_slug))
     and bl.is_active = true
     and w.status = 'active';

  if v_workspace_id is null then
    return;
  end if;

  return query
  select slots.starts_at, slots.ends_at
    from private.calculate_available_slots(
      v_workspace_id,
      p_service_id,
      p_date
    ) slots;
end;
$$;

revoke all on function private.calculate_available_slots(uuid, uuid, date)
  from public, anon, authenticated;

revoke all on function public.get_master_available_slots(uuid, uuid, date)
  from public, anon;
grant execute on function public.get_master_available_slots(uuid, uuid, date)
  to authenticated;

revoke all on function public.get_public_available_slots(text, uuid, date)
  from public;
grant execute on function public.get_public_available_slots(text, uuid, date)
  to anon, authenticated;
