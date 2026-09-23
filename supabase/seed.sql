insert into public.workspaces (id, name, slug, timezone, locale)
values (
  '00000000-0000-0000-0000-000000000001',
  'Demo Studio',
  'demo-studio',
  'Europe/Prague',
  'cs-CZ'
)
on conflict (id) do nothing;

insert into public.services (
  id,
  workspace_id,
  name,
  description,
  duration_minutes,
  price_amount,
  currency,
  sort_order
)
values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Demo manicure',
  'Local-only seed service',
  60,
  700,
  'CZK',
  1
)
on conflict (id) do nothing;

insert into public.customers (
  id,
  workspace_id,
  name,
  normalized_email
)
values (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Demo Customer',
  'demo@example.test'
)
on conflict (id) do nothing;

insert into public.booking_links (id, workspace_id, slug)
values (
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'demo-studio'
)
on conflict (id) do nothing;

insert into public.availability_rules (
  workspace_id,
  day_of_week,
  start_local_time,
  end_local_time,
  valid_from
)
select
  '00000000-0000-0000-0000-000000000001'::uuid,
  day_of_week,
  '09:00'::time,
  '17:00'::time,
  current_date - 30
from generate_series(1, 5) as day_of_week
on conflict do nothing;
