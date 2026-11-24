-- Master reschedule (audit F-012): move a pending or confirmed booking to another
-- master slot for its own services. The slot calculation can ignore the booking
-- being moved through a transaction-local setting, so a booking may shift into
-- a range that overlaps its current time. The exclusion constraint, personal
-- blocks and date overrides still guard the final update.

-- The legacy RPC checked public booking rules, ignored multi-service bookings
-- and had no caller.
drop function if exists public.reschedule_appointment(uuid, timestamptz);

create or replace function private.calculate_available_slots_for_services(
  p_workspace_id uuid,
  p_service_ids uuid[],
  p_date date,
  p_booking_interval_override integer
)
returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_timezone text;
  v_booking_interval_minutes integer;
  v_duration integer;
  v_buffer_before integer;
  v_buffer_after integer;
  v_service_count integer;
  v_currency_count integer;
begin
  if p_service_ids is null
     or cardinality(p_service_ids) < 1
     or cardinality(p_service_ids) > 20
     or p_date is null
     or cardinality(p_service_ids) <> cardinality(array(
       select distinct requested.service_id
         from unnest(p_service_ids) as requested(service_id)
     )) then
    return;
  end if;

  select w.timezone, w.booking_interval_minutes
    into v_timezone, v_booking_interval_minutes
    from public.workspaces w
   where w.id = p_workspace_id
     and w.status = 'active';

  with selected_services as (
    select s.*, requested.position
      from unnest(p_service_ids) with ordinality
        as requested(service_id, position)
      join public.services s
        on s.id = requested.service_id
       and s.workspace_id = p_workspace_id
       and s.is_active
       and s.archived_at is null
  )
  select count(*)::integer,
         coalesce(sum(s.duration_minutes), 0)::integer,
         (array_agg(s.buffer_before_minutes order by s.position))[1],
         (array_agg(s.buffer_after_minutes order by s.position))[
           cardinality(p_service_ids)
         ],
         count(distinct s.currency)::integer
    into v_service_count, v_duration, v_buffer_before,
         v_buffer_after, v_currency_count
    from selected_services s;

  if p_booking_interval_override is not null
     and (p_booking_interval_override < 5
       or p_booking_interval_override > 420
       or p_booking_interval_override % 5 <> 0) then
    return;
  end if;

  if v_timezone is null
     or v_service_count <> cardinality(p_service_ids)
     or v_currency_count <> 1
     or v_duration < 1
     or v_duration > 1440 then
    return;
  end if;

  return query
  with active_exceptions as (
    select ae.kind, ae.starts_at, ae.ends_at
      from public.availability_exceptions ae
     where ae.workspace_id = p_workspace_id
       and ae.ends_at > (p_date::timestamp at time zone v_timezone)
       and ae.starts_at < ((p_date + 1)::timestamp at time zone v_timezone)
  ), date_override as (
    select o.override_kind, o.start_local_time, o.end_local_time
      from public.availability_date_overrides o
     where o.workspace_id = p_workspace_id
       and o.work_date = p_date
  ), availability_windows as (
    select
      (p_date + ar.start_local_time) at time zone v_timezone as window_start,
      (p_date + ar.end_local_time) at time zone v_timezone as window_end,
      ar.id as availability_rule_id
      from public.availability_rules ar
     where ar.workspace_id = p_workspace_id
       and ar.day_of_week = extract(isodow from p_date)::smallint
       and ar.is_active
       and p_date >= ar.valid_from
       and (ar.valid_until is null or p_date <= ar.valid_until)
       and not exists (
         select 1 from active_exceptions ae where ae.kind = 'modified'
       )
       and not exists (select 1 from date_override)
    union all
    select
      (p_date + d.start_local_time) at time zone v_timezone,
      (p_date + d.end_local_time) at time zone v_timezone,
      null::uuid
      from date_override d
     where d.override_kind = 'modified'
    union all
    select ae.starts_at, ae.ends_at, null::uuid
      from active_exceptions ae
     where ae.kind = 'modified'
       and not exists (select 1 from date_override)
    union all
    select ae.starts_at, ae.ends_at, null::uuid
      from active_exceptions ae
     where ae.kind = 'extra'
       and not exists (select 1 from date_override)
  ), candidate_slots as (
    select
      gs as occupied_start,
      gs + make_interval(mins => v_buffer_before) as service_start,
      gs + make_interval(mins => v_buffer_before + v_duration)
        as service_end,
      gs + make_interval(
        mins => v_buffer_before + v_duration + v_buffer_after
      ) as occupied_end,
      aw.availability_rule_id
      from availability_windows aw
      cross join lateral generate_series(
        aw.window_start,
        aw.window_end - make_interval(
          mins => v_buffer_before + v_duration + v_buffer_after
        ),
        make_interval(mins => coalesce(
          p_booking_interval_override, v_booking_interval_minutes
        ))
      ) gs
  ), workspace_day_slots as (
    select cs.*
      from candidate_slots cs
     where (cs.occupied_start at time zone v_timezone)::date = p_date
       and (cs.occupied_end at time zone v_timezone)::date = p_date
  )
  select distinct cs.service_start, cs.service_end
    from workspace_day_slots cs
   where not exists (
     select 1 from public.availability_breaks ab
      where ab.availability_rule_id = cs.availability_rule_id
        and tstzrange(
          (p_date + ab.start_local_time) at time zone v_timezone,
          (p_date + ab.end_local_time) at time zone v_timezone,
          '[)'
        ) && tstzrange(cs.occupied_start, cs.occupied_end, '[)')
   )
     and not exists (
       select 1 from public.availability_exceptions ae
        where ae.workspace_id = p_workspace_id
          and ae.kind = 'blocked'
          and tstzrange(ae.starts_at, ae.ends_at, '[)')
            && tstzrange(cs.occupied_start, cs.occupied_end, '[)')
     )
     and not exists (
       select 1 from public.appointments a
        where a.workspace_id = p_workspace_id
          and a.status in ('pending', 'confirmed')
          and a.id is distinct from nullif(
            current_setting('app.reschedule_appointment_id', true), ''
          )::uuid
          and a.occupied_range
            && tstzrange(cs.occupied_start, cs.occupied_end, '[)')
     )
   order by cs.service_start;
