create or replace function public.get_master_customer_contact(
  p_workspace_id uuid,
  p_customer_id uuid
)
returns table (phone text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  return query
  select c.phone
    from public.customers c
   where c.id = p_customer_id
     and c.workspace_id = p_workspace_id
     and c.anonymized_at is null;

  if not found then
    raise exception 'Customer not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.get_master_customer_contact(uuid, uuid)
  from public, anon;
grant execute on function public.get_master_customer_contact(uuid, uuid)
  to authenticated;
