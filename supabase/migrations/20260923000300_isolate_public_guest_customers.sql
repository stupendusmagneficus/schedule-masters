-- SCH-60: never merge or update an existing customer from anonymous booking data.
-- Each non-idempotent public booking receives its own guest customer identity.

drop function public.create_public_booking(
  text, uuid, text, text, text, timestamptz, text, text
);

create or replace function public.create_public_booking(
  p_slug text,
  p_service_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_starts_at timestamptz,
  p_customer_note text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_timezone text;
  v_service public.services%rowtype;
  v_customer_id uuid;
  v_appointment public.appointments%rowtype;
  v_request_key text := nullif(trim(p_idempotency_key), '');
  v_existing_response jsonb;
  v_email text := nullif(lower(trim(p_email)), '');
  v_phone text := nullif(trim(p_phone), '');
begin
  if nullif(trim(p_name), '') is null then
    raise exception 'Customer name is required';
  end if;

  if length(trim(p_name)) > 200
    or length(coalesce(p_email, '')) > 320
    or length(coalesce(p_phone, '')) > 50
    or length(coalesce(p_customer_note, '')) > 1000
    or length(coalesce(p_idempotency_key, '')) > 100 then
    raise exception 'Booking input is too long';
  end if;

  if v_request_key is null then
    raise exception 'Idempotency key is required';
  end if;

  select bl.workspace_id, w.timezone
  into v_workspace_id, v_timezone
  from public.booking_links bl
  join public.workspaces w on w.id = bl.workspace_id
  where bl.slug = lower(trim(p_slug))
    and bl.is_active = true
    and w.status = 'active';

  select * into v_service
  from public.services s
  where s.id = p_service_id
    and s.workspace_id = v_workspace_id
    and s.is_active = true
    and s.archived_at is null;

  if v_workspace_id is null or v_service.id is null then
    raise exception 'Booking link or service is not available';
  end if;

  insert into public.public_booking_requests (workspace_id, idempotency_key)
  values (v_workspace_id, v_request_key)
  on conflict (workspace_id, idempotency_key) do nothing;

  select response into v_existing_response
  from public.public_booking_requests
  where workspace_id = v_workspace_id
    and idempotency_key = v_request_key
  for update;

  if v_existing_response is not null then
    return v_existing_response;
  end if;

  if not exists (
    select 1
    from public.get_public_available_slots(
      p_slug,
      p_service_id,
      (p_starts_at at time zone v_timezone)::date
    ) slot
    where slot.starts_at = p_starts_at
  ) then
    raise exception 'Selected time is no longer available';
  end if;

  -- Anonymous contact data is never sufficient proof of ownership of an
  -- existing customer profile. Always create a guest identity for a new
  -- idempotent request; the master can merge records through an authenticated
  -- workflow later.
  insert into public.customers (
    workspace_id, name, email, phone, normalized_email, normalized_phone
  )
  values (
    v_workspace_id, trim(p_name), v_email, v_phone, v_email, v_phone
  )
  returning id into v_customer_id;

  insert into public.appointments (
    workspace_id, customer_id, service_id, service_name_snapshot,
    duration_minutes_snapshot, price_amount_snapshot, currency_snapshot,
    buffer_before_minutes_snapshot, buffer_after_minutes_snapshot,
    starts_at, ends_at, status, source, customer_note
  )
  values (
    v_workspace_id, v_customer_id, v_service.id, v_service.name,
    v_service.duration_minutes, v_service.price_amount, v_service.currency,
    v_service.buffer_before_minutes, v_service.buffer_after_minutes,
    p_starts_at,
    p_starts_at + make_interval(mins => v_service.duration_minutes),
    'pending', 'public_booking', nullif(trim(p_customer_note), '')
  )
  returning * into v_appointment;

  insert into public.appointment_events (
    appointment_id, to_status, event_type
  )
  values (v_appointment.id, 'pending', 'created');

  v_existing_response := jsonb_build_object(
    'id', v_appointment.id,
    'startsAt', v_appointment.starts_at,
    'endsAt', v_appointment.ends_at,
    'serviceName', v_appointment.service_name_snapshot,
    'status', v_appointment.status
  );

  update public.public_booking_requests
  set response = v_existing_response
  where workspace_id = v_workspace_id
    and idempotency_key = v_request_key;

  return v_existing_response;
exception
  when exclusion_violation then
    raise exception 'Selected time is no longer available';
end;
$$;

revoke all on function public.create_public_booking(
  text, uuid, text, text, text, timestamptz, text, text
) from public;

grant execute on function public.create_public_booking(
  text, uuid, text, text, text, timestamptz, text, text
) to anon, authenticated;
