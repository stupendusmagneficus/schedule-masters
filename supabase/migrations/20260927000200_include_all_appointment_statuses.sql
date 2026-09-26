-- SCH-69: keep the master appointment feed consistent across the full lifecycle.
-- Upcoming and historical appointments use the same source of truth; the client
-- decides which terminal states belong in a particular summary.

create or replace function public.list_master_appointments(
  p_workspace_id uuid,
  p_from_date date,
  p_to_date date
)
returns table (
  id uuid,
  customer_id uuid,
  customer_name text,
  service_name text,
  duration_minutes integer,
  price_amount numeric,
  currency text,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.appointment_status,
  source public.appointment_source
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timezone text;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  if p_from_date is null or p_to_date is null or p_to_date < p_from_date then
    raise exception 'Invalid appointment date range';
  end if;

  select w.timezone
    into v_timezone
    from public.workspaces w
   where w.id = p_workspace_id;

  return query
  select
    a.id,
    a.customer_id,
    c.name,
    a.service_name_snapshot,
    a.duration_minutes_snapshot,
    a.price_amount_snapshot,
    a.currency_snapshot::text,
    a.starts_at,
    a.ends_at,
    a.status,
    a.source
    from public.appointments a
    join public.customers c on c.id = a.customer_id
   where a.workspace_id = p_workspace_id
     and a.starts_at < ((p_to_date + 1)::timestamp at time zone v_timezone)
     and a.ends_at > (p_from_date::timestamp at time zone v_timezone)
   order by a.starts_at;
end;
$$;

revoke all on function public.list_master_appointments(uuid, date, date)
  from public, anon;
grant execute on function public.list_master_appointments(uuid, date, date)
  to authenticated;