end;
$$;

revoke all on function private.calculate_available_slots_for_services(
  uuid, uuid[], date, integer
) from public, anon, authenticated;

-- Locks and returns a movable booking of the caller's workspace.
create function private.lock_reschedulable_appointment(
  p_workspace_id uuid,
  p_appointment_id uuid
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appointment public.appointments%rowtype;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  select * into v_appointment
    from public.appointments a
   where a.id = p_appointment_id
     and a.workspace_id = p_workspace_id
   for update;
  if v_appointment.id is null then
    raise exception 'Appointment not found';
  end if;
  if v_appointment.status not in ('pending', 'confirmed') then
    raise exception 'Only pending or confirmed appointments can be rescheduled';
  end if;
  return v_appointment;
end;
$$;

create function private.appointment_service_ids(p_appointment_id uuid)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select array_agg(aps.service_id order by aps.position)
    from public.appointment_services aps
   where aps.appointment_id = p_appointment_id
     and aps.service_id is not null;
$$;

revoke all on function private.lock_reschedulable_appointment(uuid, uuid)
  from public, anon, authenticated;
revoke all on function private.appointment_service_ids(uuid)
  from public, anon, authenticated;

create function public.get_master_reschedule_slots(
  p_workspace_id uuid,
  p_appointment_id uuid,
  p_date date
)
returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appointment public.appointments%rowtype;
begin
  v_appointment := private.lock_reschedulable_appointment(
    p_workspace_id, p_appointment_id
  );
  perform set_config('app.reschedule_appointment_id', v_appointment.id::text, true);

  return query
  select slots.starts_at, slots.ends_at
    from private.calculate_available_slots_for_services(
      p_workspace_id,
      private.appointment_service_ids(v_appointment.id),
      p_date,
      15
    ) slots;
end;
$$;

create function public.reschedule_master_appointment(
  p_workspace_id uuid,
  p_appointment_id uuid,
  p_starts_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appointment public.appointments%rowtype;
  v_timezone text;
  v_duration interval;
begin
  v_appointment := private.lock_reschedulable_appointment(
    p_workspace_id, p_appointment_id
  );
  v_duration := v_appointment.ends_at - v_appointment.starts_at;

  if p_starts_at is distinct from v_appointment.starts_at then
    select w.timezone into v_timezone
      from public.workspaces w
     where w.id = p_workspace_id;
    perform set_config('app.reschedule_appointment_id', v_appointment.id::text, true);
    if not exists (
      select 1
        from private.calculate_available_slots_for_services(
          p_workspace_id,
          private.appointment_service_ids(v_appointment.id),
          (p_starts_at at time zone v_timezone)::date,
          15
        ) slots
       where slots.starts_at = p_starts_at
    ) then
      raise exception 'Selected time is no longer available';
    end if;

    -- Keep the booked duration snapshot even if the catalog changed later.
    update public.appointments
       set starts_at = p_starts_at,
           ends_at = p_starts_at + v_duration
     where id = v_appointment.id
    returning * into v_appointment;

    insert into public.appointment_events (
      appointment_id, from_status, to_status, event_type, created_by
    )
    values (
      v_appointment.id, v_appointment.status, v_appointment.status,
      'rescheduled', auth.uid()
    );
  end if;

  return jsonb_build_object(
    'id', v_appointment.id,
    'startsAt', v_appointment.starts_at,
    'endsAt', v_appointment.ends_at,
    'status', v_appointment.status
  );
exception
  when exclusion_violation then
    raise exception 'Selected time is no longer available';
end;
$$;

revoke all on function public.get_master_reschedule_slots(uuid, uuid, date)
  from public, anon;
grant execute on function public.get_master_reschedule_slots(uuid, uuid, date)
  to authenticated;
revoke all on function public.reschedule_master_appointment(uuid, uuid, timestamptz)
  from public, anon;
grant execute on function public.reschedule_master_appointment(uuid, uuid, timestamptz)
  to authenticated;
