create table public.appointment_series (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete restrict,
  interval_weeks integer not null check (interval_weeks in (1, 2)),
  occurrence_count integer not null check (occurrence_count between 2 and 24),
  created_at timestamptz not null default now()
);

alter table public.appointments
  add column appointment_series_id uuid references public.appointment_series(id) on delete set null;

alter table public.appointment_series enable row level security;
revoke all on public.appointment_series from anon, authenticated;

create table private.master_recurring_booking_requests (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  idempotency_key text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, idempotency_key)
);

create function public.preview_master_recurring_bookings(
  p_workspace_id uuid,
  p_service_ids uuid[],
  p_starts_at timestamptz,
  p_interval_weeks integer,
  p_occurrence_count integer
)
returns table (starts_at timestamptz, local_date date, available boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timezone text;
  v_index integer;
  v_starts_at timestamptz;
  v_date date;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;
  if p_interval_weeks not in (1, 2)
     or p_occurrence_count not between 2 and 24
     or p_service_ids is null
     or cardinality(p_service_ids) < 1 then
    raise exception 'Invalid recurring booking settings';
  end if;
  select workspace.timezone into v_timezone
    from public.workspaces workspace where workspace.id = p_workspace_id;

  for v_index in 0..(p_occurrence_count - 1) loop
    v_starts_at := ((p_starts_at at time zone v_timezone)
      + make_interval(days => v_index * p_interval_weeks * 7))
      at time zone v_timezone;
    v_date := (v_starts_at at time zone v_timezone)::date;
    return query
      select v_starts_at,
             v_date,
             exists (
               select 1 from public.get_master_available_slots_for_services(
                 p_workspace_id, p_service_ids, v_date
               ) slot where slot.starts_at = v_starts_at
             );
  end loop;
end;
$$;

revoke all on function public.preview_master_recurring_bookings(
  uuid, uuid[], timestamptz, integer, integer
) from public, anon;
grant execute on function public.preview_master_recurring_bookings(
  uuid, uuid[], timestamptz, integer, integer
) to authenticated;

create function public.create_master_recurring_bookings(
  p_workspace_id uuid,
  p_service_ids uuid[],
  p_starts_at timestamptz,
  p_idempotency_key text,
  p_interval_weeks integer,
  p_occurrence_count integer,
  p_excluded_dates date[] default '{}'::date[],
  p_customer_id uuid default null,
  p_name text default null,
  p_email text default null,
  p_phone text default null,
  p_master_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing jsonb;
  v_response jsonb;
  v_appointments jsonb := '[]'::jsonb;
  v_series_id uuid := gen_random_uuid();
  v_customer_id uuid := p_customer_id;
  v_appointment_id uuid;
  v_index integer;
  v_key text;
  v_timezone text;
  v_local_date date;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;
  if p_interval_weeks not in (1, 2)
     or p_occurrence_count not between 2 and 24
     or p_idempotency_key is null
     or length(p_idempotency_key) > 80 then
    raise exception 'Invalid recurring booking settings';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_workspace_id::text || ':series:' || p_idempotency_key, 0)
  );
  select request.response into v_existing
    from private.master_recurring_booking_requests request
   where request.workspace_id = p_workspace_id
     and request.idempotency_key = p_idempotency_key;
  if v_existing is not null then return v_existing; end if;

  select workspace.timezone into v_timezone
    from public.workspaces workspace
   where workspace.id = p_workspace_id;

  insert into public.appointment_series (
    id, workspace_id, customer_id, interval_weeks, occurrence_count
  ) values (
    v_series_id, p_workspace_id, v_customer_id,
    p_interval_weeks, p_occurrence_count
  );

  for v_index in 0..(p_occurrence_count - 1) loop
    v_key := p_idempotency_key || '-' || v_index::text;
    v_local_date := (((p_starts_at at time zone v_timezone)
      + make_interval(days => v_index * p_interval_weeks * 7))::date);
    if not (v_local_date = any(coalesce(p_excluded_dates, '{}'::date[]))) then
      v_response := public.create_master_booking_with_services(
      p_workspace_id,
      p_service_ids,
      ((p_starts_at at time zone v_timezone)
        + make_interval(days => v_index * p_interval_weeks * 7))
        at time zone v_timezone,
      v_key,
      v_customer_id,
      case when v_customer_id is null then p_name else null end,
      case when v_customer_id is null then p_email else null end,
      case when v_customer_id is null then p_phone else null end,
      p_master_note
      );
      v_appointment_id := (v_response ->> 'id')::uuid;
      select appointment.customer_id into v_customer_id
        from public.appointments appointment
       where appointment.id = v_appointment_id
         and appointment.workspace_id = p_workspace_id;
      update public.appointments
         set appointment_series_id = v_series_id
       where id = v_appointment_id
         and workspace_id = p_workspace_id;
      v_appointments := v_appointments || jsonb_build_array(v_response);
    end if;
  end loop;

  if jsonb_array_length(v_appointments) = 0 then
    raise exception 'At least one recurring appointment must remain';
  end if;

  update public.appointment_series
     set customer_id = v_customer_id
   where id = v_series_id;
  v_response := jsonb_build_object(
    'seriesId', v_series_id,
    'appointments', v_appointments
  );
  insert into private.master_recurring_booking_requests (
    workspace_id, idempotency_key, response
  ) values (p_workspace_id, p_idempotency_key, v_response);
  return v_response;
