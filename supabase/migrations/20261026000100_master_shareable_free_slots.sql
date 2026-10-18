create function public.list_master_shareable_free_slots(
  p_workspace_id uuid,
  p_from_date date,
  p_to_date date
)
returns table (
  available_date date,
  starts_at timestamptz,
  ends_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  if p_from_date is null
     or p_to_date is null
     or p_to_date < p_from_date
     or p_to_date - p_from_date > 13 then
    raise exception 'Date range must contain at most 14 days'
      using errcode = '22023';
  end if;

  return query
  select days.work_date::date, slots.starts_at, min(slots.ends_at)
    from generate_series(
      p_from_date::timestamp,
      p_to_date::timestamp,
      interval '1 day'
    )
      as days(work_date)
    cross join lateral (
      select service_slots.starts_at, service_slots.ends_at
        from public.services service
        cross join lateral private.calculate_available_slots_for_services(
          p_workspace_id, array[service.id], days.work_date::date
        ) service_slots
       where service.workspace_id = p_workspace_id
         and service.is_active
         and service.archived_at is null
    ) slots
   group by days.work_date, slots.starts_at
   order by days.work_date, slots.starts_at;
end;
$$;

revoke all on function public.list_master_shareable_free_slots(
  uuid, date, date
) from public, anon;
grant execute on function public.list_master_shareable_free_slots(
  uuid, date, date
) to authenticated;
