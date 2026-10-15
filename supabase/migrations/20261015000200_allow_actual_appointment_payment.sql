-- The amount collected can include additional work or a tip and may exceed
-- the service's original price. Keep the numeric column's 10,2 limit.
alter table public.appointments
  drop constraint appointments_paid_amount_within_price,
  add constraint appointments_paid_amount_nonnegative
    check (paid_amount >= 0);

create or replace function public.set_master_appointment_paid_amount(
  p_appointment_id uuid,
  p_paid_amount numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_status public.appointment_status;
begin
  select a.workspace_id, a.status
    into v_workspace_id, v_status
    from public.appointments a
   where a.id = p_appointment_id
   for update;

  if not found then
    raise exception 'Appointment not found' using errcode = 'P0002';
  end if;
  if not public.is_workspace_member(v_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;
  if v_status <> 'completed' then
    raise exception 'Payment can only be recorded for completed appointments';
  end if;
  if p_paid_amount is null
     or p_paid_amount < 0
     or p_paid_amount > 99999999.99
     or p_paid_amount <> round(p_paid_amount, 2) then
    raise exception 'Invalid appointment payment amount';
  end if;

  update public.appointments a
     set paid_amount = p_paid_amount
   where a.id = p_appointment_id;

  return jsonb_build_object('id', p_appointment_id, 'paid_amount', p_paid_amount);
end;
$$;

revoke all on function public.set_master_appointment_paid_amount(uuid, numeric)
  from public, anon;
grant execute on function public.set_master_appointment_paid_amount(uuid, numeric)
  to authenticated;
