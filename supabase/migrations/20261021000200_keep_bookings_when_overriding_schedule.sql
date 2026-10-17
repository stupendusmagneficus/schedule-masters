-- SCH-119: changing one day's availability must never cancel or remove existing
-- appointments. The calendar warns the master and displays conflicts before
-- this RPC is called; the trigger still blocks future bookings outside the
-- resulting date override.
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

  -- Serialize the override with appointment writes for this local date.
  perform pg_advisory_xact_lock(
    hashtextextended(p_workspace_id::text || ':' || p_date::text, 0)
  );

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
