-- Keep booking writes and personal availability blocks consistent when they
-- happen concurrently for the same workspace-local date.

create or replace function public.create_master_availability_block(
  p_workspace_id uuid,
  p_date date,
  p_start_local_time time,
  p_end_local_time time,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_timezone text;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_block public.availability_exceptions%rowtype;
  v_reason text := nullif(trim(p_reason), '');
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  if p_date is null
    or p_start_local_time is null
    or p_end_local_time is null
    or p_end_local_time <= p_start_local_time then
    raise exception 'Availability block must have a valid time range';
  end if;

  if char_length(coalesce(v_reason, '')) > 120 then
    raise exception 'Availability block reason is too long';
  end if;

  select timezone into v_timezone
    from public.workspaces
   where id = p_workspace_id
     and status = 'active';
  if v_timezone is null then
    raise exception 'Workspace is not active';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_workspace_id::text || ':' || p_date::text, 0)
  );

  v_starts_at := (p_date + p_start_local_time) at time zone v_timezone;
  v_ends_at := (p_date + p_end_local_time) at time zone v_timezone;

  if exists (
    select 1 from public.appointments a
     where a.workspace_id = p_workspace_id
       and a.status in ('pending', 'confirmed')
       and a.occupied_range && tstzrange(v_starts_at, v_ends_at, '[)')
  ) then
    raise exception 'Availability block overlaps an existing appointment';
  end if;

  if exists (
    select 1 from public.availability_exceptions ae
     where ae.workspace_id = p_workspace_id
       and ae.kind = 'blocked'
       and ae.starts_at < v_ends_at
       and ae.ends_at > v_starts_at
  ) then
    raise exception 'Availability block overlaps an existing block';
  end if;

  insert into public.availability_exceptions (
    workspace_id, starts_at, ends_at, kind, reason
  ) values (
    p_workspace_id, v_starts_at, v_ends_at, 'blocked', v_reason
  ) returning * into v_block;

  return jsonb_build_object(
    'id', v_block.id,
    'workspaceId', v_block.workspace_id,
    'startsAt', v_block.starts_at,
    'endsAt', v_block.ends_at,
    'reason', v_block.reason,
    'kind', v_block.kind
  );
end;
$$;

create or replace function public.update_master_availability_block(
  p_workspace_id uuid,
  p_block_id uuid,
  p_date date,
  p_start_local_time time,
  p_end_local_time time,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_timezone text;
  v_old_date date;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_block public.availability_exceptions%rowtype;
  v_reason text := nullif(trim(p_reason), '');
  v_lock_date date;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  select timezone into v_timezone
    from public.workspaces
   where id = p_workspace_id
     and status = 'active';
  if v_timezone is null then
    raise exception 'Workspace is not active';
  end if;

  select * into v_block
    from public.availability_exceptions
   where id = p_block_id
     and workspace_id = p_workspace_id
     and kind = 'blocked'
   for update;
  if not found then
    raise exception 'Availability block not found';
  end if;

  if p_date is null
    or p_start_local_time is null
    or p_end_local_time is null
    or p_end_local_time <= p_start_local_time then
    raise exception 'Availability block must have a valid time range';
  end if;
  if char_length(coalesce(v_reason, '')) > 120 then
    raise exception 'Availability block reason is too long';
  end if;

  v_old_date := (v_block.starts_at at time zone v_timezone)::date;
  for v_lock_date in
    select dates.work_date
      from (values (v_old_date), (p_date)) as dates(work_date)
     group by dates.work_date
     order by dates.work_date
  loop
    perform pg_advisory_xact_lock(
      hashtextextended(p_workspace_id::text || ':' || v_lock_date::text, 0)
    );
  end loop;

  v_starts_at := (p_date + p_start_local_time) at time zone v_timezone;
  v_ends_at := (p_date + p_end_local_time) at time zone v_timezone;

  if exists (
    select 1 from public.appointments a
     where a.workspace_id = p_workspace_id
       and a.status in ('pending', 'confirmed')
       and a.occupied_range && tstzrange(v_starts_at, v_ends_at, '[)')
  ) then
    raise exception 'Availability block overlaps an existing appointment';
  end if;
  if exists (
    select 1 from public.availability_exceptions ae
     where ae.workspace_id = p_workspace_id
       and ae.kind = 'blocked'
       and ae.id <> p_block_id
       and ae.starts_at < v_ends_at
       and ae.ends_at > v_starts_at
  ) then
    raise exception 'Availability block overlaps an existing block';
  end if;

  update public.availability_exceptions
     set starts_at = v_starts_at,
         ends_at = v_ends_at,
         reason = v_reason
   where id = p_block_id
     and workspace_id = p_workspace_id
     and kind = 'blocked'
  returning * into v_block;

  return jsonb_build_object(
    'id', v_block.id,
    'workspaceId', v_block.workspace_id,
    'startsAt', v_block.starts_at,
    'endsAt', v_block.ends_at,
    'reason', v_block.reason,
    'kind', v_block.kind
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

  select w.timezone into v_timezone
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

  if exists (
    select 1 from public.availability_exceptions ae
     where ae.workspace_id = new.workspace_id
       and ae.kind = 'blocked'
       and ae.starts_at < upper(new.occupied_range)
       and ae.ends_at > lower(new.occupied_range)
  ) then
    raise exception 'Selected time overlaps a personal availability block';
  end if;

  select * into v_override
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
      select 1 from private.calculate_available_slots(
        new.workspace_id, new.service_id, v_work_date
      ) slots
       where slots.starts_at = new.starts_at
         and slots.ends_at = new.ends_at
    ) then
    raise exception 'Selected time is no longer available';
  end if;
  return new;
end;
$$;

revoke all on function public.create_master_availability_block(
  uuid, date, time, time, text
) from public, anon;
grant execute on function public.create_master_availability_block(
  uuid, date, time, time, text
) to authenticated;
revoke all on function public.update_master_availability_block(
  uuid, uuid, date, time, time, text
) from public, anon;
grant execute on function public.update_master_availability_block(
  uuid, uuid, date, time, time, text
) to authenticated;
revoke all on function public.validate_appointment_date_override()
  from public, anon, authenticated;
