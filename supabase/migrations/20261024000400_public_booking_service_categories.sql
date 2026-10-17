create or replace function public.get_public_booking_context(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_workspace_id uuid;
  v_workspace_name text;
  v_timezone text;
  v_slug text;
begin
  select w.id, w.name, w.timezone, bl.slug
    into v_workspace_id, v_workspace_name, v_timezone, v_slug
    from public.booking_links bl
    join public.workspaces w on w.id = bl.workspace_id
   where bl.slug = lower(trim(p_slug))
     and bl.is_active = true
     and w.status = 'active';

  if v_workspace_id is null then
    return null;
  end if;

  return jsonb_build_object(
    'workspace', jsonb_build_object(
      'id', v_workspace_id,
      'name', v_workspace_name,
      'timezone', v_timezone,
      'slug', v_slug
    ),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'description', s.description,
        'category', s.category,
        'durationMinutes', s.duration_minutes,
        'priceAmount', s.price_amount,
        'currency', s.currency
      ) order by s.sort_order, s.name)
        from public.services s
       where s.workspace_id = v_workspace_id
         and s.is_active = true
         and s.archived_at is null
    ), '[]'::jsonb)
  );
end;
$$;
