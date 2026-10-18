create function public.list_master_appointment_series_future(
  p_workspace_id uuid,
  p_appointment_id uuid
)
returns table (
  id uuid,
  service_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.appointment_status
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_series_id uuid;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  select appointment.appointment_series_id into v_series_id
    from public.appointments appointment
   where appointment.id = p_appointment_id
     and appointment.workspace_id = p_workspace_id;

  if not found or v_series_id is null then
    raise exception 'Appointment series not found' using errcode = 'P0002';
  end if;

  return query
  select appointment.id,
         appointment.service_name_snapshot,
         appointment.starts_at,
         appointment.ends_at,
         appointment.status
    from public.appointments appointment
   where appointment.workspace_id = p_workspace_id
     and appointment.appointment_series_id = v_series_id
     and appointment.starts_at >= now()
     and appointment.status in ('pending', 'confirmed')
   order by appointment.starts_at, appointment.id;
end;
$$;

revoke all on function public.list_master_appointment_series_future(uuid, uuid)
  from public, anon;
grant execute on function public.list_master_appointment_series_future(uuid, uuid)
  to authenticated;
