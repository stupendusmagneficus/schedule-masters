-- Hide erased customers from the booking picker and refresh selected profiles by ID.
create or replace function public.list_master_customers(p_workspace_id uuid, p_search text default null)
returns table (id uuid, name text, email text, phone text)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;
  return query
  select distinct on (coalesce(nullif(c.normalized_email, ''), nullif(c.normalized_phone, ''), c.id::text))
         c.id, c.name, c.email, c.phone
    from public.customers c
   where c.workspace_id = p_workspace_id and c.anonymized_at is null
     and (nullif(trim(coalesce(p_search, '')), '') is null
       or c.name ilike '%' || trim(p_search) || '%'
       or coalesce(c.email, '') ilike '%' || trim(p_search) || '%'
       or coalesce(c.phone, '') ilike '%' || trim(p_search) || '%')
   order by coalesce(nullif(c.normalized_email, ''), nullif(c.normalized_phone, ''), c.id::text), c.created_at, c.id;
end;
$$;

create function public.get_master_customer_profile(p_workspace_id uuid, p_customer_id uuid)
returns table (id uuid, name text, email text, phone text, notes text, completed_visits bigint, last_completed_visit_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;
  return query
  select c.id, c.name, c.email, c.phone, c.notes,
         count(a.id) filter (where a.status = 'completed'),
         max(a.starts_at) filter (where a.status = 'completed')
    from public.customers c
    left join public.appointments a on a.customer_id = c.id and a.workspace_id = c.workspace_id and a.starts_at <= now()
   where c.id = p_customer_id and c.workspace_id = p_workspace_id and c.anonymized_at is null
   group by c.id;
end;
$$;
revoke all on function public.get_master_customer_profile(uuid, uuid) from public, anon;
grant execute on function public.get_master_customer_profile(uuid, uuid) to authenticated;
