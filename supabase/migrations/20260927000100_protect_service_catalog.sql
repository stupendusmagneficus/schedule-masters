-- SCH-80: keep service history immutable and limit catalog mutations to managers.

drop policy if exists services_member_access on public.services;

alter table public.services
  add constraint services_name_length_check
    check (length(btrim(name)) between 1 and 120),
  add constraint services_description_length_check
    check (description is null or length(description) <= 1000),
  add constraint services_duration_range_check
    check (duration_minutes between 1 and 1440),
  add constraint services_buffer_before_range_check
    check (buffer_before_minutes between 0 and 240),
  add constraint services_buffer_after_range_check
    check (buffer_after_minutes between 0 and 240),
  add constraint services_price_range_check
    check (price_amount between 0 and 1000000),
  add constraint services_currency_format_check
    check (btrim(currency) ~ '^[A-Z]{3}$'),
  add constraint services_sort_order_range_check
    check (sort_order between 0 and 100000);

create policy services_member_select on public.services
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy services_manager_insert on public.services
  for insert to authenticated
  with check (
    exists (
      select 1
        from public.workspace_members wm
       where wm.workspace_id = services.workspace_id
         and wm.user_id = (select auth.uid())
         and wm.role in ('owner', 'admin')
    )
  );

create policy services_manager_update on public.services
  for update to authenticated
  using (
    exists (
      select 1
        from public.workspace_members wm
       where wm.workspace_id = services.workspace_id
         and wm.user_id = (select auth.uid())
         and wm.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1
        from public.workspace_members wm
       where wm.workspace_id = services.workspace_id
         and wm.user_id = (select auth.uid())
         and wm.role in ('owner', 'admin')
    )
  );

create or replace function public.prevent_service_workspace_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.workspace_id <> old.workspace_id then
    raise exception 'Service workspace cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists services_prevent_workspace_change on public.services;

create trigger services_prevent_workspace_change
  before update on public.services
  for each row execute function public.prevent_service_workspace_change();

-- There is intentionally no DELETE policy. Services are archived instead so
-- historical appointment snapshots and reporting remain stable.
