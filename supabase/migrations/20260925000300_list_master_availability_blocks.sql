-- SCH-68: list personal availability blocks in workspace-local dates.

create or replace function public.list_master_availability_blocks(
  p_workspace_id uuid,
  p_from_date date,
  p_to_date date
)
returns table (
  id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  reason text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_timezone text;
  v_from timestamptz;
  v_until timestamptz;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  if p_from_date is null or p_to_date is null or p_to_date < p_from_date then
    raise exception 'Availability block date range is invalid';
  end if;

  select timezone
  into v_timezone
  from public.workspaces
  where id = p_workspace_id
    and status = 'active';

  if v_timezone is null then
    raise exception 'Workspace is not active';
  end if;

  v_from := p_from_date::timestamp at time zone v_timezone;
  v_until := (p_to_date + 1)::timestamp at time zone v_timezone;

  return query
  select ae.id, ae.starts_at, ae.ends_at, ae.reason
  from public.availability_exceptions ae
  where ae.workspace_id = p_workspace_id
    and ae.kind = 'blocked'
    and ae.starts_at < v_until
    and ae.ends_at > v_from
  order by ae.starts_at;
end;
$$;

revoke all on function public.list_master_availability_blocks(uuid, date, date)
  from public, anon;
grant execute on function public.list_master_availability_blocks(uuid, date, date)
  to authenticated;
