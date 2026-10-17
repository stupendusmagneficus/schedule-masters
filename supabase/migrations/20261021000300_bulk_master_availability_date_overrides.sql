-- SCH-121: apply a bulk date selection in one transaction. The single-date
-- RPC remains the source of validation and each date keeps its own override.
create or replace function public.set_master_availability_date_overrides(
  p_workspace_id uuid,
  p_overrides jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item jsonb;
  v_date date;
  v_result jsonb;
  v_processed jsonb := '[]'::jsonb;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  if p_overrides is null
    or jsonb_typeof(p_overrides) <> 'array'
    or jsonb_array_length(p_overrides) = 0 then
    raise exception 'At least one availability date override is required';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_overrides) as items(value)
     where jsonb_typeof(items.value) <> 'object'
        or items.value ->> 'date' is null
        or items.value ->> 'date' !~ '^\d{4}-\d{2}-\d{2}$'
        or items.value ->> 'kind' not in ('closed', 'modified')
  ) then
    raise exception 'Availability date override is invalid';
  end if;

  if (
    select count(distinct items.value ->> 'date')
      from jsonb_array_elements(p_overrides) as items(value)
  ) <> jsonb_array_length(p_overrides) then
    raise exception 'Availability date overrides cannot contain duplicate dates';
  end if;

  -- Stable lock ordering avoids deadlocks when concurrent bulk operations
  -- contain overlapping dates in different input orders.
  for v_item in
    select items.value
      from jsonb_array_elements(p_overrides) as items(value)
     order by (items.value ->> 'date')::date
  loop
    v_date := (v_item ->> 'date')::date;
    v_result := public.set_master_availability_date_override(
      p_workspace_id,
      v_date,
      v_item ->> 'kind',
      nullif(v_item ->> 'startLocalTime', '')::time,
      nullif(v_item ->> 'endLocalTime', '')::time
    );
    v_processed := v_processed || jsonb_build_array(v_result);
  end loop;

  return jsonb_build_object('processed', v_processed);
end;
$$;

revoke all on function public.set_master_availability_date_overrides(
  uuid, jsonb
) from public, anon;
grant execute on function public.set_master_availability_date_overrides(
  uuid, jsonb
) to authenticated;

-- Include occupied boundaries so the calendar can warn about conflicts caused
-- by appointment buffers when a date's work hours are shortened or closed.
drop function public.list_master_appointments(uuid, date, date);
create function public.list_master_appointments(
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
  paid_amount numeric,
  currency text,
  starts_at timestamptz,
  ends_at timestamptz,
  occupied_starts_at timestamptz,
  occupied_ends_at timestamptz,
  status public.appointment_status,
  source public.appointment_source,
  is_new_customer boolean,
  is_returning_customer boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timezone text;
  v_month_start timestamptz;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;
  if p_from_date is null or p_to_date is null or p_to_date < p_from_date then
    raise exception 'Invalid appointment date range';
  end if;

  select w.timezone into v_timezone
    from public.workspaces w where w.id = p_workspace_id;
  v_month_start := date_trunc('month', p_from_date::timestamp) at time zone v_timezone;
  return query
  select a.id,
         a.customer_id,
         c.name,
         a.service_name_snapshot,
         a.duration_minutes_snapshot,
         a.price_amount_snapshot,
         a.paid_amount,
         a.currency_snapshot::text,
         a.starts_at,
         a.ends_at,
         lower(a.occupied_range),
         upper(a.occupied_range),
         a.status,
         a.source,
         (a.status = 'completed' and not exists (
           select 1 from public.appointments prior
            where prior.workspace_id = a.workspace_id
              and prior.customer_id = a.customer_id
              and prior.status = 'completed'
              and prior.starts_at < v_month_start
         )) as is_new_customer,
         (a.status = 'completed' and exists (
           select 1 from public.appointments prior
            where prior.workspace_id = a.workspace_id
              and prior.customer_id = a.customer_id
              and prior.status = 'completed'
              and prior.starts_at < v_month_start
         )) as is_returning_customer
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
