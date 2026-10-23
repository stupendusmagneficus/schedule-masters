-- SCH-153: return one sanitized aggregate for the selected workspace date range.
-- "Received" is the recorded paid_amount of completed visits, attributed to
-- each visit's local start date. It is neither bank cash flow nor profit.
create function public.get_master_finance_report(
  p_workspace_id uuid,
  p_from_date date,
  p_to_date date,
  p_as_of timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timezone text;
  v_from timestamptz;
  v_to timestamptz;
  v_report jsonb;
begin
  if auth.uid() is null or not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;
  if p_from_date is null or p_to_date is null or p_to_date < p_from_date
     or p_as_of is null then
    raise exception 'Invalid finance date range';
  end if;

  select workspace.timezone into v_timezone
    from public.workspaces workspace where workspace.id = p_workspace_id;
  v_from := p_from_date::timestamp at time zone v_timezone;
  v_to := (p_to_date + 1)::timestamp at time zone v_timezone;

  with selected as materialized (
    select appointment.customer_id,
           appointment.duration_minutes_snapshot,
           appointment.paid_amount,
           appointment.price_amount_snapshot,
           upper(trim(appointment.currency_snapshot::text)) as currency,
           appointment.starts_at,
           (appointment.starts_at at time zone v_timezone)::date as local_date,
           appointment.status
      from public.appointments appointment
     where appointment.workspace_id = p_workspace_id
       and appointment.starts_at >= v_from
       and appointment.starts_at < v_to
  ),
  totals as (
    select count(*)::bigint as appointment_count,
           count(*) filter (where status = 'completed')::bigint as completed_count,
           count(*) filter (
             where status in ('pending','confirmed') and starts_at >= p_as_of
           )::bigint as upcoming_count,
           count(*) filter (
             where status in ('cancelled_by_customer','cancelled_by_master')
           )::bigint as canceled_count,
           count(*) filter (where status = 'no_show')::bigint as no_show_count,
           coalesce(sum(duration_minutes_snapshot) filter (
             where status = 'completed'
                or (status in ('pending','confirmed') and starts_at >= p_as_of)
           ),0)::bigint as booked_minutes
      from selected
  ),
  completed_customers as (
    select distinct customer_id from selected where status = 'completed'
  ),
  customer_types as (
    select customer.customer_id,
           exists (
             select 1 from public.appointments prior
              where prior.workspace_id = p_workspace_id
                and prior.customer_id = customer.customer_id
                and prior.status = 'completed'
                and prior.starts_at < v_from
           ) as visited_before
      from completed_customers customer
  ),
  customer_totals as (
    select count(*) filter (where not visited_before)::bigint as new_count,
           count(*) filter (where visited_before)::bigint as returning_count
      from customer_types
  ),
  paid as (
    select currency, sum(paid_amount) as amount
      from selected where status = 'completed'
     group by currency
  ),
  expected as (
    select currency, sum(price_amount_snapshot) as amount
      from selected
     where status in ('pending','confirmed') and starts_at >= p_as_of
     group by currency
  ),
  weekly as (
    select (local_date - p_from_date) / 7 as week_index,
           currency,
           sum(paid_amount) as amount
      from selected where status = 'completed'
     group by (local_date - p_from_date) / 7, currency
  )
  select jsonb_build_object(
    'appointmentCount', totals.appointment_count,
    'bookedMinutes', totals.booked_minutes,
    'canceledCount', totals.canceled_count,
    'completedCount', totals.completed_count,
    'expectedByCurrency', coalesce(
      (select jsonb_object_agg(currency, amount) from expected), '{}'::jsonb
    ),
    'newCustomerCount', customer_totals.new_count,
    'noShowCount', totals.no_show_count,
    'paidByCurrency', coalesce(
      (select jsonb_object_agg(currency, amount) from paid), '{}'::jsonb
    ),
    'returningCustomerCount', customer_totals.returning_count,
    'upcomingCount', totals.upcoming_count,
    'weeklyPaid', coalesce(
      (select jsonb_agg(
        jsonb_build_object(
          'weekIndex', week_index,
          'currency', currency,
          'amount', amount
        ) order by week_index, currency
      ) from weekly), '[]'::jsonb
    )
  ) into v_report
  from totals cross join customer_totals;

  return v_report;
end;
$$;

revoke all on function public.get_master_finance_report(uuid,date,date,timestamptz)
  from public, anon;
grant execute on function public.get_master_finance_report(uuid,date,date,timestamptz)
  to authenticated;
