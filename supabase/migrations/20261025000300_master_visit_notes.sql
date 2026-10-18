-- SCH-132: expose master-owned notes for a visit in master-only RPCs.
create or replace function public.set_master_appointment_note(
  p_workspace_id uuid,
  p_appointment_id uuid,
  p_master_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_master_note text;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;
  if p_master_note is not null and length(p_master_note) > 1000 then
    raise exception 'Appointment note must be 1000 characters or fewer';
  end if;

  update public.appointments a
     set master_note = nullif(trim(p_master_note), ''),
         updated_at = now()
   where a.id = p_appointment_id
     and a.workspace_id = p_workspace_id
  returning a.master_note into v_master_note;

  if not found then
    raise exception 'Appointment not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'id', p_appointment_id,
    'master_note', v_master_note
  );
end;
$$;

revoke all on function public.set_master_appointment_note(uuid, uuid, text)
  from public, anon;
grant execute on function public.set_master_appointment_note(uuid, uuid, text)
  to authenticated;

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
  is_returning_customer boolean,
  master_note text
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
         )) as is_returning_customer,
         a.master_note
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

drop function public.list_master_customer_history(uuid, uuid);
create function public.list_master_customer_history(
  p_workspace_id uuid,
  p_customer_id uuid
)
returns table (
  id uuid,
  customer_id uuid,
  customer_name text,
  service_name text,
  duration_minutes integer,
  ends_at timestamptz,
  starts_at timestamptz,
  status public.appointment_status,
  price_amount numeric,
  paid_amount numeric,
  currency text,
  source public.appointment_source,
  master_note text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.customers c
     where c.id = p_customer_id
       and c.workspace_id = p_workspace_id
       and c.anonymized_at is null
  ) then
    raise exception 'Customer not found' using errcode = 'P0002';
  end if;

  return query
  select a.id,
         a.customer_id,
         c.name,
         a.service_name_snapshot,
         a.duration_minutes_snapshot,
         a.ends_at,
         a.starts_at,
         a.status,
         a.price_amount_snapshot,
         a.paid_amount,
         a.currency_snapshot::text,
         a.source,
         a.master_note
    from public.appointments a
    join public.customers c on c.id = a.customer_id
   where a.workspace_id = p_workspace_id
     and a.customer_id = p_customer_id
   order by a.starts_at desc, a.id
   limit 200;
end;
$$;

revoke all on function public.list_master_customer_history(uuid, uuid)
  from public, anon;
grant execute on function public.list_master_customer_history(uuid, uuid)
  to authenticated;
