-- SCH-83 security hardening: authorize before taking an appointment row lock.

create or replace function public.create_customer_appointment_link(
  p_appointment_id uuid,
  p_customer_consent_confirmed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_appointment public.appointments%rowtype;
  v_token text := replace(gen_random_uuid()::text, '-', '')
    || replace(gen_random_uuid()::text, '-', '')
    || replace(gen_random_uuid()::text, '-', '')
    || replace(gen_random_uuid()::text, '-', '');
  v_expires_at timestamptz;
begin
  select a.workspace_id into v_workspace_id
    from public.appointments a
   where a.id = p_appointment_id;

  if v_workspace_id is null or not public.is_workspace_member(v_workspace_id) then
    raise exception 'Appointment access denied' using errcode = '42501';
  end if;

  select a.* into v_appointment
    from public.appointments a
   where a.id = p_appointment_id
     and a.workspace_id = v_workspace_id
   for update;

  if v_appointment.id is null
    or not public.is_workspace_member(v_appointment.workspace_id) then
    raise exception 'Appointment access denied' using errcode = '42501';
  end if;

  if v_appointment.status not in ('pending', 'confirmed') then
    raise exception 'Appointment is no longer active';
  end if;

  if p_customer_consent_confirmed is distinct from true then
    raise exception 'Customer notification consent is required';
  end if;

  update public.appointments
     set customer_notification_consent_at = coalesce(customer_notification_consent_at, now())
   where id = v_appointment.id;

  update public.appointment_access_tokens
     set revoked_at = now()
   where appointment_id = v_appointment.id
     and purpose = 'manage'
     and revoked_at is null;

  delete from public.appointment_access_tokens t
   where (t.expires_at < now() - interval '90 days'
      or t.revoked_at < now() - interval '90 days')
     and exists (
       select 1 from public.appointments a
        where a.id = t.appointment_id
          and a.workspace_id = v_appointment.workspace_id
     );

  v_expires_at := least(
    greatest(now() + interval '7 days', v_appointment.starts_at + interval '7 days'),
    now() + interval '180 days'
  );

  insert into public.appointment_access_tokens (
    appointment_id, token_hash, purpose, expires_at
  ) values (
    v_appointment.id,
    encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
    'manage',
    v_expires_at
  );

  insert into public.appointment_notification_events (
    workspace_id, appointment_id, channel, type, status
  ) values (
    v_appointment.workspace_id, v_appointment.id, 'manual_share',
    'confirmation', 'manual_required'
  );

  return jsonb_build_object('token', v_token, 'expiresAt', v_expires_at);
end;
$$;
