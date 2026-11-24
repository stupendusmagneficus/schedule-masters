-- In-app account deletion (audit F-005, App Store guideline 5.1.1(v)).
-- The signed-in user deletes their Auth account. Workspaces where they are the
-- only owner are deleted with all their data through the existing cascades
-- (services, customers, appointments, email outbox, links, requests); in other
-- workspaces only their membership goes away with the Auth user.

create function public.delete_my_account(p_confirmation text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_confirmation is distinct from 'DELETE' then
    raise exception 'Account deletion must be confirmed';
  end if;

  delete from public.workspaces w
   where exists (
       select 1 from public.workspace_members m
        where m.workspace_id = w.id
          and m.user_id = v_user_id
          and m.role = 'owner'
     )
     and not exists (
       select 1 from public.workspace_members other
        where other.workspace_id = w.id
          and other.user_id <> v_user_id
          and other.role = 'owner'
     );

  delete from auth.users where id = v_user_id;
end;
$$;

revoke all on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;
