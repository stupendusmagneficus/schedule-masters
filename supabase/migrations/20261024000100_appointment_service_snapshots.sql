-- SCH-125: represent a sequential multi-service visit as one appointment with
-- ordered, immutable service snapshots. Existing appointment columns remain
-- aggregate fields so older readers continue to work.

create table public.appointment_services (
  appointment_id uuid not null,
  workspace_id uuid not null,
  position integer not null check (position > 0),
  service_id uuid references public.services(id) on delete set null,
  service_name_snapshot text not null,
  duration_minutes_snapshot integer not null
    check (duration_minutes_snapshot > 0),
  price_amount_snapshot numeric(10, 2) not null
    check (price_amount_snapshot >= 0),
  currency_snapshot char(3) not null,
  buffer_before_minutes_snapshot integer not null default 0
    check (buffer_before_minutes_snapshot >= 0),
  buffer_after_minutes_snapshot integer not null default 0
    check (buffer_after_minutes_snapshot >= 0),
  created_at timestamptz not null default now(),
  primary key (appointment_id, position),
  foreign key (appointment_id, workspace_id)
    references public.appointments(id, workspace_id) on delete cascade
);

create index appointment_services_workspace_service_idx
  on public.appointment_services (workspace_id, service_id)
  where service_id is not null;

alter table public.appointment_services enable row level security;
revoke all on public.appointment_services from public, anon, authenticated;

create or replace function public.create_legacy_appointment_service_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.appointment_services (
    appointment_id, workspace_id, position, service_id,
    service_name_snapshot, duration_minutes_snapshot, price_amount_snapshot,
    currency_snapshot, buffer_before_minutes_snapshot,
    buffer_after_minutes_snapshot
  )
  values (
    new.id, new.workspace_id, 1, new.service_id,
    new.service_name_snapshot, new.duration_minutes_snapshot,
    new.price_amount_snapshot, new.currency_snapshot,
    new.buffer_before_minutes_snapshot, new.buffer_after_minutes_snapshot
  );
  return new;
end;
$$;

revoke all on function public.create_legacy_appointment_service_snapshot()
  from public, anon, authenticated;

create trigger appointments_create_service_snapshot
  after insert on public.appointments
  for each row execute function public.create_legacy_appointment_service_snapshot();
