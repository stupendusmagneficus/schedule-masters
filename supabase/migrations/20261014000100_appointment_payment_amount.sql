-- SCH-85: store the amount actually collected separately from the service price.
alter table public.appointments
  add column paid_amount numeric(10, 2) not null default 0,
  add constraint appointments_paid_amount_within_price
    check (paid_amount >= 0 and paid_amount <= price_amount_snapshot);

create or replace function public.set_master_appointment_paid_amount(
  p_appointment_id uuid,
  p_paid_amount numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_status public.appointment_status;
  v_price numeric(10, 2);
begin
  select a.workspace_id, a.status, a.price_amount_snapshot
    into v_workspace_id, v_status, v_price
    from public.appointments a
   where a.id = p_appointment_id
   for update;

  if not found then
    raise exception 'Appointment not found' using errcode = 'P0002';
  end if;
  if not public.is_workspace_member(v_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;
  if v_status <> 'completed' then
    raise exception 'Payment can only be recorded for completed appointments';
  end if;
  if p_paid_amount is null
     or p_paid_amount < 0
     or p_paid_amount > v_price
     or p_paid_amount <> round(p_paid_amount, 2) then
    raise exception 'Payment amount must be between zero and the appointment price';
  end if;

  update public.appointments a
     set paid_amount = p_paid_amount
   where a.id = p_appointment_id
   returning a.workspace_id into v_workspace_id;

  return jsonb_build_object('id', p_appointment_id, 'paid_amount', p_paid_amount);
end;
$$;

revoke all on function public.set_master_appointment_paid_amount(uuid, numeric)
  from public, anon;
grant execute on function public.set_master_appointment_paid_amount(uuid, numeric)
  to authenticated;

-- Return only range-limited appointments. Cohort flags use earlier completed
-- visits in this workspace, while avoiding sending lifetime history to mobile.
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
  source public.appointment_source
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
         a.source
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
