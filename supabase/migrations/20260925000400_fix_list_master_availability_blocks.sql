-- SCH-68: disambiguate output column names in the block listing function.

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

  select w.timezone
  into v_timezone
  from public.workspaces w
  where w.id = p_workspace_id
    and w.status = 'active';

  if v_timezone is null then
    raise exception 'Workspace is not active';
  end if;

  v_from := p_from_date::timestamp at time zone v_timezone;
  v_until := (p_to_date + 1)::timestamp at time zone v_timezone;

  return query
  select ae.id as id, ae.starts_at as starts_at,
    ae.ends_at as ends_at, ae.reason as reason
  from public.availability_exceptions ae
  where ae.workspace_id = p_workspace_id
    and ae.kind = 'blocked'
    and ae.starts_at < v_until
    and ae.ends_at > v_from
  order by ae.starts_at;
end;
$$;