end;
$$;

revoke all on function public.create_master_recurring_bookings(
  uuid, uuid[], timestamptz, text, integer, integer, date[], uuid, text, text, text, text
) from public, anon;
grant execute on function public.create_master_recurring_bookings(
  uuid, uuid[], timestamptz, text, integer, integer, date[], uuid, text, text, text, text
) to authenticated;

create function public.cancel_master_appointment_series_future(
  p_workspace_id uuid,
  p_appointment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_series_id uuid;
  v_appointment_id uuid;
  v_cancelled integer := 0;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;
  select appointment.appointment_series_id into v_series_id
    from public.appointments appointment
   where appointment.id = p_appointment_id
     and appointment.workspace_id = p_workspace_id;
  if v_series_id is null then raise exception 'Appointment series not found' using errcode = 'P0002'; end if;

  for v_appointment_id in
    select appointment.id
      from public.appointments appointment
     where appointment.appointment_series_id = v_series_id
       and appointment.workspace_id = p_workspace_id
       and appointment.starts_at >= now()
       and appointment.status in ('pending', 'confirmed')
     order by appointment.starts_at
  loop
    perform public.set_appointment_status(
      v_appointment_id,
      'cancelled_by_master',
      'Cancelled with recurring series'
    );
    v_cancelled := v_cancelled + 1;
  end loop;
  return jsonb_build_object('seriesId', v_series_id, 'cancelledCount', v_cancelled);
end;
$$;

revoke all on function public.cancel_master_appointment_series_future(uuid, uuid)
  from public, anon;
grant execute on function public.cancel_master_appointment_series_future(uuid, uuid)
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
  master_note text,
  appointment_series_id uuid
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
  select workspace.timezone into v_timezone
    from public.workspaces workspace where workspace.id = p_workspace_id;
  v_month_start := date_trunc('month', p_from_date::timestamp) at time zone v_timezone;
  return query
  select appointment.id,
         appointment.customer_id,
         customer.name,
         appointment.service_name_snapshot,
         appointment.duration_minutes_snapshot,
         appointment.price_amount_snapshot,
         appointment.paid_amount,
         appointment.currency_snapshot::text,
         appointment.starts_at,
         appointment.ends_at,
         lower(appointment.occupied_range),
         upper(appointment.occupied_range),
         appointment.status,
         appointment.source,
         (appointment.status = 'completed' and not exists (
           select 1 from public.appointments prior
            where prior.workspace_id = appointment.workspace_id
              and prior.customer_id = appointment.customer_id
              and prior.status = 'completed'
              and prior.starts_at < v_month_start
         )),
         (appointment.status = 'completed' and exists (
           select 1 from public.appointments prior
            where prior.workspace_id = appointment.workspace_id
              and prior.customer_id = appointment.customer_id
              and prior.status = 'completed'
              and prior.starts_at < v_month_start
         )),
         appointment.master_note,
         appointment.appointment_series_id
    from public.appointments appointment
    join public.customers customer on customer.id = appointment.customer_id
   where appointment.workspace_id = p_workspace_id
     and appointment.starts_at < ((p_to_date + 1)::timestamp at time zone v_timezone)
     and appointment.ends_at > (p_from_date::timestamp at time zone v_timezone)
   order by appointment.starts_at;
end;
$$;

revoke all on function public.list_master_appointments(uuid, date, date)
  from public, anon;
grant execute on function public.list_master_appointments(uuid, date, date)
  to authenticated;
