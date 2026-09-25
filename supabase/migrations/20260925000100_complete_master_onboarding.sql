-- Replace the bootstrap contract with the values collected by the first-run
-- onboarding flow. This is a forward-only migration; earlier migrations are
-- kept unchanged so existing environments can replay the complete history.
drop function public.bootstrap_master_workspace(
  text,
  text,
  text,
  text,
  integer,
  numeric,
  time,
  time
);

create or replace function public.bootstrap_master_workspace(
  p_name text,
  p_slug text,
  p_locale text,
  p_service_name text,
  p_duration_minutes integer,
  p_price_amount numeric,
  p_start_local_time time,
  p_end_local_time time,
  p_working_days smallint[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_slug text := lower(trim(p_slug));
  v_working_days smallint[];
begin
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;

  if trim(p_name) = '' or trim(p_service_name) = '' then
    raise exception 'Workspace and service names are required';
  end if;

  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Booking slug must contain only lowercase letters, numbers, and hyphens';
  end if;

  if p_duration_minutes <= 0 or p_duration_minutes > 1440 or p_price_amount < 0 then
    raise exception 'Service duration and price are invalid';
  end if;

  if p_end_local_time <= p_start_local_time then
    raise exception 'Working day end must be after start';
  end if;

  if p_working_days is null or cardinality(p_working_days) = 0 then
    raise exception 'At least one working day is required';
  end if;

  select array_agg(distinct day_number order by day_number)
    into v_working_days
    from unnest(p_working_days) as days(day_number);

  if exists (
    select 1
      from unnest(v_working_days) as days(day_number)
     where day_number < 1 or day_number > 7
  ) then
    raise exception 'Working days must be between 1 and 7';
  end if;

  -- Transaction-scoped lock makes the owner lookup and workspace creation
  -- atomic for this user while allowing different users to onboard in parallel.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select wm.workspace_id
    into v_workspace_id
    from public.workspace_members wm
   where wm.user_id = v_user_id
     and wm.role = 'owner'
   order by wm.created_at
   limit 1;

  if v_workspace_id is null then
    insert into public.workspaces (name, slug, locale)
    values (trim(p_name), v_slug, coalesce(nullif(trim(p_locale), ''), 'cs-CZ'))
    returning id into v_workspace_id;

    insert into public.workspace_members (workspace_id, user_id, role)
    values (v_workspace_id, v_user_id, 'owner');

    insert into public.booking_links (workspace_id, slug)
    values (v_workspace_id, v_slug);
  end if;

  insert into public.services (
    workspace_id,
    name,
    duration_minutes,
    price_amount,
    currency,
    sort_order
  )
  select v_workspace_id, trim(p_service_name), p_duration_minutes, p_price_amount, 'CZK', 0
  where not exists (
    select 1
      from public.services s
     where s.workspace_id = v_workspace_id
       and s.is_active
  );

  insert into public.availability_rules (
    workspace_id,
    day_of_week,
    start_local_time,
    end_local_time,
    valid_from
  )
  select v_workspace_id, day_number, p_start_local_time, p_end_local_time, current_date
    from unnest(v_working_days) as days(day_number)
   where not exists (
     select 1
       from public.availability_rules ar
      where ar.workspace_id = v_workspace_id
        and ar.is_active
   );

  return jsonb_build_object(
    'workspace_id', v_workspace_id,
    'slug', (select bl.slug from public.booking_links bl where bl.workspace_id = v_workspace_id limit 1)
  );
end;
$$;

revoke all on function public.bootstrap_master_workspace(
  text,
  text,
  text,
  text,
  integer,
  numeric,
  time,
  time,
  smallint[]
) from public;
grant execute on function public.bootstrap_master_workspace(
  text,
  text,
  text,
  text,
  integer,
  numeric,
  time,
  time,
  smallint[]
) to authenticated;
