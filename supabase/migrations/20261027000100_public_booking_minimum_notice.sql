alter table public.workspaces
  add column public_booking_min_notice_minutes integer not null default 0
  check (
    public_booking_min_notice_minutes between 0 and 10080
    and public_booking_min_notice_minutes % 15 = 0
  );

create function public.update_master_public_booking_notice(
  p_workspace_id uuid,
  p_notice_minutes integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using message = 'Authentication is required';
  end if;

  if p_notice_minutes is null
     or p_notice_minutes < 0
     or p_notice_minutes > 10080
     or p_notice_minutes % 15 <> 0 then
    raise exception using message = 'Booking notice must be between 0 and 10080 minutes in 15-minute increments';
  end if;

  update public.workspaces w
     set public_booking_min_notice_minutes = p_notice_minutes
   where w.id = p_workspace_id
     and exists (
       select 1 from public.workspace_members wm
        where wm.workspace_id = w.id
          and wm.user_id = v_user_id
          and wm.role = 'owner'
     );

  if not found then
    raise exception using message = 'Workspace access denied';
  end if;

  return p_notice_minutes;
end;
$$;

revoke all on function public.update_master_public_booking_notice(uuid, integer)
  from public, anon;
grant execute on function public.update_master_public_booking_notice(uuid, integer)
  to authenticated;

create function public.update_master_workspace_settings_with_booking_notice(
  p_workspace_id uuid,
  p_name text,
  p_slug text,
  p_working_days smallint[],
  p_start_local_time time,
  p_end_local_time time,
  p_booking_interval_minutes integer,
  p_notice_minutes integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings jsonb;
begin
  v_settings := public.update_master_workspace_settings(
    p_workspace_id,
    p_name,
    p_slug,
    p_working_days,
    p_start_local_time,
    p_end_local_time,
    p_booking_interval_minutes
  );
  perform public.update_master_public_booking_notice(
    p_workspace_id, p_notice_minutes
  );
  return v_settings || jsonb_build_object(
    'public_booking_min_notice_minutes', p_notice_minutes
  );
end;
$$;

revoke all on function public.update_master_workspace_settings_with_booking_notice(
  uuid, text, text, smallint[], time, time, integer, integer
) from public, anon;
grant execute on function public.update_master_workspace_settings_with_booking_notice(
  uuid, text, text, smallint[], time, time, integer, integer
) to authenticated;

create or replace function public.get_public_available_slots(
  p_slug text,
  p_service_id uuid,
  p_date date
)
returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_workspace_id uuid;
  v_notice_minutes integer;
begin
  select bl.workspace_id, w.public_booking_min_notice_minutes
    into v_workspace_id, v_notice_minutes
    from public.booking_links bl
    join public.workspaces w on w.id = bl.workspace_id
   where bl.slug = lower(trim(p_slug))
     and bl.is_active
     and w.status = 'active';

  if v_workspace_id is null then
    return;
  end if;

  return query
  select slots.starts_at, slots.ends_at
    from private.calculate_available_slots(
      v_workspace_id, p_service_id, p_date
    ) slots
   where slots.starts_at > now() + make_interval(mins => v_notice_minutes);
end;
$$;

create or replace function public.get_public_available_slots_for_services(
  p_slug text,
  p_service_ids uuid[],
  p_date date
)
returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_workspace_id uuid;
  v_notice_minutes integer;
begin
  select bl.workspace_id, w.public_booking_min_notice_minutes
    into v_workspace_id, v_notice_minutes
    from public.booking_links bl
    join public.workspaces w on w.id = bl.workspace_id
   where bl.slug = lower(trim(p_slug))
     and bl.is_active
     and w.status = 'active';

  if v_workspace_id is null then
    return;
  end if;

  return query
  select slots.starts_at, slots.ends_at
    from private.calculate_available_slots_for_services(
      v_workspace_id, p_service_ids, p_date
    ) slots
   where slots.starts_at > now() + make_interval(mins => v_notice_minutes);
end;
$$;

revoke all on function public.get_public_available_slots(text, uuid, date)
  from public;
grant execute on function public.get_public_available_slots(text, uuid, date)
  to anon, authenticated;

revoke all on function public.get_public_available_slots_for_services(
  text, uuid[], date
) from public;
grant execute on function public.get_public_available_slots_for_services(
  text, uuid[], date
) to anon, authenticated;
