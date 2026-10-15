alter table public.services
  add column category text;

create index appointments_workspace_customer_start_idx
  on public.appointments (workspace_id, customer_id, starts_at);
