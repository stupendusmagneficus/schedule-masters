-- SCH-96: expose only actionable public booking requests to workspace members.
create or replace function public.list_master_pending_booking_requests(
  p_workspace_id uuid
)
returns table (
  id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  service_name text,
  duration_minutes integer,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.appointment_status,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  return query
  select a.id,
         c.name,
         c.email,
         c.phone,
         a.service_name_snapshot,
         a.duration_minutes_snapshot,
         a.starts_at,
         a.ends_at,
         a.status,
         a.created_at
    from public.appointments a
    join public.customers c
      on c.id = a.customer_id
     and c.workspace_id = a.workspace_id
   where a.workspace_id = p_workspace_id
     and a.source = 'public_booking'
     and a.status = 'pending'
   order by a.starts_at, a.created_at, a.id;
end;
$$;

revoke all on function public.list_master_pending_booking_requests(uuid)
  from public, anon;
grant execute on function public.list_master_pending_booking_requests(uuid)
  to authenticated;
