-- Save weekly schedule patterns for selected weekdays without changing exact-date overrides.
create or replace function public.set_master_weekly_availability(
  p_workspace_id uuid,
  p_rules jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_timezone text;
  v_today date;
  v_item jsonb;
  v_day smallint;
  v_kind text;
  v_start time;
  v_end time;
  v_count integer := 0;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;
  if p_rules is null or jsonb_typeof(p_rules) <> 'array'
     or jsonb_array_length(p_rules) = 0 then
    raise exception 'At least one weekly availability rule is required';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_rules) as rules(value)
     where jsonb_typeof(rules.value) <> 'object'
        or rules.value ->> 'dayOfWeek' !~ '^[1-7]$'
        or rules.value ->> 'kind' not in ('closed', 'modified')
        or (rules.value ->> 'kind' = 'modified'
          and (rules.value ->> 'startLocalTime' is null
            or rules.value ->> 'endLocalTime' is null
            or (rules.value ->> 'startLocalTime')::time >= (rules.value ->> 'endLocalTime')::time))
  ) then
    raise exception 'Weekly availability rule is invalid';
  end if;
  if (select count(distinct (rules.value ->> 'dayOfWeek')::integer)
        from jsonb_array_elements(p_rules) as rules(value)) <> jsonb_array_length(p_rules) then
    raise exception 'Weekly availability rules cannot contain duplicate weekdays';
  end if;

  select w.timezone into strict v_timezone
    from public.workspaces w where w.id = p_workspace_id for update;
  v_today := (now() at time zone v_timezone)::date;

  for v_item in select rules.value from jsonb_array_elements(p_rules) as rules(value)
                 order by (rules.value ->> 'dayOfWeek')::integer
  loop
    v_day := (v_item ->> 'dayOfWeek')::smallint;
    v_kind := v_item ->> 'kind';
    v_start := nullif(v_item ->> 'startLocalTime', '')::time;
    v_end := nullif(v_item ->> 'endLocalTime', '')::time;

    if exists (
      select 1 from public.appointments a
       where a.workspace_id = p_workspace_id
         and a.status in ('pending', 'confirmed')
         and (a.starts_at at time zone v_timezone)::date >= v_today
         and extract(isodow from a.starts_at at time zone v_timezone)::integer = v_day
         and (v_kind = 'closed'
           or (a.starts_at at time zone v_timezone)::time < v_start
           or (a.ends_at at time zone v_timezone)::time > v_end)
    ) then
      raise exception 'Weekly schedule conflicts with an existing appointment on weekday %', v_day;
    end if;

    update public.availability_rules
       set is_active = false
     where workspace_id = p_workspace_id and day_of_week = v_day and is_active;

    if v_kind = 'modified' then
      insert into public.availability_rules (
        workspace_id, day_of_week, start_local_time, end_local_time,
        valid_from, is_active
      ) values (
        p_workspace_id, v_day, v_start, v_end, v_today, true
      );
    end if;
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('updated_weekdays', v_count, 'valid_from', v_today);
end;
$$;

revoke all on function public.set_master_weekly_availability(uuid, jsonb) from public, anon;
grant execute on function public.set_master_weekly_availability(uuid, jsonb) to authenticated;
