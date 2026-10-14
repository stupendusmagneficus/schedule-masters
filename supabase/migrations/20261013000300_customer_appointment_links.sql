-- SCH-83: issue revocable, time-limited customer access links and record
-- notification handoff state without storing recipient details in the log.

create type public.notification_delivery_status as enum (
  'manual_required',
  'share_sheet_opened',
  'share_sheet_failed'
);

alter table public.appointments
  add column customer_notification_consent_at timestamptz,
  add constraint appointments_id_workspace_unique unique (id, workspace_id);

create table public.appointment_notification_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  appointment_id uuid not null,
  channel text not null default 'manual_share'
    check (channel = 'manual_share'),
  type public.notification_type not null,
  status public.notification_delivery_status not null,
  error_code text check (error_code is null or error_code in ('share_unavailable')),
  created_at timestamptz not null default now(),
  constraint appointment_notification_events_appointment_workspace_fkey
    foreign key (appointment_id, workspace_id)
    references public.appointments(id, workspace_id) on delete cascade
);

create index appointment_notification_events_appointment_created_idx
  on public.appointment_notification_events (appointment_id, created_at desc);

alter table public.appointment_notification_events enable row level security;

create policy appointment_notification_events_member_select
  on public.appointment_notification_events
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

revoke all on public.appointment_notification_events from public, anon, authenticated;
grant select on public.appointment_notification_events to authenticated;

create or replace function public.revoke_stale_appointment_access_tokens()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.starts_at is distinct from old.starts_at
    or new.status in ('cancelled_by_customer', 'cancelled_by_master', 'completed', 'no_show') then
    update public.appointment_access_tokens
       set revoked_at = coalesce(revoked_at, now())
     where appointment_id = new.id
       and purpose = 'manage'
       and revoked_at is null;
  end if;
  return new;
end;
$$;

create trigger appointments_revoke_stale_access_tokens
  after update of starts_at, status on public.appointments
  for each row execute function public.revoke_stale_appointment_access_tokens();

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
  v_appointment public.appointments%rowtype;
  v_token text := replace(gen_random_uuid()::text, '-', '')
    || replace(gen_random_uuid()::text, '-', '')
    || replace(gen_random_uuid()::text, '-', '')
    || replace(gen_random_uuid()::text, '-', '');
  v_expires_at timestamptz;
begin
  select a.* into v_appointment
    from public.appointments a
   where a.id = p_appointment_id
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

  -- Retain expired/revoked link hashes for 90 days for abuse investigation,
  -- then remove them the next time a link is issued for this workspace flow.
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

create or replace function public.record_customer_link_share(
  p_appointment_id uuid,
  p_status public.notification_delivery_status,
  p_error_code text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  if p_status is null or p_status not in ('share_sheet_opened', 'share_sheet_failed')
    or (p_status = 'share_sheet_failed' and p_error_code is distinct from 'share_unavailable')
    or (p_status = 'share_sheet_opened' and p_error_code is not null) then
    raise exception 'Invalid share status';
  end if;

  select a.workspace_id into v_workspace_id
    from public.appointments a
   where a.id = p_appointment_id
     and a.customer_notification_consent_at is not null
     and a.status in ('pending', 'confirmed');

  if v_workspace_id is null or not public.is_workspace_member(v_workspace_id) then
    raise exception 'Appointment access denied' using errcode = '42501';
  end if;

  insert into public.appointment_notification_events (
    workspace_id, appointment_id, channel, type, status, error_code
  ) values (
    v_workspace_id, p_appointment_id, 'manual_share', 'confirmation',
    p_status, p_error_code
  );
end;
$$;

create or replace function public.get_customer_appointment(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appointment public.appointments%rowtype;
  v_workspace_name text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{128}$' then
    return null;
  end if;

  select a.*
    into v_appointment
    from public.appointment_access_tokens t
    join public.appointments a on a.id = t.appointment_id
   where t.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
     and t.purpose = 'manage'
     and t.expires_at > now()
     and t.revoked_at is null;

  if v_appointment.id is null then
    return null;
  end if;

  select w.name into v_workspace_name
    from public.workspaces w
   where w.id = v_appointment.workspace_id;

  return jsonb_build_object(
    'appointmentId', v_appointment.id,
    'serviceName', v_appointment.service_name_snapshot,
    'startsAt', v_appointment.starts_at,
    'endsAt', v_appointment.ends_at,
    'status', v_appointment.status,
    'workspaceName', v_workspace_name,
    'timezone', (select w.timezone from public.workspaces w where w.id = v_appointment.workspace_id),
    'canConfirm', v_appointment.status = 'pending',
    'canCancel', v_appointment.status in ('pending', 'confirmed')
  );
end;
$$;

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

revoke all on function public.create_customer_appointment_link(uuid, boolean)
  from public, anon;
grant execute on function public.create_customer_appointment_link(uuid, boolean)
  to authenticated;

revoke all on function public.record_customer_link_share(
  uuid, public.notification_delivery_status, text
) from public, anon;
grant execute on function public.record_customer_link_share(
  uuid, public.notification_delivery_status, text
) to authenticated;

revoke all on function public.get_customer_appointment(text)
  from public;
grant execute on function public.get_customer_appointment(text)
  to anon, authenticated;

revoke all on function public.update_customer_appointment(text, text)
  from public;
grant execute on function public.update_customer_appointment(text, text)
  to anon, authenticated;
