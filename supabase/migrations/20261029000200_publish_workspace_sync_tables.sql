-- Publish workspace-owned data used by the mobile cross-screen sync channel.
-- FULL replica identity keeps workspace filters available for delete events.
do $$
declare
  v_table text;
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    return;
  end if;

  foreach v_table in array array[
    'appointments',
    'availability_breaks',
    'availability_date_overrides',
    'availability_exceptions',
    'availability_rules',
    'customers',
    'services'
  ] loop
    execute format('alter table public.%I replica identity full', v_table);
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = v_table
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        v_table
      );
    end if;
  end loop;
end;
$$;
