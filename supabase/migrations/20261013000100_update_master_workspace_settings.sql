create or replace function public.update_master_workspace_settings(
  p_workspace_id uuid,
  p_name text,
  p_slug text,
  p_working_days smallint[],
  p_start_local_time time,
  p_end_local_time time
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_timezone text;
  v_today date;
  v_slug text := lower(btrim(p_slug));
  v_days smallint[];
begin
  if v_user_id is null then
    raise exception using message = 'Authentication is required';
  end if;

  if p_name is null or length(btrim(p_name)) not between 1 and 120 then
    raise exception using message = 'Workspace name must contain 1 to 120 characters';
  end if;

  if v_slug is null or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception using message = 'Booking slug is invalid';
  end if;

  if p_start_local_time is null or p_end_local_time is null
     or p_end_local_time <= p_start_local_time then
    raise exception using message = 'Working hours are invalid';
  end if;

  if p_working_days is null or cardinality(p_working_days) = 0 then
    raise exception using message = 'At least one working day is required';
  end if;

  select array_agg(distinct day_number order by day_number)
    into v_days
    from unnest(p_working_days) as days(day_number);

  if exists (
    select 1 from unnest(v_days) as days(day_number)
     where day_number is null or day_number < 1 or day_number > 7
  ) then
    raise exception using message = 'Working days must be between 1 and 7';
  end if;

  select w.timezone
    into v_workspace_timezone
    from public.workspaces w
   where w.id = p_workspace_id
   for update;

  if not found then
    raise exception using message = 'Workspace access denied';
  end if;

  if not exists (
    select 1
      from public.workspace_members wm
     where wm.workspace_id = p_workspace_id
       and wm.user_id = v_user_id
       and wm.role = 'owner'
  ) then
    raise exception using message = 'Workspace access denied';
  end if;

  v_today := (now() at time zone v_workspace_timezone)::date;

  if exists (
    select 1
      from public.workspaces w
     where w.slug = v_slug and w.id <> p_workspace_id
  ) or exists (
    select 1
      from public.booking_links bl
     where bl.slug = v_slug and bl.workspace_id <> p_workspace_id
  ) then
    raise exception using message = 'Booking slug is already taken';
  end if;

  -- This editor models one weekly interval per day. Keep date-scoped rules,
  -- split shifts, and their breaks intact by rejecting those schedules.
  if exists (
    select 1
      from public.availability_rules ar
     where ar.workspace_id = p_workspace_id
       and ar.is_active
       and (ar.valid_until is not null or ar.valid_from > v_today)
  ) or exists (
    select 1
      from public.availability_rules ar
      join public.availability_breaks ab
        on ab.availability_rule_id = ar.id
     where ar.workspace_id = p_workspace_id
       and ar.is_active
  ) or exists (
    select ar.day_of_week
      from public.availability_rules ar
     where ar.workspace_id = p_workspace_id
       and ar.is_active
     group by ar.day_of_week
    having count(*) > 1
  ) or exists (
    select ar.workspace_id
      from public.availability_rules ar
     where ar.workspace_id = p_workspace_id
       and ar.is_active
     group by ar.workspace_id
    having count(distinct (ar.start_local_time, ar.end_local_time)) > 1
  ) then
    raise exception using message = 'Advanced schedule cannot be edited here';
  end if;

  if not exists (
    select 1 from public.booking_links bl
     where bl.workspace_id = p_workspace_id
  ) then
    raise exception using message = 'Workspace booking link is missing';
  end if;

  update public.workspaces
     set name = btrim(p_name), slug = v_slug
   where id = p_workspace_id;

  update public.booking_links
     set slug = v_slug
   where workspace_id = p_workspace_id;

  -- Retain old rows for audit/history; new recurring rules take effect today.
  update public.availability_rules
     set is_active = false
   where workspace_id = p_workspace_id
     and is_active;

  insert into public.availability_rules (
    workspace_id,
    day_of_week,
    start_local_time,
    end_local_time,
    valid_from
  )
  select p_workspace_id, day_number, p_start_local_time, p_end_local_time, v_today
    from unnest(v_days) as days(day_number);

  return jsonb_build_object(
    'workspace_id', p_workspace_id,
    'name', btrim(p_name),
    'slug', v_slug,
    'working_days', v_days
  );
end;
$$;

revoke all on function public.update_master_workspace_settings(
  uuid, text, text, smallint[], time, time
) from public;
grant execute on function public.update_master_workspace_settings(
  uuid, text, text, smallint[], time, time
) to authenticated;
