-- SCH-83: keep customer action retries safe when the first response is lost.

drop index public.appointment_access_tokens_hash_idx;
create unique index appointment_access_tokens_hash_unique
  on public.appointment_access_tokens (token_hash);

create or replace function public.update_customer_appointment(
  p_token text,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token_id uuid;
  v_appointment_id uuid;
  v_appointment public.appointments%rowtype;
  v_completed_status public.appointment_status;
  v_next_status public.appointment_status;
  v_event_type public.appointment_event_type;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{128}$'
    or p_action is null or p_action not in ('confirm', 'cancel') then
    raise exception 'Invalid appointment link or action';
  end if;

  select t.id, t.appointment_id
    into v_token_id, v_appointment_id
    from public.appointment_access_tokens t
   where t.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
     and t.purpose = 'manage'
     and t.expires_at > now()
     and t.revoked_at is null
   for update;

  if v_token_id is null then
    -- Cancellation revokes a link in the same transaction. If the response
    -- was lost, return the already committed outcome for an identical retry.
    select a.id, a.status
      into v_appointment_id, v_completed_status
      from public.appointment_access_tokens t
      join public.appointments a on a.id = t.appointment_id
     where t.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
       and t.used_at is not null
       and ((p_action = 'confirm' and a.status = 'confirmed')
         or (p_action = 'cancel' and a.status = 'cancelled_by_customer'));

    if v_completed_status is not null then
      return jsonb_build_object('id', v_appointment_id, 'status', v_completed_status);
    end if;

    raise exception 'Appointment link is invalid or expired';
  end if;

  select a.* into v_appointment
    from public.appointments a
   where a.id = v_appointment_id
   for update;

  if p_action = 'confirm' then
    v_next_status := 'confirmed';
    v_event_type := 'confirmed';
    if v_appointment.status not in ('pending', 'confirmed') then
      raise exception 'Appointment can no longer be confirmed';
    end if;
  else
    v_next_status := 'cancelled_by_customer';
    v_event_type := 'cancelled';
    if v_appointment.status not in ('pending', 'confirmed', 'cancelled_by_customer') then
      raise exception 'Appointment can no longer be cancelled';
    end if;
  end if;

  if v_appointment.status <> v_next_status then
    update public.appointments
       set status = v_next_status,
           confirmed_at = case when v_next_status = 'confirmed' then now() else confirmed_at end,
           cancelled_at = case when v_next_status = 'cancelled_by_customer' then now() else cancelled_at end
     where id = v_appointment.id;

    insert into public.appointment_events (
      appointment_id, from_status, to_status, event_type
    ) values (
      v_appointment.id, v_appointment.status, v_next_status, v_event_type
    );
  end if;

  update public.appointment_access_tokens
     set used_at = coalesce(used_at, now())
   where id = v_token_id;

  return jsonb_build_object('id', v_appointment.id, 'status', v_next_status);
end;
$$;
