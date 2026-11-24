-- Multi-service public booking inserts the first service, then extends ends_at to
-- the combined duration after create_public_booking_with_services has already
-- matched the full slot. The slot re-check is therefore an INSERT-time guard;
-- override bounds, personal blocks and the exclusion constraint still apply to
-- every UPDATE.

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
    and tg_op = 'INSERT'
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

revoke all on function public.validate_appointment_date_override()
  from public, anon, authenticated;
