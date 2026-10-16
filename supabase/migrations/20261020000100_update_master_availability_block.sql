-- Forward-only RPC addition: allow workspace members to update their personal
-- availability blocks while preserving the same overlap and access checks as
-- create_master_availability_block.
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
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_block public.availability_exceptions%rowtype;
  v_reason text := nullif(trim(p_reason), '');
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  select *
  into v_block
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

  select timezone
  into v_timezone
  from public.workspaces
  where id = p_workspace_id
    and status = 'active';

  if v_timezone is null then
    raise exception 'Workspace is not active';
  end if;

  v_starts_at := (p_date + p_start_local_time) at time zone v_timezone;
  v_ends_at := (p_date + p_end_local_time) at time zone v_timezone;

  if exists (
    select 1
    from public.appointments a
    where a.workspace_id = p_workspace_id
      and a.status in ('pending', 'confirmed')
      and a.occupied_range && tstzrange(v_starts_at, v_ends_at, '[)')
  ) then
    raise exception 'Availability block overlaps an existing appointment';
  end if;

  if exists (
    select 1
    from public.availability_exceptions ae
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

revoke all on function public.update_master_availability_block(
  uuid, uuid, date, time, time, text
) from public, anon;
grant execute on function public.update_master_availability_block(
  uuid, uuid, date, time, time, text
) to authenticated;
