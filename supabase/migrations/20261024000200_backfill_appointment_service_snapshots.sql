-- SCH-125 data backfill: preserve each existing appointment as its first item.
insert into public.appointment_services (
  appointment_id, workspace_id, position, service_id,
  service_name_snapshot, duration_minutes_snapshot, price_amount_snapshot,
  currency_snapshot, buffer_before_minutes_snapshot,
  buffer_after_minutes_snapshot
)
select
  a.id, a.workspace_id, 1, a.service_id, a.service_name_snapshot,
  a.duration_minutes_snapshot, a.price_amount_snapshot, a.currency_snapshot,
  a.buffer_before_minutes_snapshot, a.buffer_after_minutes_snapshot
from public.appointments a;
