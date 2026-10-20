-- SCH-158: profile preferences must never rewrite a master's availability.
-- The existing calendar commands own weekly rules, date overrides and pauses.
create function public.update_master_workspace_preferences(
  p_workspace_id uuid,
  p_name text,
  p_slug text,
  p_booking_interval_minutes integer,
  p_notice_minutes integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slug text := lower(btrim(p_slug));
begin
  -- Reuse the owner/auth and notice validation, and hold the workspace row lock
  -- for the whole atomic operation. Any subsequent error rolls this update back.
  perform public.update_master_public_booking_notice(p_workspace_id, p_notice_minutes);

  if p_name is null or length(btrim(p_name)) not between 1 and 120 then
    raise exception using message = 'Workspace name must contain 1 to 120 characters';
  end if;
  if v_slug is null or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception using message = 'Booking slug is invalid';
  end if;
  if p_booking_interval_minutes is null or p_booking_interval_minutes < 5
     or p_booking_interval_minutes > 420 or p_booking_interval_minutes % 5 <> 0 then
    raise exception using message = 'Booking interval must be between 5 and 420 minutes in 5-minute increments';
  end if;

  if not exists (select 1 from public.booking_links where workspace_id = p_workspace_id) then
    raise exception using message = 'Workspace booking link is missing';
  end if;
  if exists (select 1 from public.workspaces where slug = v_slug and id <> p_workspace_id)
     or exists (select 1 from public.booking_links where slug = v_slug and workspace_id <> p_workspace_id) then
    raise exception using message = 'Booking slug is already taken';
  end if;

  update public.workspaces
     set name = btrim(p_name), slug = v_slug,
         booking_interval_minutes = p_booking_interval_minutes
   where id = p_workspace_id;
  update public.booking_links set slug = v_slug where workspace_id = p_workspace_id;

  return jsonb_build_object(
    'workspace_id', p_workspace_id, 'name', btrim(p_name), 'slug', v_slug,
    'booking_interval_minutes', p_booking_interval_minutes,
    'public_booking_min_notice_minutes', p_notice_minutes
  );
exception
  -- Unique indexes also protect concurrent attempts to claim the same slug.
  when unique_violation then
    raise exception using message = 'Booking slug is already taken';
end;
$$;

revoke all on function public.update_master_workspace_preferences(uuid, text, text, integer, integer)
  from public, anon;
grant execute on function public.update_master_workspace_preferences(uuid, text, text, integer, integer)
  to authenticated;

notify pgrst, 'reload schema';
