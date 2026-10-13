-- SCH-82: expose workspace-scoped customer profiles and visit history to masters.
create or replace function public.list_master_customer_directory(
  p_workspace_id uuid,
  p_search text default null
)
returns table (
  id uuid,
  name text,
  email text,
  phone text,
  notes text,
  completed_visits bigint,
  last_completed_visit_at timestamptz
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
  select c.id,
         c.name,
         c.email,
         c.phone,
         c.notes,
         count(a.id) filter (where a.status = 'completed') as completed_visits,
         max(a.starts_at) filter (where a.status = 'completed') as last_completed_visit_at
    from public.customers c
    left join public.appointments a
      on a.customer_id = c.id
     and a.workspace_id = c.workspace_id
     and a.starts_at <= now()
   where c.workspace_id = p_workspace_id
     and c.anonymized_at is null
     and (
       nullif(trim(coalesce(p_search, '')), '') is null
       or c.name ilike '%' || trim(p_search) || '%'
       or coalesce(c.email, '') ilike '%' || trim(p_search) || '%'
       or coalesce(c.phone, '') ilike '%' || trim(p_search) || '%'
     )
   group by c.id
   order by lower(c.name), c.created_at, c.id;
end;
$$;

revoke all on function public.list_master_customer_directory(uuid, text)
  from public, anon;
grant execute on function public.list_master_customer_directory(uuid, text)
  to authenticated;

create or replace function public.list_master_customer_history(
  p_workspace_id uuid,
  p_customer_id uuid
)
returns table (
  id uuid,
  customer_id uuid,
  customer_name text,
  service_name text,
  duration_minutes integer,
  ends_at timestamptz,
  starts_at timestamptz,
  status public.appointment_status,
  price_amount numeric,
  currency text,
  source public.appointment_source
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.customers c
     where c.id = p_customer_id
       and c.workspace_id = p_workspace_id
       and c.anonymized_at is null
  ) then
    raise exception 'Customer not found' using errcode = 'P0002';
  end if;

  return query
  select a.id,
         a.customer_id,
         c.name,
         a.service_name_snapshot,
         a.duration_minutes_snapshot,
         a.ends_at,
         a.starts_at,
         a.status,
         a.price_amount_snapshot,
         a.currency_snapshot::text,
         a.source
    from public.appointments a
    join public.customers c on c.id = a.customer_id
   where a.workspace_id = p_workspace_id
     and a.customer_id = p_customer_id
   order by a.starts_at desc, a.id
   limit 200;
end;
$$;

revoke all on function public.list_master_customer_history(uuid, uuid)
  from public, anon;
grant execute on function public.list_master_customer_history(uuid, uuid)
  to authenticated;
