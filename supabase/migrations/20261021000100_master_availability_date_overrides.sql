-- SCH-120: store one-off master hours separately from weekly rules and
-- personal blocked periods. Local date/time values remain stable if the
-- workspace timezone changes and avoid treating a day off as a personal break.

create table public.availability_date_overrides (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  work_date date not null,
  override_kind text not null check (override_kind in ('closed', 'modified')),
  start_local_time time,
  end_local_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, work_date),
  check (
    (override_kind = 'closed'
      and start_local_time is null
      and end_local_time is null)
    or (override_kind = 'modified'
      and start_local_time is not null
      and end_local_time is not null
      and end_local_time > start_local_time)
  )
);

create trigger availability_date_overrides_set_updated_at
  before update on public.availability_date_overrides
  for each row execute function public.set_updated_at();

alter table public.availability_date_overrides enable row level security;
revoke all on public.availability_date_overrides from anon, authenticated;
grant select on public.availability_date_overrides to authenticated;

create policy availability_date_overrides_member_select
  on public.availability_date_overrides
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create or replace function public.set_master_availability_date_override(
  p_workspace_id uuid,
  p_date date,
  p_kind text,
  p_start_local_time time default null,
  p_end_local_time time default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_timezone text;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_start timestamptz;
  v_end timestamptz;
  v_override public.availability_date_overrides%rowtype;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  if p_date is null or p_kind is null or p_kind not in ('closed', 'modified') then
    raise exception 'Availability date override is invalid';
  end if;

  if p_kind = 'modified'
    and (p_start_local_time is null
      or p_end_local_time is null
      or p_end_local_time <= p_start_local_time) then
    raise exception 'Availability override must have a valid time range';
  end if;

  if p_kind = 'closed'
    and (p_start_local_time is not null or p_end_local_time is not null) then
    raise exception 'Closed date override cannot include working hours';
  end if;

  select w.timezone
    into v_timezone
    from public.workspaces w
   where w.id = p_workspace_id
     and w.status = 'active';

  if v_timezone is null then
    raise exception 'Workspace is not active';
  end if;

  -- Serialize overrides and appointment writes for this workspace-local date.
  perform pg_advisory_xact_lock(
    hashtextextended(p_workspace_id::text || ':' || p_date::text, 0)
  );

  v_day_start := p_date::timestamp at time zone v_timezone;
  v_day_end := (p_date + 1)::timestamp at time zone v_timezone;

  if p_kind = 'modified' then
    v_start := (p_date + p_start_local_time) at time zone v_timezone;
    v_end := (p_date + p_end_local_time) at time zone v_timezone;
  end if;

  if exists (
    select 1
      from public.appointments a
     where a.workspace_id = p_workspace_id
       and a.status in ('pending', 'confirmed')
       and a.starts_at < v_day_end
       and a.ends_at > v_day_start
       and (
         p_kind = 'closed'
         or not (a.occupied_range <@ tstzrange(v_start, v_end, '[)'))
       )
  ) then
    raise exception 'Availability override overlaps an existing appointment';
  end if;

  insert into public.availability_date_overrides (
    workspace_id,
    work_date,
    override_kind,
    start_local_time,
    end_local_time
  )
  values (
    p_workspace_id,
    p_date,
    p_kind,
    p_start_local_time,
    p_end_local_time
  )
  on conflict (workspace_id, work_date)
  do update set
    override_kind = excluded.override_kind,
    start_local_time = excluded.start_local_time,
    end_local_time = excluded.end_local_time
  returning * into v_override;

  return jsonb_build_object(
    'id', v_override.id,
    'workspaceId', v_override.workspace_id,
    'workDate', v_override.work_date,
    'kind', v_override.override_kind,
    'startLocalTime', v_override.start_local_time,
    'endLocalTime', v_override.end_local_time
  );
end;
$$;

create or replace function public.clear_master_availability_date_override(
  p_workspace_id uuid,
  p_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_override_id uuid;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  if p_date is null then
    raise exception 'Availability date is required';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_workspace_id::text || ':' || p_date::text, 0)
  );

  delete from public.availability_date_overrides
   where workspace_id = p_workspace_id
     and work_date = p_date
  returning id into v_override_id;

  return jsonb_build_object(
    'workDate', p_date,
    'removed', v_override_id is not null
  );
end;
$$;

create or replace function public.validate_appointment_date_override()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_timezone text;
  v_work_date date;
  v_override public.availability_date_overrides%rowtype;
  v_has_override boolean := false;
  v_start timestamptz;
  v_end timestamptz;
begin
  if new.status not in ('pending', 'confirmed') then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.status in ('pending', 'confirmed')
      and new.workspace_id = old.workspace_id
      and new.service_id is not distinct from old.service_id
      and new.starts_at = old.starts_at
      and new.ends_at = old.ends_at
      and new.buffer_before_minutes_snapshot = old.buffer_before_minutes_snapshot
      and new.buffer_after_minutes_snapshot = old.buffer_after_minutes_snapshot then
      return new;
    end if;
  end if;

  select w.timezone
    into v_timezone
    from public.workspaces w
   where w.id = new.workspace_id
     and w.status = 'active';

  if v_timezone is null then
    return new;
  end if;

  v_work_date := (new.starts_at at time zone v_timezone)::date;

  perform pg_advisory_xact_lock(
    hashtextextended(new.workspace_id::text || ':' || v_work_date::text, 0)
  );

  select *
    into v_override
    from public.availability_date_overrides o
   where o.workspace_id = new.workspace_id
     and o.work_date = v_work_date;

  if found then
    v_has_override := true;

    if v_override.override_kind = 'closed' then
      raise exception 'Selected time is outside the master schedule for this date';
    end if;

    v_start := (v_work_date + v_override.start_local_time) at time zone v_timezone;
    v_end := (v_work_date + v_override.end_local_time) at time zone v_timezone;

    if not (new.occupied_range <@ tstzrange(v_start, v_end, '[)')) then
      raise exception 'Selected time is outside the master schedule for this date';
    end if;
  end if;

  if v_has_override
    and new.source = 'public_booking'
    and new.service_id is not null
    and not exists (
      select 1
        from private.calculate_available_slots(
          new.workspace_id,
          new.service_id,
          v_work_date
        ) slots
       where slots.starts_at = new.starts_at
         and slots.ends_at = new.ends_at
    ) then
    raise exception 'Selected time is no longer available';
  end if;

  return new;
end;
$$;

create trigger appointments_validate_date_override
  before insert or update of workspace_id, service_id, starts_at, ends_at, status,
    buffer_before_minutes_snapshot, buffer_after_minutes_snapshot
  on public.appointments
  for each row execute function public.validate_appointment_date_override();

-- Availability calculations use the same effective date override for both
-- master and public booking. Legacy availability_exceptions retain their
-- existing meaning: blocked time and additive/modified windows.
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
        interval '30 minutes'
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

revoke all on function public.set_master_availability_date_override(
  uuid, date, text, time, time
) from public, anon;
grant execute on function public.set_master_availability_date_override(
  uuid, date, text, time, time
) to authenticated;

revoke all on function public.clear_master_availability_date_override(
  uuid, date
) from public, anon;
grant execute on function public.clear_master_availability_date_override(
  uuid, date
) to authenticated;

revoke all on function public.validate_appointment_date_override()
  from public, anon, authenticated;
revoke all on function private.calculate_available_slots(uuid, uuid, date)
  from public, anon, authenticated;
