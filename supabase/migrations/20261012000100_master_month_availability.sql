-- SCH-73: return all real service slots for one calendar month in one request.
-- The existing private calculation remains the single source of availability.
create or replace function public.get_master_month_available_slots(
  p_workspace_id uuid,
  p_service_id uuid,
  p_month_start date
)
returns table (
  available_date date,
  starts_at timestamptz,
  ends_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_first_day date;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  if p_month_start is null then
    return;
  end if;

  v_first_day := date_trunc('month', p_month_start)::date;

  return query
  select days.available_date::date, slots.starts_at, slots.ends_at
    from generate_series(
      v_first_day,
      (v_first_day + interval '1 month - 1 day')::date,
      interval '1 day'
    ) as days(available_date)
    cross join lateral private.calculate_available_slots(
      p_workspace_id,
      p_service_id,
      days.available_date::date
    ) as slots
   order by days.available_date, slots.starts_at;
end;
$$;

revoke all on function public.get_master_month_available_slots(uuid, uuid, date)
  from public, anon;
grant execute on function public.get_master_month_available_slots(uuid, uuid, date)
  to authenticated;
